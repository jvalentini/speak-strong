import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Match, ProcessResult, Rule, RulesDatabase, StrictnessLevel } from '../types/index.js';
import { loadJson } from '../utils/file.js';
import { Logger } from '../utils/logger.js';
import { convertRuleEntry, processWithRules, type TokenRule } from './rule-engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(__dirname, '../data/rules.json');

let cachedDb: RulesDatabase | null = null;
let cachedTokenRules: Map<StrictnessLevel, TokenRule[]> | null = null;

function loadDatabase(): RulesDatabase {
  if (cachedDb) {
    return cachedDb;
  }
  cachedDb = loadJson<RulesDatabase>(RULES_PATH);
  Logger.debug(`Loaded rules database v${cachedDb.version}`);
  return cachedDb;
}

function buildTokenRules(): Map<StrictnessLevel, TokenRule[]> {
  if (cachedTokenRules) {
    return cachedTokenRules;
  }

  const db = loadDatabase();
  cachedTokenRules = new Map();

  cachedTokenRules.set(
    'conservative',
    db.conservative.map((entry) => convertRuleEntry(entry, 'conservative'))
  );
  cachedTokenRules.set(
    'moderate',
    db.moderate.map((entry) => convertRuleEntry(entry, 'moderate'))
  );
  cachedTokenRules.set(
    'aggressive',
    db.aggressive.map((entry) => convertRuleEntry(entry, 'aggressive'))
  );

  const total = db.conservative.length + db.moderate.length + db.aggressive.length;
  Logger.debug(`Converted ${total} rules to token format`);

  return cachedTokenRules;
}

function getApplicableTokenRules(level: StrictnessLevel): TokenRule[] {
  const rulesByLevel = buildTokenRules();
  const rules = [...(rulesByLevel.get('conservative') || [])];

  if (level === 'moderate' || level === 'aggressive') {
    rules.push(...(rulesByLevel.get('moderate') || []));
  }
  if (level === 'aggressive') {
    rules.push(...(rulesByLevel.get('aggressive') || []));
  }

  Logger.debug(`Applying ${rules.length} rules for level '${level}'`);
  return rules;
}

function tokenRuleToRule(tokenRule: TokenRule): Rule {
  return {
    pattern: tokenRule.pattern.map((p) => p.text).join(' '),
    replacement: tokenRule.replacement?.join(' ') ?? null,
    level: tokenRule.level,
    category: tokenRule.category,
    suggestion: tokenRule.suggestion,
  };
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
