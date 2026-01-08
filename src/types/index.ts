export type StrictnessLevel = 'conservative' | 'moderate' | 'aggressive';

export interface Rule {
  pattern: string;
  replacement: string | null;
  level: StrictnessLevel;
  category: string;
  suggestion?: string;
}

export interface RulesDatabase {
  version: string;
  rules: Rule[];
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
}

export type InteractiveAction = 'accept' | 'skip' | 'accept-all' | 'skip-all' | 'quit';

export interface InteractiveResult {
  accepted: Match[];
  skipped: Match[];
  quit: boolean;
}
