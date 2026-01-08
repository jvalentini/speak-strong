import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Match, ProcessResult, Rule, RulesDatabase, StrictnessLevel } from '../types/index.js';
import { loadJson } from '../utils/file.js';
import { Logger } from '../utils/logger.js';
import { convertLegacyRule, processWithRules, type TokenRule } from './rule-engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(__dirname, '../data/rules.json');

let cachedRules: Rule[] | null = null;
let cachedTokenRules: TokenRule[] | null = null;

function loadRules(): Rule[] {
  if (cachedRules) {
    return cachedRules;
  }
  const db = loadJson<RulesDatabase>(RULES_PATH);
  cachedRules = db.rules;
  Logger.debug(`Loaded ${cachedRules.length} rules from database`);
  return cachedRules;
}

function loadTokenRules(): TokenRule[] {
  if (cachedTokenRules) {
    return cachedTokenRules;
  }
  const legacyRules = loadRules();
  cachedTokenRules = legacyRules.map(convertLegacyRule);
  Logger.debug(`Converted ${cachedTokenRules.length} rules to token format`);
  return cachedTokenRules;
}

function getApplicableRules(level: StrictnessLevel): Rule[] {
  const rules = loadRules();
  const levels: StrictnessLevel[] = ['conservative'];

  if (level === 'moderate' || level === 'aggressive') {
    levels.push('moderate');
  }
  if (level === 'aggressive') {
    levels.push('aggressive');
  }

  const applicable = rules.filter((r) => levels.includes(r.level));
  Logger.debug(`Filtering rules for level '${level}': ${applicable.length} applicable`);
  return applicable;
}

function getApplicableTokenRules(level: StrictnessLevel): TokenRule[] {
  const rules = loadTokenRules();
  const levels: StrictnessLevel[] = ['conservative'];

  if (level === 'moderate' || level === 'aggressive') {
    levels.push('moderate');
  }
  if (level === 'aggressive') {
    levels.push('aggressive');
  }

  return rules.filter((r) => levels.includes(r.level));
}

function ruleMatchToMatch(
  ruleMatch: {
    rule: TokenRule;
    textStart: number;
    textEnd: number;
    matchedTokens: { text: string }[];
    replacementText: string | null;
  },
  legacyRules: Rule[]
): Match {
  const originalText = ruleMatch.matchedTokens.map((t) => t.text).join('');
  const legacyRule = legacyRules.find(
    (r) =>
      r.pattern.toLowerCase().replace(/\s+/g, '') ===
      ruleMatch.rule.pattern.map((p) => p.text).join('')
  );

  const fallbackRule: Rule = {
    pattern: ruleMatch.rule.pattern.map((p) => p.text).join(' '),
    replacement: ruleMatch.rule.replacement?.join(' ') ?? null,
    level: ruleMatch.rule.level,
    category: ruleMatch.rule.category,
    suggestion: ruleMatch.rule.suggestion,
  };

  return {
    original: originalText,
    replacement: ruleMatch.replacementText,
    start: ruleMatch.textStart,
    end: ruleMatch.textEnd,
    rule: legacyRule || fallbackRule,
  };
}

export function processText(text: string, level: StrictnessLevel): ProcessResult {
  const tokenRules = getApplicableTokenRules(level);
  const legacyRules = getApplicableRules(level);

  const result = processWithRules(text, tokenRules);

  const replacements = result.matches.map((m) => ruleMatchToMatch(m, legacyRules));
  const suggestions = result.suggestions.map((m) => ruleMatchToMatch(m, legacyRules));

  Logger.verbose(
    `Processed text: ${replacements.length} replacements, ${suggestions.length} suggestions`
  );

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
