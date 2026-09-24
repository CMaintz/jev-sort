/** Parse an escalation expression like `conf<0.6` into its threshold. */
export function parseEscalate(expr: string): number {
  const m = /^conf\s*<\s*([0-9]*\.?[0-9]+)$/.exec(expr.trim());
  if (!m?.[1]) throw new Error(`bad --escalate "${expr}": expected conf<NUMBER`);
  return Number(m[1]);
}
