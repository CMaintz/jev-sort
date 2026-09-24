# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **v0.1 (MVP):** `jev-sort` CLI — JSONL on stdin → typed columns + a `_confidence` field via one batched Jev call per row.
- Inline questions: `-q 'name:choice(a,b,c)'` / `-q 'name:noul'` / `-q 'name:score(low,mid,high)'`.
- `--escalate 'conf<0.6'` splits confident rows (stdout) from uncertain ones (`--review-out`); pipeline-safe non-zero exit when rows are flagged (`--allow-review` opts out).
- Pure, tested core: `parseQuestions`, `answersToColumns` (row confidence = min of gated choice/score), `parseEscalate`.
- Bounded-concurrency streaming mapper (`mapPool`) and the `classify()` library API + `choice`/`noul`/`score` helpers.
- Shared `JevProvider` port (TypeSafe + Cloudflare); onboarded onto the Foundry gate.

### Verified

- `mise run gate` (lint → typecheck → test → audit) green; 12 unit tests, 98.9% line coverage.

### Roadmap (see the spec)

- CSV input + YAML config; a rate-limit-aware scheduler (token bucket + 429 backoff).
- `--resume` checkpointing; glob/RSS sources; `--eval` accuracy harness; row dedupe + cost preflight.
- Exercise end-to-end against a live Jev key.
