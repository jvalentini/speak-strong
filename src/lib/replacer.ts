import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Match, ProcessResult, Rule, StrictnessLevel } from '../types/index.js';
import { getConfig } from '../utils/config.js';
import { loadJson } from '../utils/file.js';
import { Logger } from '../utils/logger.js';
import {
  formatValidationErrors,
  type RulesDatabase,
  validateRulesDatabase,
} from '../utils/schemas.js';
import { convertRuleEntry, processWithRules, type TokenRule } from './rule-engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(__dirname, '../data/rules.json');

let cachedDb: RulesDatabase | null = null;
let cachedTokenRules: Map<StrictnessLevel, TokenRule[]> | null = null;

/**
 * Load and validate the rules database
 * @throws {Error} If validation fails
 */
function loadDatabase(): RulesDatabase {
  const config = getConfig();

  if (cachedDb && config.rules.cacheEnabled) {
    return cachedDb;
  }

  const rawData = loadJson<unknown>(RULES_PATH);

  try {
    const validatedDb = validateRulesDatabase(rawData);
    cachedDb = validatedDb;
    Logger.debug(`Loaded and validated rules database v${validatedDb.version}`);
    return validatedDb;
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as import('zod').ZodError;
      const message = formatValidationErrors(zodError);
      throw new Error(`Invalid rules.json:\n${message}`);
    }
    throw error;
  }
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
