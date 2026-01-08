import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Match, ProcessResult, Rule, RulesDatabase, StrictnessLevel } from '../types/index.js';
import { loadJson } from '../utils/file.js';
import { Logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(__dirname, '../data/rules.json');

let cachedRules: Rule[] | null = null;

function loadRules(): Rule[] {
  if (cachedRules) {
    return cachedRules;
  }
  const db = loadJson<RulesDatabase>(RULES_PATH);
  cachedRules = db.rules;
  Logger.debug(`Loaded ${cachedRules.length} rules from database`);
  return cachedRules;
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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function preserveCase(original: string, replacement: string): string {
  if (!replacement) return replacement;

  const isAllUpper = original === original.toUpperCase() && original !== original.toLowerCase();
  const isAllLower = original === original.toLowerCase() && original !== original.toUpperCase();
  const isCapitalized =
    original[0] === original[0].toUpperCase() &&
    original.slice(1) === original.slice(1).toLowerCase();

  if (isAllUpper) {
    return replacement.toUpperCase();
  }
  if (isAllLower) {
    return replacement.toLowerCase();
  }
  if (isCapitalized) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
  }

  return replacement;
}

export function processText(text: string, level: StrictnessLevel): ProcessResult {
  const rules = getApplicableRules(level);

  // Sort rules by pattern length (longest first) to avoid partial replacements
  const sortedRules = [...rules].sort((a, b) => b.pattern.length - a.pattern.length);

  const replacements: Match[] = [];
  const suggestions: Match[] = [];
  let transformed = text;

  // Track positions that have been replaced to avoid overlapping
  const replacedRanges: Array<{ start: number; end: number }> = [];

  for (const rule of sortedRules) {
    // Use word boundaries for matching, case-insensitive
    const pattern = new RegExp(`\\b${escapeRegex(rule.pattern)}\\b`, 'gi');

    // Reset lastIndex for fresh search
    pattern.lastIndex = 0;

    // Find all matches in the ORIGINAL text to track positions
    const originalMatches: Array<{ start: number; end: number; matched: string }> = [];
    const searchText = text;
    let match = pattern.exec(searchText);
    while (match !== null) {
      originalMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        matched: match[0],
      });
      match = pattern.exec(searchText);
    }

    for (const origMatch of originalMatches) {
      // Check if this position overlaps with an already replaced range
      const overlaps = replacedRanges.some(
        (range) =>
          (origMatch.start >= range.start && origMatch.start < range.end) ||
          (origMatch.end > range.start && origMatch.end <= range.end) ||
          (origMatch.start <= range.start && origMatch.end >= range.end)
      );

      if (overlaps) {
        Logger.debug(`Skipping overlapping match: "${origMatch.matched}"`);
        continue;
      }

      if (rule.replacement === null) {
        // This is a suggestion-only rule
        suggestions.push({
          original: origMatch.matched,
          replacement: null,
          start: origMatch.start,
          end: origMatch.end,
          rule,
        });
      } else {
        const preserved = preserveCase(origMatch.matched, rule.replacement);
        replacements.push({
          original: origMatch.matched,
          replacement: preserved,
          start: origMatch.start,
          end: origMatch.end,
          rule,
        });
        replacedRanges.push({ start: origMatch.start, end: origMatch.end });
      }
    }
  }

  // Sort replacements by position (descending) to replace from end to start
  // This preserves positions for earlier replacements
  const sortedReplacements = [...replacements].sort((a, b) => b.start - a.start);

  for (const rep of sortedReplacements) {
    // Find the match in the current transformed text
    const pattern = new RegExp(`\\b${escapeRegex(rep.original)}\\b`, 'gi');
    transformed = transformed.replace(pattern, () => rep.replacement || '');
  }

  // Clean up double spaces and trim
  transformed = transformed.replace(/\s{2,}/g, ' ').trim();

  // Fix punctuation spacing (e.g., " ," becomes ",")
  transformed = transformed.replace(/\s+([.,!?;:])/g, '$1');

  // Fix sentence start after removal (capitalize first letter after . ! ?)
  transformed = transformed.replace(/([.!?]\s+)([a-z])/g, (_, punct, letter) => {
    return punct + letter.toUpperCase();
  });

  // Capitalize first letter of text if it starts lowercase
  if (transformed.length > 0 && transformed[0] !== transformed[0].toUpperCase()) {
    transformed = transformed[0].toUpperCase() + transformed.slice(1);
  }

  Logger.verbose(
    `Processed text: ${replacements.length} replacements, ${suggestions.length} suggestions`
  );

  return {
    original: text,
    transformed,
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
