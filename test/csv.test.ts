import { describe, expect, it } from 'vitest';
import { csvCell, csvHeader, rowFromCells, splitCsvLine, toCsvLine } from '../src/csv.js';

describe('splitCsvLine', () => {
  it('handles plain, quoted-comma, doubled-quote, and empty fields', () => {
    expect(splitCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
    expect(splitCsvLine('"a,b",c')).toEqual(['a,b', 'c']);
    expect(splitCsvLine('"she said ""hi""",x')).toEqual(['she said "hi"', 'x']);
    expect(splitCsvLine('a,,c')).toEqual(['a', '', 'c']);
  });
});

describe('serialization', () => {
  it('quotes cells only when needed', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""');
    expect(csvCell(0.9)).toBe('0.9');
    expect(csvCell(null)).toBe('');
  });

  it('builds header + line over a fixed column order', () => {
    expect(csvHeader(['a', 'b'])).toBe('a,b');
    expect(toCsvLine({ a: 1, b: 'x,y' }, ['a', 'b'])).toBe('1,"x,y"');
  });

  it('maps cells to an object by header, padding short rows', () => {
    expect(rowFromCells(['a', 'b'], ['1', '2'])).toEqual({ a: '1', b: '2' });
    expect(rowFromCells(['a', 'b'], ['1'])).toEqual({ a: '1', b: '' });
  });
});
