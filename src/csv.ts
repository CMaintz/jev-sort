/**
 * Minimal, dependency-free CSV. Handles quoted fields with embedded commas and
 * doubled quotes. Does NOT support embedded newlines in a field (one line = one
 * row) — a documented v1.0 limitation that keeps parsing streamable line-by-line.
 */

export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/** Turn a CSV cell value into a serialized field, quoting when needed. */
export function csvCell(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialize a header + a row object (over a fixed column order) to CSV lines. */
export function csvHeader(columns: string[]): string {
  return columns.map(csvCell).join(',');
}
export function toCsvLine(row: Record<string, unknown>, columns: string[]): string {
  return columns.map((c) => csvCell(row[c])).join(',');
}

/** Map a parsed CSV line to an object keyed by the header. */
export function rowFromCells(header: string[], cells: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  header.forEach((h, i) => {
    row[h] = cells[i] ?? '';
  });
  return row;
}
