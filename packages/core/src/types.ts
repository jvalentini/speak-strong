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
