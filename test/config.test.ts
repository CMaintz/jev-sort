import { describe, expect, it } from 'vitest';
import { parseConfig } from '../src/config.js';

describe('parseConfig', () => {
  it('maps question kinds and applies defaults', () => {
    const c = parseConfig(`
questions:
  team:
    kind: choice
    instructions: which team
    options: { billing: pay, tech: bugs }
  sev:
    kind: score
    levels: [low, high]
  spam:
    kind: noul
    instructions: is spam?
`);
    expect(c.provider).toBe('typesafe');
    expect(c.model).toBe('jev-latest');
    expect(c.concurrency).toBe(8);
    expect(c.questions.team).toEqual({
      type: 'choice',
      instructions: 'which team',
      criteria: { billing: 'pay', tech: 'bugs' },
    });
    expect(c.questions.sev).toMatchObject({ type: 'score', criteria: ['low', 'high'] });
    expect(c.questions.spam).toEqual({ type: 'noul', instructions: 'is spam?' });
  });

  it('honors overrides and rejects an empty question set', () => {
    const c = parseConfig(
      'provider: cloudflare\nescalate_below: 0.7\nformat: csv\nquestions:\n  x: { kind: noul, instructions: y }\n',
    );
    expect(c.provider).toBe('cloudflare');
    expect(c.escalate_below).toBe(0.7);
    expect(c.format).toBe('csv');
    expect(() => parseConfig('provider: typesafe')).toThrow(/at least one question/);
  });
});
