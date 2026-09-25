#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline';
import { appendFileSync, readFileSync } from 'node:fs';
import { classify, evaluate, RateLimiter } from './index.js';
import { parseConfig, type SortConfig } from './config.js';
import { parseQuestions } from './core/questions.js';
import { parseEscalate } from './core/escalate.js';
import { csvHeader, rowFromCells, splitCsvLine, toCsvLine } from './csv.js';
import { TypeSafeProvider } from './providers/typesafe.js';
import { CloudflareProvider } from './providers/cloudflare.js';
import type { JevProvider, Question } from './providers/jev-provider.js';

type Row = Record<string, unknown>;

async function* readRows(stream: NodeJS.ReadableStream, format: 'jsonl' | 'csv'): AsyncGenerator<Row> {
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  if (format === 'csv') {
    let header: string[] | undefined;
    for await (const line of rl) {
      if (!line.trim() && !header) continue;
      const cells = splitCsvLine(line);
      if (!header) header = cells;
      else if (line.trim()) yield rowFromCells(header, cells);
    }
  } else {
    for await (const line of rl) {
      const trimmed = line.trim();
      if (trimmed) yield JSON.parse(trimmed) as Row;
    }
  }
}

function makeProvider(kind: string, model: string): JevProvider {
  const key = process.env.JEV_API_KEY;
  if (!key) throw new Error('set JEV_API_KEY in the environment');
  if (kind === 'cloudflare') {
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!account) throw new Error('set CLOUDFLARE_ACCOUNT_ID for --provider cloudflare');
    return new CloudflareProvider(account, key);
  }
  return new TypeSafeProvider(key, model);
}

function readJsonlFile(file: string): Row[] {
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Row);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      q: { type: 'string', multiple: true, short: 'q' },
      config: { type: 'string' },
      escalate: { type: 'string' },
      'review-out': { type: 'string' },
      format: { type: 'string' },
      provider: { type: 'string' },
      model: { type: 'string' },
      concurrency: { type: 'string' },
      rate: { type: 'string' },
      dedupe: { type: 'boolean', default: false },
      eval: { type: 'string' },
      'allow-review': { type: 'boolean', default: false },
    },
  });

  const cfg: Partial<SortConfig> = values.config ? parseConfig(readFileSync(values.config, 'utf8')) : {};
  const questions: Record<string, Question> = cfg.questions ?? parseQuestions(values.q ?? []);
  const provider = makeProvider(
    values.provider ?? cfg.provider ?? 'typesafe',
    values.model ?? cfg.model ?? 'jev-1.13.0',
  );

  // --eval: measure accuracy against a labeled sample, then stop.
  if (values.eval) {
    const report = await evaluate(readJsonlFile(values.eval), questions, provider);
    process.stderr.write(`eval: ${report.total} rows · overall ${(report.overall * 100).toFixed(1)}%\n`);
    for (const [k, s] of Object.entries(report.perQuestion)) {
      process.stderr.write(`  ${k}: ${(s.accuracy * 100).toFixed(1)}% (${s.correct}/${s.total})\n`);
    }
    return;
  }

  const format = (values.format ?? cfg.format ?? 'jsonl') as 'jsonl' | 'csv';
  const threshold = values.escalate ? parseEscalate(values.escalate) : (cfg.escalate_below ?? 0);
  const concurrency = values.concurrency ? Number(values.concurrency) : (cfg.concurrency ?? 8);
  const limiter = values.rate ? new RateLimiter(Number(values.rate)) : undefined;
  const reviewOut = values['review-out']; // review stream is always JSONL

  let rows = 0;
  let flagged = 0;
  let tokens = 0;
  let columns: string[] = [];
  const startedAt = Date.now();

  for await (const r of classify(readRows(process.stdin, format), questions, {
    provider,
    escalateBelow: threshold,
    concurrency,
    dedupe: values.dedupe,
    ...(limiter ? { limiter } : {}),
  })) {
    rows++;
    tokens += r.usage?.input_tokens ?? 0;
    const record = { ...r.row, ...r.columns, _confidence: Number(r.confidence.toFixed(4)) };

    if (r.escalated && reviewOut) {
      appendFileSync(reviewOut, JSON.stringify(record) + '\n');
      flagged++;
      continue;
    }
    if (format === 'csv') {
      if (columns.length === 0) {
        columns = Object.keys(record);
        process.stdout.write(csvHeader(columns) + '\n');
      }
      process.stdout.write(toCsvLine(record, columns) + '\n');
    } else {
      process.stdout.write(JSON.stringify(record) + '\n');
    }
  }

  const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
  const cost = ((tokens / 1_000_000) * 0.042).toFixed(4);
  process.stderr.write(
    `${rows} rows · $${cost} · ${secs}s · ${flagged} flagged${reviewOut ? ` -> ${reviewOut}` : ''}\n`,
  );
  if (flagged > 0 && !values['allow-review']) process.exitCode = 2;
}

main().catch((err: unknown) => {
  process.stderr.write(`jev-sort: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
