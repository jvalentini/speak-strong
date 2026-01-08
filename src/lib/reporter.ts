import type { Match, ProcessResult } from '../types/index.js';
import { bold, cyan, dim, green, magenta, red, strikethrough, yellow } from '../utils/colors.js';
import { Logger } from '../utils/logger.js';

function formatReplacement(match: Match): string {
  const arrow = dim('->');
  const original = red(strikethrough(match.original));
  const replacement = green(match.replacement || '(removed)');
  return `  ${original} ${arrow} ${replacement}`;
}

function formatSuggestion(match: Match): string {
  const bullet = yellow('!');
  const phrase = cyan(`"${match.original}"`);
  const hint = match.rule.suggestion || 'Consider revising';
  return `  ${bullet} ${phrase}: ${dim(hint)}`;
}

function groupByCategory(matches: Match[]): Map<string, Match[]> {
  const grouped = new Map<string, Match[]>();
  for (const match of matches) {
    const category = match.rule.category;
    const existing = grouped.get(category) || [];
    existing.push(match);
    grouped.set(category, existing);
  }
  return grouped;
}

export function formatOutput(result: ProcessResult, showDiff: boolean): string {
  const lines: string[] = [];

  if (showDiff && (result.replacements.length > 0 || result.suggestions.length > 0)) {
    if (result.replacements.length > 0) {
      lines.push('');
      lines.push(bold(magenta('── Replacements ──────────────────────────────────')));

      const grouped = groupByCategory(result.replacements);
      for (const [category, matches] of grouped) {
        lines.push(dim(`  [${category}]`));
        for (const match of matches) {
          lines.push(formatReplacement(match));
        }
      }
    }

    if (result.suggestions.length > 0) {
      lines.push('');
      lines.push(bold(yellow('── Suggestions (manual review) ───────────────────')));

      const grouped = groupByCategory(result.suggestions);
      for (const [category, matches] of grouped) {
        lines.push(dim(`  [${category}]`));
        for (const match of matches) {
          lines.push(formatSuggestion(match));
        }
      }
    }

    lines.push('');
    lines.push(bold(green('── Result ────────────────────────────────────────')));
  }

  lines.push(result.transformed);

  return lines.join('\n');
}

export function logStats(result: ProcessResult): void {
  const repCount = result.replacements.length;
  const sugCount = result.suggestions.length;

  if (repCount === 0 && sugCount === 0) {
    Logger.info(green('No weak language detected'));
    return;
  }

  const parts: string[] = [];
  if (repCount > 0) {
    parts.push(`${repCount} phrase${repCount === 1 ? '' : 's'} replaced`);
  }
  if (sugCount > 0) {
    parts.push(`${sugCount} suggestion${sugCount === 1 ? '' : 's'}`);
  }

  Logger.info(dim(`── Stats: ${parts.join(', ')} ──`));
}
