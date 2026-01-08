export type StrictnessLevel = 'conservative' | 'moderate' | 'aggressive';

export interface RuleEntry {
  pattern: string;
  replacement?: string;
  category: string;
  suggestion?: string;
  restructure?: boolean;
}

export interface Rule {
  pattern: string;
  replacement: string | null;
  level: StrictnessLevel;
  category: string;
  suggestion?: string;
  restructure?: boolean;
}

export interface RulesDatabase {
  version: string;
  conservative: RuleEntry[];
  moderate: RuleEntry[];
  aggressive: RuleEntry[];
}

export interface Match {
  original: string;
  replacement: string | null;
  start: number;
  end: number;
  rule: Rule;
}

export interface ProcessResult {
  original: string;
  transformed: string;
  replacements: Match[];
  suggestions: Match[];
}

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
