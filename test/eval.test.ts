import { describe, expect, it } from 'vitest';
import { evaluate, matches } from '../src/eval.js';
import { parseQuestions } from '../src/core/questions.js';
import type { Answer, JevProvider } from '../src/providers/jev-provider.js';

describe('matches', () => {
  const q = parseQuestions(['team:choice(a,b)', 'urgent:noul', 'sev:score(lo,hi)']);
  it('choice exact, noul by threshold, score by nearest integer', () => {
    expect(matches('a', 'a', q.team!)).toBe(true);
    expect(matches('a', 'b', q.team!)).toBe(false);
    expect(matches(0.9, 'true', q.urgent!)).toBe(true);
    expect(matches(0.2, 'true', q.urgent!)).toBe(false);
    expect(matches(0.2, 'no', q.urgent!)).toBe(true);
    expect(matches(0.6, 1, q.sev!)).toBe(true);
    expect(matches(0.2, 1, q.sev!)).toBe(false);
  });
});

describe('evaluate', () => {
  it('strips truth keys from the state and scores per question', async () => {
    const questions = parseQuestions(['team:choice(a,b)']);
    let stateHadTruth = true;
    const provider: JevProvider = {
      evaluate: async (req) => {
        stateHadTruth = 'team' in (req.state as Record<string, unknown>);
        return {
          model: 't',
          answers: { team: { type: 'choice', choice: 'a', confidence: 0.9, probabilities: {} } satisfies Answer },
        };
      },
    };
    const report = await evaluate(
      [
        { text: 'x', team: 'a' },
        { text: 'y', team: 'b' },
      ],
      questions,
      provider,
    );
    expect(stateHadTruth).toBe(false);
    expect(report.perQuestion.team).toEqual({ correct: 1, total: 2, accuracy: 0.5 });
    expect(report.overall).toBe(0.5);
  });
});
