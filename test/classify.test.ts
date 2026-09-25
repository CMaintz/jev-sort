import { describe, expect, it } from 'vitest';
import { classify, RateLimiter } from '../src/index.js';
import { parseQuestions } from '../src/core/questions.js';
import type { Answer, ClassifiedRow } from '../src/index.js';
import type { JevProvider } from '../src/providers/jev-provider.js';

const provider = (answers: Record<string, Answer>): JevProvider => ({
  evaluate: async () => ({ model: 't', answers, usage: { input_tokens: 10, output_tokens: 2 } }),
});

describe('classify', () => {
  it('emits columns + confidence and flags low-confidence rows', async () => {
    const questions = parseQuestions(['team:choice(billing,tech)', 'urgent:noul']);
    const p = provider({
      team: { type: 'choice', choice: 'billing', confidence: 0.4, probabilities: {} },
      urgent: { type: 'noul', noul: 0.9 },
    });
    const out: ClassifiedRow[] = [];
    for await (const r of classify([{ id: 1 }, { id: 2 }], questions, { provider: p, escalateBelow: 0.6 })) {
      out.push(r);
    }
    expect(out).toHaveLength(2);
    expect(out[0]?.columns).toEqual({ team: 'billing', urgent: 0.9 });
    expect(out[0]?.confidence).toBe(0.4);
    expect(out[0]?.escalated).toBe(true);
    expect(out[0]?.usage?.input_tokens).toBe(10);
  });

  it('does not flag when confidence clears the bar (default no escalation)', async () => {
    const questions = parseQuestions(['team:choice(a,b)']);
    const p = provider({ team: { type: 'choice', choice: 'a', confidence: 0.99, probabilities: {} } });
    const out: ClassifiedRow[] = [];
    for await (const r of classify([{ id: 1 }], questions, { provider: p })) out.push(r);
    expect(out[0]?.escalated).toBe(false);
  });

  it('dedupe: identical rows call Jev once; the repeat is served fromCache', async () => {
    let calls = 0;
    const p: JevProvider = {
      evaluate: async () => {
        calls++;
        return {
          model: 't',
          answers: { team: { type: 'choice', choice: 'a', confidence: 0.9, probabilities: {} } },
          usage: { input_tokens: 5, output_tokens: 1 },
        };
      },
    };
    const questions = parseQuestions(['team:choice(a,b)']);
    const out: ClassifiedRow[] = [];
    // concurrency 1 so the first row caches before the identical second runs; limiter exercises that path.
    for await (const r of classify([{ text: 'same' }, { text: 'same' }], questions, {
      provider: p,
      concurrency: 1,
      dedupe: true,
      limiter: new RateLimiter(0),
    })) {
      out.push(r);
    }
    expect(calls).toBe(1);
    expect(out.filter((r) => r.fromCache).length).toBe(1);
  });
});
