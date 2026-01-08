import { getWordTokens, type Token, tokenize } from './tokenizer.js';
import type { Rule, StrictnessLevel } from './types.js';

export interface TokenPattern {
  /** Normalized token text to match (lowercase) */
  text: string;
  /** If true, this token is optional in the pattern */
  optional?: boolean;
}

export interface TokenRule {
  id: string;
  /** Sequence of tokens to match */
  pattern: TokenPattern[];
  /** Replacement tokens (null = suggestion only, empty array = delete) */
  replacement: string[] | null;
  level: StrictnessLevel;
  category: string;
  suggestion?: string;
  /** Optional constraint function for context-aware matching */
  constraint?: (context: MatchContext) => boolean;
  /** If true, this rule requires sentence restructuring */
  restructure?: RestructureConfig;
}

export interface RestructureConfig {
  /** Template for restructured output, uses $1, $2, etc. for captured groups */
  template: string;
  /** Capture groups from the surrounding context */
  captures?: CaptureConfig[];
}

export interface CaptureConfig {
  /** Name of the capture (used in template as $name) */
  name: string;
  /** How many word tokens after the pattern to capture */
  afterTokens?: number;
  /** Stop capturing at these tokens */
  stopAt?: string[];
}

export interface MatchContext {
  /** Tokens before the match */
  before: Token[];
  /** The matched tokens */
  matched: Token[];
  /** Tokens after the match */
  after: Token[];
  /** All tokens in the text */
  allTokens: Token[];
  /** The full original text */
  originalText: string;
}

export interface RuleMatch {
  rule: TokenRule;
  /** Start index in token array */
  tokenStart: number;
  /** End index in token array (exclusive) */
  tokenEnd: number;
  /** Start position in original text */
  textStart: number;
  /** End position in original text */
  textEnd: number;
  /** The matched tokens */
  matchedTokens: Token[];
  /** Computed replacement text (with case preservation) */
  replacementText: string | null;
  /** Context for constraint evaluation */
  context: MatchContext;
}

export interface RuleEngineResult {
  original: string;
  transformed: string;
  matches: RuleMatch[];
  suggestions: RuleMatch[];
}

function normalizePatternText(text: string): TokenPattern[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const cleaned = word.replace(/[.,!?;:]/g, '');
      return { text: cleaned };
    })
    .filter((t) => t.text.length > 0);
}

const RESTRUCTURE_CAPTURES: Record<string, CaptureConfig[]> = {
  'would you mind if': [{ name: 'subject' }],
};

export function convertRuleEntry(
  entry: {
    pattern: string;
    replacement?: string;
    category: string;
    suggestion?: string;
    restructure?: boolean;
  },
  level: StrictnessLevel
): TokenRule {
  const pattern = normalizePatternText(entry.pattern);
  const patternKey = entry.pattern.toLowerCase();

  let replacement: string[] | null;
  if (entry.suggestion && entry.replacement === undefined) {
    replacement = null;
  } else if (entry.replacement === undefined || entry.replacement === '') {
    replacement = [];
  } else {
    replacement = entry.replacement.split(/\s+/).filter(Boolean);
  }

  const captures = RESTRUCTURE_CAPTURES[patternKey];
  const restructure = entry.restructure && captures ? { template: '', captures } : undefined;

  return {
    id: `${level}-${patternKey.replace(/\s+/g, '-')}`,
    pattern,
    replacement,
    level,
    category: entry.category,
    suggestion: entry.suggestion,
    restructure,
  };
}

export function convertLegacyRule(legacy: {
  pattern: string;
  replacement: string | null;
  level: StrictnessLevel;
  category: string;
  suggestion?: string;
}): TokenRule {
  return convertRuleEntry(
    {
      pattern: legacy.pattern,
      replacement: legacy.replacement ?? undefined,
      category: legacy.category,
      suggestion: legacy.suggestion,
    },
    legacy.level
  );
}

function matchesPattern(
  wordTokens: Token[],
  startIndex: number,
  pattern: TokenPattern[]
): { matched: boolean; endIndex: number } {
  let tokenIdx = startIndex;
  let patternIdx = 0;

  while (patternIdx < pattern.length) {
    const patternToken = pattern[patternIdx];

    if (tokenIdx >= wordTokens.length) {
      if (patternToken.optional) {
        patternIdx++;
        continue;
      }
      return { matched: false, endIndex: tokenIdx };
    }

    const currentToken = wordTokens[tokenIdx];

    if (currentToken.normalized === patternToken.text) {
      tokenIdx++;
      patternIdx++;
    } else if (patternToken.optional) {
      patternIdx++;
    } else {
      return { matched: false, endIndex: tokenIdx };
    }
  }

  return { matched: true, endIndex: tokenIdx };
}

function preserveCase(original: string, replacement: string): string {
  if (!replacement) return replacement;

  const originalWords = original.split(/\s+/).filter(Boolean);
  const firstWord = originalWords[0] || original;

  const hasMultipleChars = firstWord.length > 1;
  const isAllUpper =
    hasMultipleChars &&
    firstWord === firstWord.toUpperCase() &&
    firstWord !== firstWord.toLowerCase();
  const isAllLower = firstWord === firstWord.toLowerCase() && firstWord !== firstWord.toUpperCase();
  const isCapitalized =
    firstWord[0] === firstWord[0].toUpperCase() &&
    (firstWord.length === 1 || firstWord.slice(1) === firstWord.slice(1).toLowerCase());

  if (isAllUpper) return replacement.toUpperCase();
  if (isAllLower) return replacement.toLowerCase();
  if (isCapitalized)
    return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();

  return replacement;
}

function buildReplacementText(
  matchedTokens: Token[],
  replacement: string[] | null,
  _allTokens: Token[]
): string | null {
  if (replacement === null) return null;
  if (replacement.length === 0) return '';

  const firstWordToken = matchedTokens.find((t) => t.type === 'word' || t.type === 'contraction');
  if (!firstWordToken) {
    return replacement.join(' ');
  }

  const matchedPhrase = matchedTokens
    .filter((t) => t.type === 'word' || t.type === 'contraction')
    .map((t) => t.text)
    .join(' ');

  const replacementPhrase = replacement.join(' ');
  return preserveCase(matchedPhrase, replacementPhrase);
}

const SUBJECT_PRONOUNS = new Set(['i', 'we', 'you', 'he', 'she', 'it', 'they']);

function getTokensBetween(allTokens: Token[], start: number, end: number): Token[] {
  const startToken = allTokens.findIndex((t) => t.start >= start);
  const endToken = allTokens.findIndex((t) => t.end >= end);

  if (startToken === -1) return [];
  const actualEnd = endToken === -1 ? allTokens.length : endToken + 1;

  return allTokens.slice(startToken, actualEnd);
}

export function findMatches(text: string, rules: TokenRule[]): RuleMatch[] {
  const allTokens = tokenize(text);
  const wordTokens = getWordTokens(allTokens);
  const matches: RuleMatch[] = [];
  const usedRanges: Array<{ start: number; end: number }> = [];

  const sortedRules = [...rules].sort((a, b) => b.pattern.length - a.pattern.length);

  for (const rule of sortedRules) {
    for (let i = 0; i < wordTokens.length; i++) {
      const result = matchesPattern(wordTokens, i, rule.pattern);

      if (!result.matched) continue;

      const matchedWordTokens = wordTokens.slice(i, result.endIndex);
      if (matchedWordTokens.length === 0) continue;

      const textStart = matchedWordTokens[0].start;
      const textEnd = matchedWordTokens[matchedWordTokens.length - 1].end;

      const overlaps = usedRanges.some(
        (range) =>
          (textStart >= range.start && textStart < range.end) ||
          (textEnd > range.start && textEnd <= range.end) ||
          (textStart <= range.start && textEnd >= range.end)
      );

      if (overlaps) continue;

      const matchedTokens = getTokensBetween(allTokens, textStart, textEnd);

      const context: MatchContext = {
        before: allTokens.filter((t) => t.end <= textStart),
        matched: matchedTokens,
        after: allTokens.filter((t) => t.start >= textEnd),
        allTokens,
        originalText: text,
      };

      if (rule.constraint && !rule.constraint(context)) continue;

      let actualTextEnd = textEnd;
      let actualMatchedTokens = matchedTokens;

      if (rule.restructure?.captures) {
        const afterWordTokens = getWordTokens(context.after);
        for (const capture of rule.restructure.captures) {
          if (capture.name === 'subject' && afterWordTokens.length > 0) {
            const firstAfter = afterWordTokens[0];
            if (SUBJECT_PRONOUNS.has(firstAfter.normalized)) {
              actualTextEnd = firstAfter.end;
              actualMatchedTokens = getTokensBetween(allTokens, textStart, actualTextEnd);
            }
          }
        }
      }

      const extendedContext: MatchContext = {
        ...context,
        matched: actualMatchedTokens,
        after: allTokens.filter((t) => t.start >= actualTextEnd),
      };

      const replacementText = buildReplacementText(
        actualMatchedTokens,
        rule.replacement,
        allTokens
      );

      matches.push({
        rule,
        tokenStart: i,
        tokenEnd: result.endIndex,
        textStart,
        textEnd: actualTextEnd,
        matchedTokens: actualMatchedTokens,
        replacementText,
        context: extendedContext,
      });

      usedRanges.push({ start: textStart, end: textEnd });
    }
  }

  return matches.sort((a, b) => a.textStart - b.textStart);
}

export function applyMatches(text: string, matches: RuleMatch[]): string {
  const replacementMatches = matches.filter((m) => m.replacementText !== null);
  const sortedMatches = [...replacementMatches].sort((a, b) => b.textStart - a.textStart);

  let result = text;

  for (const match of sortedMatches) {
    const before = result.slice(0, match.textStart);
    const after = result.slice(match.textEnd);
    result = before + (match.replacementText || '') + after;
  }

  result = cleanupText(result);

  return result;
}

function cleanupText(text: string): string {
  const lines = text.split('\n');
  const cleanedLines = lines.map((line) => {
    let cleaned = line.replace(/[ ]{2,}/g, ' ');
    cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');
    cleaned = cleaned.replace(/^[ ]+/g, '');
    cleaned = cleaned.replace(/[ ]+$/g, '');
    return cleaned;
  });

  let result = cleanedLines.join('\n');

  result = result.replace(/([.!?]\s+)([a-z])/g, (_, punct, letter) => {
    return punct + letter.toUpperCase();
  });

  const firstNonWhitespace = result.search(/\S/);
  if (
    firstNonWhitespace !== -1 &&
    result[firstNonWhitespace] !== result[firstNonWhitespace].toUpperCase()
  ) {
    result =
      result.slice(0, firstNonWhitespace) +
      result[firstNonWhitespace].toUpperCase() +
      result.slice(firstNonWhitespace + 1);
  }

  return result;
}

export function processWithRules(text: string, rules: TokenRule[]): RuleEngineResult {
  const allMatches = findMatches(text, rules);

  const replacements = allMatches.filter((m) => m.rule.replacement !== null);
  const suggestions = allMatches.filter((m) => m.rule.replacement === null);

  const transformed = applyMatches(text, replacements);

  return {
    original: text,
    transformed,
    matches: replacements,
    suggestions,
  };
}

export function tokenRuleToRule(tokenRule: TokenRule): Rule {
  return {
    pattern: tokenRule.pattern.map((p) => p.text).join(' '),
    replacement: tokenRule.replacement?.join(' ') ?? null,
    level: tokenRule.level,
    category: tokenRule.category,
    suggestion: tokenRule.suggestion,
  };
}
