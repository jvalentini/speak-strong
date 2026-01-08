import type { Match, StrictnessLevel } from '@speak-strong/core';

export type {
  Match,
  ProcessResult,
  Rule,
  RuleEntry,
  RulesDatabase,
  StrictnessLevel,
} from '@speak-strong/core';

export interface CliOptions {
  file?: string;
  message?: string;
  output?: string;
  moderate?: boolean;
  aggressive?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  debug?: boolean;
  interactive?: boolean;
  watch?: boolean;
  history?: boolean;
  historyLimit?: number;
  undo?: string | boolean;
  show?: string;
}

export type InteractiveAction = 'accept' | 'skip' | 'accept-all' | 'skip-all' | 'quit';

export interface InteractiveResult {
  accepted: Match[];
  skipped: Match[];
  quit: boolean;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  inputFile?: string;
  inputMessage?: string;
  outputFile?: string;
  original: string;
  transformed: string;
  level: StrictnessLevel;
  replacementCount: number;
  suggestionCount: number;
}

export interface HistoryDatabase {
  version: number;
  entries: HistoryEntry[];
}
