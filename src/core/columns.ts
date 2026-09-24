import type { Answer } from '../providers/jev-provider.js';

export interface Columns {
  columns: Record<string, string | number>;
  /** min of the gated (choice/score) confidences; 1 when only nouls are present. */
  confidence: number;
}

/**
 * Flatten Jev answers into output columns. Choice → its label, Score → its number,
 * Noul → its raw probability. Row confidence is the min over the gated answers, so a
 * row is only "confident" if every choice/score cleared the bar.
 */
export function answersToColumns(answers: Record<string, Answer>): Columns {
  const columns: Record<string, string | number> = {};
  let minConf = 1;
  let gated = false;
  for (const [name, a] of Object.entries(answers)) {
    if (a.type === 'choice') {
      columns[name] = a.choice;
      minConf = Math.min(minConf, a.confidence);
      gated = true;
    } else if (a.type === 'score') {
      columns[name] = a.score;
      minConf = Math.min(minConf, a.confidence);
      gated = true;
    } else {
      columns[name] = a.noul;
    }
  }
  return { columns, confidence: gated ? minConf : 1 };
}
