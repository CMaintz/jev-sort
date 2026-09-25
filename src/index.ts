import { mapPool } from './map.js';
import { answersToColumns } from './core/columns.js';
import { RateLimiter } from './rate-limit.js';
import type { JevProvider, Question } from './providers/jev-provider.js';

export { choice, noul, score, parseQuestion, parseQuestions } from './core/questions.js';
export { parseEscalate } from './core/escalate.js';
export { answersToColumns } from './core/columns.js';
export type { Columns } from './core/columns.js';
export { mapPool } from './map.js';
export { RateLimiter } from './rate-limit.js';
export { parseConfig } from './config.js';
export type { SortConfig } from './config.js';
export { evaluate, matches } from './eval.js';
export type { EvalReport } from './eval.js';
export { TypeSafeProvider } from './providers/typesafe.js';
export { CloudflareProvider } from './providers/cloudflare.js';
export type { JevProvider, Answer, Question } from './providers/jev-provider.js';

export interface ClassifyOptions {
  provider: JevProvider;
  /** rows whose confidence is below this are marked `escalated`. Default 0 (never). */
  escalateBelow?: number;
  /** in-flight Jev calls. Default 8. */
  concurrency?: number;
  /** skip re-calling Jev for rows with an identical state (token savings on repetitive corpora). */
  dedupe?: boolean;
  /** pace requests under Jev's req/min ceiling. */
  limiter?: RateLimiter;
}

export interface ClassifiedRow {
  row: Record<string, unknown>;
  columns: Record<string, string | number>;
  confidence: number;
  escalated: boolean;
  fromCache?: boolean;
  usage?: { input_tokens: number; output_tokens: number };
}

type Cached = {
  columns: Record<string, string | number>;
  confidence: number;
  usage?: { input_tokens: number; output_tokens: number };
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

/**
 * Stream rows through Jev, one batched call each, yielding typed columns + a row
 * confidence. Bounded concurrency keeps memory flat over huge inputs; `dedupe`
 * caches identical states and `limiter` paces requests.
 */
export async function* classify(
  rows: Iterable<Record<string, unknown>> | AsyncIterable<Record<string, unknown>>,
  questions: Record<string, Question>,
  opts: ClassifyOptions,
): AsyncGenerator<ClassifiedRow> {
  const threshold = opts.escalateBelow ?? 0;
  const concurrency = opts.concurrency ?? 8;
  const cache = opts.dedupe ? new Map<string, Cached>() : undefined;

  yield* mapPool(rows, concurrency, async (row): Promise<ClassifiedRow> => {
    const key = cache ? stableStringify(row) : undefined;
    if (cache && key !== undefined) {
      const hit = cache.get(key);
      if (hit) {
        return {
          row,
          columns: hit.columns,
          confidence: hit.confidence,
          escalated: hit.confidence < threshold,
          fromCache: true,
          ...(hit.usage ? { usage: hit.usage } : {}),
        };
      }
    }
    await opts.limiter?.acquire();
    const { answers, usage } = await opts.provider.evaluate({ state: row, questions });
    const { columns, confidence } = answersToColumns(answers);
    if (cache && key !== undefined) cache.set(key, { columns, confidence, ...(usage ? { usage } : {}) });
    return { row, columns, confidence, escalated: confidence < threshold, ...(usage ? { usage } : {}) };
  });
}
