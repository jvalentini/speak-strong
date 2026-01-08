import type { InteractiveResult, Match, ProcessResult } from '../types/index.js';
import { bold, cyan, dim, green, magenta, red, strikethrough, yellow } from '../utils/colors.js';
import { applyAcceptedReplacements } from './interactive.js';

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
    console.error(green('No weak language detected'));
    return;
  }

  const parts: string[] = [];
  if (repCount > 0) {
    parts.push(`${repCount} phrase${repCount === 1 ? '' : 's'} replaced`);
  }
  if (sugCount > 0) {
    parts.push(`${sugCount} suggestion${sugCount === 1 ? '' : 's'}`);
  }

  console.error(dim(`── Stats: ${parts.join(', ')} ──`));
}

export function formatInteractiveOutput(
  result: ProcessResult,
  interactiveResult: InteractiveResult,
  showDiff: boolean
): string {
  const lines: string[] = [];
  const transformed = applyAcceptedReplacements(result.original, interactiveResult.accepted);

  if (showDiff && interactiveResult.accepted.length > 0) {
    // Show replacements section like non-interactive mode
    lines.push('');
    lines.push(bold(magenta('── Replacements ──────────────────────────────────')));

    const grouped = groupByCategory(interactiveResult.accepted);
    for (const [category, matches] of grouped) {
      lines.push(dim(`  [${category}]`));
      for (const match of matches) {
        lines.push(formatReplacement(match));
      }
    }

    lines.push('');
    lines.push(bold(green('── Result ────────────────────────────────────────')));
  }

  lines.push(transformed);

  return lines.join('\n');
}

export function logInteractiveStats(
  interactiveResult: InteractiveResult,
  suggestions: Match[],
  showSuggestions?: boolean
): void {
  const acceptedCount = interactiveResult.accepted.length;
  const skippedCount = interactiveResult.skipped.length;

  if (showSuggestions && suggestions.length > 0) {
    console.error('');
    console.error(bold(yellow('── Suggestions (manual review) ───────────────────')));

    const grouped = new Map<string, Match[]>();
    for (const match of suggestions) {
      const category = match.rule.category;
      const existing = grouped.get(category) || [];
      existing.push(match);
      grouped.set(category, existing);
    }

    for (const [category, matches] of grouped) {
      console.error(dim(`  [${category}]`));
      for (const match of matches) {
        const bullet = yellow('!');
        const phrase = cyan(`"${match.original}"`);
        const hint = match.rule.suggestion || 'Consider revising';
        console.error(`  ${bullet} ${phrase}: ${dim(hint)}`);
      }
    }
  }

  const parts: string[] = [];
  if (acceptedCount > 0) {
    parts.push(green(`${acceptedCount} accepted`));
  }
  if (skippedCount > 0) {
    parts.push(yellow(`${skippedCount} skipped`));
  }
  if (suggestions.length > 0 && showSuggestions) {
    parts.push(cyan(`${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}`));
  }

  if (parts.length > 0) {
    console.error(dim(`\n── Stats: ${parts.join(', ')} ──`));
  } else {
    console.error(green('\nNo changes made'));
  }
}
