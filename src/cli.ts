#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline';
import { appendFileSync } from 'node:fs';
import { classify } from './index.js';
import { parseQuestions } from './core/questions.js';
import { parseEscalate } from './core/escalate.js';
import { TypeSafeProvider } from './providers/typesafe.js';
import { CloudflareProvider } from './providers/cloudflare.js';
import type { JevProvider } from './providers/jev-provider.js';

async function* readJsonl(stream: NodeJS.ReadableStream): AsyncGenerator<Record<string, unknown>> {
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) yield JSON.parse(trimmed) as Record<string, unknown>;
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

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      q: { type: 'string', multiple: true, short: 'q' },
      escalate: { type: 'string' },
      'review-out': { type: 'string' },
      provider: { type: 'string', default: 'typesafe' },
      model: { type: 'string', default: 'jev-1.13.0' },
      concurrency: { type: 'string', default: '8' },
      'allow-review': { type: 'boolean', default: false },
    },
  });

  const questions = parseQuestions(values.q ?? []);
  const threshold = values.escalate ? parseEscalate(values.escalate) : 0;
  const provider = makeProvider(values.provider ?? 'typesafe', values.model ?? 'jev-1.13.0');
  const reviewOut = values['review-out'];

  let rows = 0;
  let flagged = 0;
  let tokens = 0;
  const startedAt = Date.now();

  for await (const r of classify(readJsonl(process.stdin), questions, {
    provider,
    escalateBelow: threshold,
    concurrency: Number(values.concurrency),
  })) {
    rows++;
    tokens += r.usage?.input_tokens ?? 0;
    const line = JSON.stringify({ ...r.row, ...r.columns, _confidence: Number(r.confidence.toFixed(4)) });
    if (r.escalated && reviewOut) {
      appendFileSync(reviewOut, line + '\n');
      flagged++;
    } else {
      process.stdout.write(line + '\n');
    }
  }

  const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
  const cost = ((tokens / 1_000_000) * 0.042).toFixed(4);
  const to = reviewOut ? ` -> ${reviewOut}` : '';
  process.stderr.write(`${rows} rows · $${cost} · ${secs}s · ${flagged} flagged${to}\n`);
  if (flagged > 0 && !values['allow-review']) process.exitCode = 2;
}

main().catch((err: unknown) => {
  process.stderr.write(`jev-sort: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
