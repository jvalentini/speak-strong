import type { InteractiveAction, InteractiveResult, Match, ProcessResult } from '../types/index.js';
import { bold, cyan, dim, green, red, yellow } from '../utils/colors.js';

function enableRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
}

function disableRawMode(): void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}

function readKeypress(): Promise<string> {
  return new Promise((resolve) => {
    const onData = (data: Buffer) => {
      process.stdin.removeListener('data', onData);
      resolve(data.toString());
    };
    process.stdin.on('data', onData);
  });
}

function formatMatch(match: Match, index: number, total: number): string {
  const counter = dim(`[${index + 1}/${total}]`);
  const original = red(match.original);
  const arrow = dim('→');
  const replacement = green(match.replacement || '(remove)');
  const category = dim(`[${match.rule.category}]`);

  return `${counter} ${category}\n  ${original} ${arrow} ${replacement}`;
}

function formatPrompt(): string {
  const accept = `${green(bold(`[a]`))}ccept`;
  const skip = `${yellow(bold(`[s]`))}kip`;
  const acceptAll = `${green(bold(`[A]`))}ccept all`;
  const skipAll = `${yellow(bold(`[S]`))}kip all`;
  const quit = `${red(bold(`[q]`))}uit`;

  return `\n  ${accept} / ${skip} / ${acceptAll} / ${skipAll} / ${quit} ? `;
}

function parseKeypress(key: string): InteractiveAction | null {
  if (key === 'a') return 'accept';
  if (key === 's') return 'skip';
  if (key === 'A') return 'accept-all';
  if (key === 'S') return 'skip-all';
  if (key === 'q' || key === '\x03') return 'quit';
  return null;
}

async function promptForAction(
  match: Match,
  index: number,
  total: number
): Promise<InteractiveAction> {
  process.stderr.write(`\n${formatMatch(match, index, total)}`);
  process.stderr.write(formatPrompt());

  while (true) {
    const key = await readKeypress();
    const action = parseKeypress(key);

    if (action) {
      const actionLabel =
        action === 'quit'
          ? red('quit')
          : action === 'accept' || action === 'accept-all'
            ? green(action)
            : yellow(action);
      process.stderr.write(`${actionLabel}\n`);
      return action;
    }
  }
}

export function applyAcceptedReplacements(original: string, accepted: Match[]): string {
  if (accepted.length === 0) return original;

  const sortedByPosition = [...accepted].sort((a, b) => b.start - a.start);

  let result = original;
  for (const match of sortedByPosition) {
    const before = result.slice(0, match.start);
    const after = result.slice(match.end);
    result = before + (match.replacement || '') + after;
  }

  // Clean up multiple spaces within lines (preserve newlines and tabs)
  // Split by newlines, process each line, then rejoin
  const lines = result.split('\n');
  const cleanedLines = lines.map((line) => {
    // Collapse multiple spaces within the line (but preserve tabs)
    let cleaned = line.replace(/[ ]{2,}/g, ' ');
    // Fix punctuation spacing (e.g., " ," becomes ",")
    cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');
    // Remove leading spaces (but preserve tabs for indentation)
    cleaned = cleaned.replace(/^[ ]+/g, '');
    // Remove trailing spaces
    cleaned = cleaned.replace(/[ ]+$/g, '');
    return cleaned;
  });
  result = cleanedLines.join('\n');

  // Fix sentence start after removal (capitalize first letter after . ! ?)
  result = result.replace(/([.!?]\s+)([a-z])/g, (_, punct, letter) => punct + letter.toUpperCase());

  // Capitalize first letter of text if it starts lowercase (only on first non-whitespace char)
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

export async function runInteractive(result: ProcessResult): Promise<InteractiveResult> {
  const replacements = [...result.replacements].sort((a, b) => a.start - b.start);
  const accepted: Match[] = [];
  const skipped: Match[] = [];

  if (replacements.length === 0) {
    process.stderr.write(cyan('\nNo weak phrases found to review.\n'));
    return { accepted, skipped, quit: false };
  }

  process.stderr.write(
    bold(
      `\nInteractive mode: ${replacements.length} phrase${replacements.length === 1 ? '' : 's'} to review\n`
    )
  );

  enableRawMode();

  try {
    for (let i = 0; i < replacements.length; i++) {
      const match = replacements[i];
      const action = await promptForAction(match, i, replacements.length);

      switch (action) {
        case 'accept':
          accepted.push(match);
          break;
        case 'skip':
          skipped.push(match);
          break;
        case 'accept-all':
          accepted.push(match);
          for (let j = i + 1; j < replacements.length; j++) {
            accepted.push(replacements[j]);
          }
          return { accepted, skipped, quit: false };
        case 'skip-all':
          skipped.push(match);
          for (let j = i + 1; j < replacements.length; j++) {
            skipped.push(replacements[j]);
          }
          return { accepted, skipped, quit: false };
        case 'quit':
          for (let j = i; j < replacements.length; j++) {
            skipped.push(replacements[j]);
          }
          return { accepted, skipped, quit: true };
      }
    }
  } finally {
    disableRawMode();
  }

  return { accepted, skipped, quit: false };
}

export function isInteractiveSupported(): boolean {
  return process.stdin.isTTY === true;
}
