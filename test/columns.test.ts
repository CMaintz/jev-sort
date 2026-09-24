import { describe, expect, it } from 'vitest';
import { answersToColumns } from '../src/core/columns.js';
import type { Answer } from '../src/providers/jev-provider.js';

describe('answersToColumns', () => {
  it('flattens answers and takes the min gated confidence', () => {
    const answers: Record<string, Answer> = {
      team: { type: 'choice', choice: 'billing', confidence: 0.9, probabilities: {} },
      sent: { type: 'score', score: 0.1, confidence: 0.7, probabilities: {} },
      urgent: { type: 'noul', noul: 0.95 },
    };
    const r = answersToColumns(answers);
    expect(r.columns).toEqual({ team: 'billing', sent: 0.1, urgent: 0.95 });
    expect(r.confidence).toBe(0.7);
  });

  it('confidence is 1 when only nouls are present', () => {
    expect(answersToColumns({ a: { type: 'noul', noul: 0.3 } }).confidence).toBe(1);
  });
});
