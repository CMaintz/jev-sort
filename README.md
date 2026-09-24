# jev-sort

**jq for judgment** — stream rows through [TypeSafe AI's Jev](https://typesafe.ai/) and get **typed classification/score columns + a confidence field**, at pennies per 10k rows.

```bash
cat tickets.jsonl | jev-sort \
  -q 'team:choice(billing,tech,sales)' -q 'urgent:noul' \
  --escalate 'conf<0.6' --review-out review.jsonl > out.jsonl

{"id":1,"team":"billing","urgent":0.95,"_confidence":0.87}
...
10000 rows · $0.11 · 3m12s · 612 flagged -> review.jsonl
```

## When to use it (honestly)

jev-sort earns its place at **scale** — 10k–1M rows, where running an LLM per row is the whole problem. At ~$0.00001/row and ~100 ms, "classify 10k rows for pennies" becomes true and the job finishes in minutes. **Below a few thousand rows, a one-off LLM script or plain code is simpler — use those.** And if the rule is crisp (a regex or keyword match), use plain code: jev-sort is for judgments too fuzzy to regex but bounded enough not to need prose.

## CLI

- Questions inline: `-q 'name:choice(a,b,c)'` · `-q 'name:noul'` · `-q 'name:score(low,mid,high)'`
- `--escalate 'conf<0.6'` splits confident rows (stdout) from uncertain ones (`--review-out FILE`); a row is confident only if **every** choice/score answer clears the bar. Exits non-zero if any rows were flagged (opt out with `--allow-review`) so it's pipeline/CI-safe.
- `--concurrency N` (default 8) · `--provider typesafe|cloudflare` · `--model jev-1.13.0`
- Input is JSONL on stdin; each row becomes the Jev `state`. Set `JEV_API_KEY` in the environment.

## Library

```ts
import { classify, choice, noul, score, TypeSafeProvider } from 'jev-sort';

const provider = new TypeSafeProvider(process.env.JEV_API_KEY!);
for await (const r of classify(
  rows,
  { team: choice({ billing: '…', tech: '…' }), urgent: noul('conveys urgency') },
  {
    provider,
    escalateBelow: 0.6,
  },
)) {
  // r.columns, r.confidence, r.escalated
}
```

## Honest limitations

- **Value is scale-gated** (see above) — this is the most conditional of the [jev-tools](https://github.com/CMaintz?tab=repositories).
- **~68% accuracy** → treat output as _pre-labels_: spot-check, and route low-confidence to humans.
- **Text-only**; each row must fit Jev's context (~32k). Long documents need a summarize-first step (an LLM job, not Jev's).
- **No rationale** → poor fit where you need an audit trail of _why_ a row got its label.
- **Can't count / do date-number arithmetic** → aggregation and math stay in downstream code.
- **Needs a Jev key** — `JEV_API_KEY` (sign up at [TypeSafe](https://typesafe.ai/); Cloudflare Workers AI also works).

## Status

**v0.1 (MVP)** — JSONL/stdin in, inline `choice`/`noul`/`score`, `_confidence` column, `--escalate` split, cost summary; bounded-concurrency streaming (`classify`) and the shared `JevProvider` port. 12 tests, passes the [Foundry](https://github.com/CMaintz/foundry) gate. Roadmap (see the [spec](../SPECS/jev-sort-cli.md)): CSV + YAML config, a rate-limit-aware scheduler, `--resume`, and an `--eval` accuracy harness.

MIT © Christoffer Maintz
