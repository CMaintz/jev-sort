import { load } from 'js-yaml';
import { choice, noul, score } from './core/questions.js';
import type { Question } from './providers/jev-provider.js';

type ChoiceCfg = { kind: 'choice'; instructions?: string; options: Record<string, string> };
type ScoreCfg = { kind: 'score'; instructions?: string; levels: string[] };
type NoulCfg = { kind: 'noul'; instructions: string };
type QuestionCfg = ChoiceCfg | ScoreCfg | NoulCfg;

export interface SortConfig {
  provider: 'typesafe' | 'cloudflare';
  model: string;
  escalate_below: number;
  concurrency: number;
  format: 'jsonl' | 'csv';
  questions: Record<string, Question>;
}

interface RawConfig {
  provider?: 'typesafe' | 'cloudflare';
  model?: string;
  escalate_below?: number;
  concurrency?: number;
  format?: 'jsonl' | 'csv';
  questions?: Record<string, QuestionCfg>;
}

/**
 * YAML config for real work — richer than inline `-q` flags: each question can carry
 * full `instructions` + `criteria`, which is what steers Jev well.
 */
export function parseConfig(raw: string): SortConfig {
  const doc = (load(raw) ?? {}) as RawConfig;
  const rawQuestions = doc.questions ?? {};
  if (Object.keys(rawQuestions).length === 0) {
    throw new Error('jev-sort config needs at least one question');
  }

  const questions: Record<string, Question> = {};
  for (const [name, q] of Object.entries(rawQuestions)) {
    if (q.kind === 'choice') questions[name] = choice(q.options, q.instructions ?? name);
    else if (q.kind === 'score') questions[name] = score(q.levels, q.instructions ?? name);
    else questions[name] = noul(q.instructions);
  }

  return {
    provider: doc.provider ?? 'typesafe',
    model: doc.model ?? 'jev-latest',
    escalate_below: doc.escalate_below ?? 0,
    concurrency: doc.concurrency ?? 8,
    format: doc.format ?? 'jsonl',
    questions,
  };
}
