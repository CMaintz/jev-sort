import { describe, expect, it } from 'vitest';
import { parseEscalate } from '../src/core/escalate.js';

describe('parseEscalate', () => {
  it('parses conf<N', () => {
    expect(parseEscalate('conf<0.6')).toBe(0.6);
    expect(parseEscalate(' conf < .5 ')).toBe(0.5);
  });

  it('rejects garbage', () => {
    expect(() => parseEscalate('nope')).toThrow(/conf<NUMBER/);
    expect(() => parseEscalate('conf>0.6')).toThrow();
  });
});
