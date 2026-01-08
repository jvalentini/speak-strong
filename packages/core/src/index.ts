import rulesData from './data/rules.json';
import {
  convertRuleEntry,
  processWithRules,
  type TokenRule,
  tokenRuleToRule,
} from './rule-engine.js';
import type { Match, ProcessResult, RulesDatabase, StrictnessLevel } from './types.js';

export type { Token, TokenizerOptions, TokenType } from './tokenizer.js';
export { getWordTokens, tokenAtPosition, tokenize, tokenSlice, tokensToText } from './tokenizer.js';
export type {
  Match,
  ProcessResult,
  Rule,
  RuleEntry,
  RulesDatabase,
  StrictnessLevel,
} from './types.js';

const rules = rulesData as RulesDatabase;

let cachedTokenRules: Map<StrictnessLevel, TokenRule[]> | null = null;

function buildTokenRules(): Map<StrictnessLevel, TokenRule[]> {
  if (cachedTokenRules) {
    return cachedTokenRules;
  }

  cachedTokenRules = new Map();

  cachedTokenRules.set(
    'conservative',
    rules.conservative.map((entry) => convertRuleEntry(entry, 'conservative'))
  );
  cachedTokenRules.set(
    'moderate',
    rules.moderate.map((entry) => convertRuleEntry(entry, 'moderate'))
  );
  cachedTokenRules.set(
    'aggressive',
    rules.aggressive.map((entry) => convertRuleEntry(entry, 'aggressive'))
  );

  return cachedTokenRules;
}

function getApplicableTokenRules(level: StrictnessLevel): TokenRule[] {
  const rulesByLevel = buildTokenRules();
  const tokenRules = [...(rulesByLevel.get('conservative') || [])];

  if (level === 'moderate' || level === 'aggressive') {
    tokenRules.push(...(rulesByLevel.get('moderate') || []));
  }
  if (level === 'aggressive') {
    tokenRules.push(...(rulesByLevel.get('aggressive') || []));
  }

  return tokenRules;
}

function ruleMatchToMatch(ruleMatch: {
  rule: TokenRule;
  textStart: number;
  textEnd: number;
  matchedTokens: { text: string }[];
  replacementText: string | null;
}): Match {
  const originalText = ruleMatch.matchedTokens.map((t) => t.text).join('');

  return {
    original: originalText,
    replacement: ruleMatch.replacementText,
    start: ruleMatch.textStart,
    end: ruleMatch.textEnd,
    rule: tokenRuleToRule(ruleMatch.rule),
  };
}

export function processText(text: string, level: StrictnessLevel): ProcessResult {
  const tokenRules = getApplicableTokenRules(level);
  const result = processWithRules(text, tokenRules);

  const replacements = result.matches.map(ruleMatchToMatch);
  const suggestions = result.suggestions.map(ruleMatchToMatch);

  return {
    original: text,
    transformed: result.transformed,
    replacements,
    suggestions,
  };
}

export function getStrictnessLevel(options: {
  moderate?: boolean;
  aggressive?: boolean;
}): StrictnessLevel {
  if (options.aggressive) return 'aggressive';
  if (options.moderate) return 'moderate';
  return 'conservative';
}

export function getRulesVersion(): string {
  return rules.version;
}

export function getRuleCount(level?: StrictnessLevel): number {
  if (level) {
    return getApplicableTokenRules(level).length;
  }
  return rules.conservative.length + rules.moderate.length + rules.aggressive.length;
}
