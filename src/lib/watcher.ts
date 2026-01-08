import { createHash } from 'node:crypto';
import { watch } from 'node:fs';
import type { ProcessResult, StrictnessLevel } from '../types/index.js';
import { bold, cyan, dim, green, yellow } from '../utils/colors.js';
import { readTextFile, writeTextFile } from '../utils/file.js';
import { processText } from './replacer.js';

export interface WatchOptions {
  file: string;
  output?: string;
  level: StrictnessLevel;
  quiet?: boolean;
}

function getTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function hashContent(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

function formatWatchResult(result: ProcessResult): string {
  const repCount = result.replacements.length;
  const sugCount = result.suggestions.length;

  const parts: string[] = [];
  if (repCount > 0) {
    parts.push(green(`${repCount} replacement${repCount === 1 ? '' : 's'}`));
  }
  if (sugCount > 0) {
    parts.push(yellow(`${sugCount} suggestion${sugCount === 1 ? '' : 's'}`));
  }
  if (parts.length === 0) {
    parts.push(dim('no changes'));
  }

  return parts.join(', ');
}

export function watchFile(options: WatchOptions): { stop: () => void } {
  let lastHash = '';
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isProcessing = false;
  let watcher: ReturnType<typeof watch> | null = null;

  const processFile = () => {
    if (isProcessing) return;

    try {
      const content = readTextFile(options.file);
      const currentHash = hashContent(content);

      if (currentHash === lastHash) {
        return;
      }

      lastHash = currentHash;
      isProcessing = true;

      const result = processText(content, options.level);
      const timestamp = dim(`[${getTimestamp()}]`);
      const summary = formatWatchResult(result);

      if (options.output) {
        writeTextFile(options.output, result.transformed);
        if (!options.quiet) {
          console.error(`${timestamp} ${cyan(options.file)} → ${cyan(options.output)}: ${summary}`);
        }
      } else {
        if (!options.quiet) {
          console.error(`${timestamp} ${cyan(options.file)}: ${summary}`);
          console.error('');
          console.log(result.transformed);
          console.error('');
        } else {
          console.log(result.transformed);
        }
      }
    } catch (err) {
      const timestamp = dim(`[${getTimestamp()}]`);
      console.error(
        `${timestamp} ${yellow('Error processing file:')} ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      isProcessing = false;
    }
  };

  const onFileChange = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(processFile, 300);
  };

  console.error(bold(`\nWatching: ${options.file}`));
  console.error(dim('Press Ctrl+C to stop\n'));

  processFile();

  try {
    watcher = watch(options.file, onFileChange);
  } catch (err) {
    console.error(yellow(`Cannot watch file: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }

  const stop = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    if (watcher) {
      watcher.close();
    }
    console.error(dim('\nStopped watching.'));
  };

  return { stop };
}
