import { answersToColumns } from './core/columns.js';
import type { JevProvider, Question } from './providers/jev-provider.js';

export interface EvalReport {
  total: number;
  perQuestion: Record<string, { correct: number; total: number; accuracy: number }>;
  overall: number;
}

/**
 * Does a prediction match the labeled truth? Fuzzy but documented:
 * choice → exact string; noul → (p ≥ 0.5) vs truthiness; score → nearest integer.
 */
export function matches(predicted: string | number, truth: unknown, q: Question): boolean {
  if (q.type === 'noul') {
    const predictedYes = Number(predicted) >= 0.5;
    const t = String(truth).toLowerCase();
    return predictedYes === (t === 'true' || t === 'yes' || t === '1');
  }
  if (q.type === 'score') return Math.round(Number(predicted)) === Math.round(Number(truth));
  return String(predicted) === String(truth);
}

/**
 * Run Jev against a hand-labeled sample and report agreement per question. The truth
 * columns (the question names) are stripped from the state, so they aren't leaked to
 * Jev — the honest antidote to ~68% accuracy: measure before committing to a big run.
 */
export async function evaluate(
  labeled: Record<string, unknown>[],
  questions: Record<string, Question>,
  provider: JevProvider,
): Promise<EvalReport> {
  const keys = Object.keys(questions);
  const per: Record<string, { correct: number; total: number; accuracy: number }> = {};
  for (const k of keys) per[k] = { correct: 0, total: 0, accuracy: 0 };

  for (const row of labeled) {
    const state: Record<string, unknown> = { ...row };
    for (const k of keys) delete state[k];
    const { answers } = await provider.evaluate({ state, questions });
    const { columns } = answersToColumns(answers);
    for (const k of keys) {
      if (row[k] === undefined) continue;
      const stat = per[k]!;
      const q = questions[k]!;
      stat.total++;
      const col = columns[k];
      if (col !== undefined && matches(col, row[k], q)) stat.correct++;
    }
  }

  let correct = 0;
  let total = 0;
  for (const k of keys) {
    const s = per[k]!;
    s.accuracy = s.total > 0 ? s.correct / s.total : 0;
    correct += s.correct;
    total += s.total;
  }
  return { total: labeled.length, perQuestion: per, overall: total > 0 ? correct / total : 0 };
}
