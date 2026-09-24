import { describe, expect, it } from 'vitest';
import { choice, noul, parseQuestion, parseQuestions, score } from '../src/core/questions.js';

describe('parseQuestion', () => {
  it('parses choice / noul / score', () => {
    expect(parseQuestion('team:choice(billing,tech,sales)')).toEqual([
      'team',
      { type: 'choice', instructions: 'team', criteria: { billing: 'billing', tech: 'tech', sales: 'sales' } },
    ]);
    expect(parseQuestion('urgent:noul')).toEqual(['urgent', { type: 'noul', instructions: 'urgent' }]);
    expect(parseQuestion('sent:score(neg,neu,pos)')).toEqual([
      'sent',
      { type: 'score', instructions: 'sent', criteria: ['neg', 'neu', 'pos'] },
    ]);
  });

  it('rejects bad specs', () => {
    expect(() => parseQuestion('noname')).toThrow(/name:type/);
    expect(() => parseQuestion('x:choice(one)')).toThrow(/>= 2/);
    expect(() => parseQuestion('x:score(one)')).toThrow(/>= 2/);
    expect(() => parseQuestion('x:frobnicate')).toThrow(/unknown/);
  });
});

describe('parseQuestions', () => {
  it('builds a map and rejects empty', () => {
    expect(Object.keys(parseQuestions(['a:noul', 'b:choice(x,y)']))).toEqual(['a', 'b']);
    expect(() => parseQuestions([])).toThrow(/no questions/);
  });
});

describe('helpers', () => {
  it('build the question shapes', () => {
    expect(choice({ a: 'A' }, 'pick')).toEqual({ type: 'choice', instructions: 'pick', criteria: { a: 'A' } });
    expect(noul('is x?')).toEqual({ type: 'noul', instructions: 'is x?' });
    expect(score(['lo', 'hi'])).toEqual({ type: 'score', instructions: '', criteria: ['lo', 'hi'] });
  });
});
