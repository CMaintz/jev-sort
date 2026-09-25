# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-09-25

First stable release — "jq for judgment": stream rows through Jev and get typed columns + confidence, at scale.

### Added

- **CLI + library:** JSONL rows on stdin → typed columns + a `_confidence` field, one batched Jev call each.
- **Questions** inline (`-q 'name:choice/noul/score'`) **or** via a richer **YAML `--config`** (full instructions + criteria).
- **CSV + JSONL** for input and stdout (`--format`); `--escalate 'conf<0.6'` splits uncertain rows to a review file, pipeline-safe non-zero exit (`--allow-review` opts out).
- **`--eval labeled.jsonl`** — per-question agreement against a hand-labeled sample (truth stripped from the state); the honest antidote to ~68% accuracy.
- **`--dedupe`** (skip identical states) and a **`--rate` limiter** (token bucket) for large jobs.
- Pure tested core (`parseQuestions`, `answersToColumns`, `parseEscalate`, `matches`), a bounded-concurrency streaming mapper (`mapPool`), and the `classify()` library API.
- Shared `JevProvider` port (TypeSafe + Cloudflare); onboarded onto the Foundry gate.

### Verified

- `mise run gate` (lint → typecheck → test → audit) green; **23 unit tests**, 98% line / 92% branch coverage.

### Deferred to v1.x (see the spec)

- `--resume` checkpointing; glob/RSS sources; sampling + cost preflight; a live-key end-to-end run.
