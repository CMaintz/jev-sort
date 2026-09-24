import { mapPool } from './map.js';
import { answersToColumns } from './core/columns.js';
import type { JevProvider, Question } from './providers/jev-provider.js';

export { choice, noul, score, parseQuestion, parseQuestions } from './core/questions.js';
export { parseEscalate } from './core/escalate.js';
export { answersToColumns } from './core/columns.js';
export type { Columns } from './core/columns.js';
export { mapPool } from './map.js';
export { TypeSafeProvider } from './providers/typesafe.js';
export { CloudflareProvider } from './providers/cloudflare.js';
export type { JevProvider, Answer, Question } from './providers/jev-provider.js';

export interface ClassifyOptions {
  provider: JevProvider;
  /** rows whose confidence is below this are marked `escalated`. Default 0 (never). */
  escalateBelow?: number;
  /** in-flight Jev calls. Default 8. */
  concurrency?: number;
}

export interface ClassifiedRow {
  row: Record<string, unknown>;
  columns: Record<string, string | number>;
  confidence: number;
  escalated: boolean;
  usage?: { input_tokens: number; output_tokens: number };
}

/**
 * Stream rows through Jev, one batched call each, yielding typed columns + a row
 * confidence. Bounded concurrency keeps memory flat over huge inputs.
 */
export async function* classify(
  rows: Iterable<Record<string, unknown>> | AsyncIterable<Record<string, unknown>>,
  questions: Record<string, Question>,
  opts: ClassifyOptions,
): AsyncGenerator<ClassifiedRow> {
  const threshold = opts.escalateBelow ?? 0;
  const concurrency = opts.concurrency ?? 8;
  yield* mapPool(rows, concurrency, async (row): Promise<ClassifiedRow> => {
    const { answers, usage } = await opts.provider.evaluate({ state: row, questions });
    const { columns, confidence } = answersToColumns(answers);
    return { row, columns, confidence, escalated: confidence < threshold, ...(usage ? { usage } : {}) };
  });
}
