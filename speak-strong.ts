#!/usr/bin/env bun

import {
  applyAcceptedReplacements,
  isInteractiveSupported,
  runInteractive,
} from './src/lib/interactive.js';
import { getStrictnessLevel, processText } from './src/lib/replacer.js';
import {
  formatInteractiveOutput,
  formatOutput,
  logInteractiveStats,
  logStats,
} from './src/lib/reporter.js';
import type { CliOptions, InteractiveResult, ProcessResult } from './src/types/index.js';
import { dim, error, warning } from './src/utils/colors.js';
import {
  ArgumentError,
  FileNotFoundError,
  FileReadError,
  FileWriteError,
} from './src/utils/errors.js';
import { readTextFile, writeTextFile } from './src/utils/file.js';
import { Logger } from './src/utils/logger.js';

const VERSION = '1.0.0';

function printHelp(): void {
  console.log(`
speak-strong v${VERSION}
Transform weak language into strong, confident communication

USAGE:
  speak-strong [options]

INPUT (one required):
  -f, --file <path>      Input file (markdown, text, etc.)
  -m, --message <text>   Input message string

OUTPUT:
  -o, --output <path>    Write result to file (default: stdout)

STRICTNESS LEVELS:
  (default)              Conservative - obvious hedges and minimizers
  --moderate             Include fillers and weak requests
  --aggressive           Flag everything including common phrases

OPTIONS:
  -i, --interactive      Review each replacement before applying
  -v, --verbose          Show detailed progress
  -q, --quiet            Suppress all output except result
  --debug                Show debug information
  -h, --help             Show this help message
  --version              Show version number

EXAMPLES:
  speak-strong -m "I just wanted to check if maybe we could try this"
  speak-strong -f email.md -o email-strong.md
  speak-strong -f notes.txt --moderate
  speak-strong -m "I think we should" --aggressive
  speak-strong -f email.txt -i              # Interactive mode
`);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '-f':
      case '--file':
        options.file = args[++i];
        break;
      case '-m':
      case '--message':
        options.message = args[++i];
        break;
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '--moderate':
        options.moderate = true;
        break;
      case '--aggressive':
        options.aggressive = true;
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '-q':
      case '--quiet':
        options.quiet = true;
        break;
      case '-i':
      case '--interactive':
        options.interactive = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
        break;
      case '--version':
        console.log(VERSION);
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          throw new ArgumentError(`Unknown option: ${arg}`);
        }
    }
    i++;
  }

  return options;
}

function validateOptions(options: CliOptions): void {
  if (!(options.file || options.message)) {
    throw new ArgumentError('Either --file or --message is required');
  }
  if (options.file && options.message) {
    throw new ArgumentError('Cannot use both --file and --message');
  }
  if (options.moderate && options.aggressive) {
    throw new ArgumentError('Cannot use both --moderate and --aggressive');
  }
}

function getInputText(options: CliOptions): string {
  if (options.message) {
    return options.message;
  }
  if (options.file) {
    return readTextFile(options.file);
  }
  throw new ArgumentError('No input provided');
}

function outputResult(
  result: ProcessResult,
  options: CliOptions,
  interactiveResult?: InteractiveResult
): void {
  const showDiff = !options.quiet;

  if (interactiveResult) {
    const output = formatInteractiveOutput(result, interactiveResult, showDiff);

    if (options.output) {
      const transformed = applyAcceptedReplacements(result.original, interactiveResult.accepted);
      writeTextFile(options.output, transformed);
      Logger.info(`Output written to ${options.output}`);
      if (showDiff) {
        console.error(output);
      }
    } else {
      console.log(output);
    }

    if (!options.quiet) {
      logInteractiveStats(interactiveResult, result.suggestions, options.aggressive);
    }
  } else {
    const output = formatOutput(result, showDiff);

    if (options.output) {
      writeTextFile(options.output, result.transformed);
      Logger.info(`Output written to ${options.output}`);
      if (showDiff) {
        console.error(output);
      }
    } else {
      console.log(output);
    }

    if (!options.quiet) {
      logStats(result);
    }
  }
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      printHelp();
      process.exit(0);
    }

    const options = parseArgs(args);
    validateOptions(options);

    Logger.configure({
      quiet: options.interactive ? true : options.quiet,
      verbose: options.verbose,
      debug: options.debug,
    });

    Logger.verbose(`speak-strong v${VERSION}`);
    Logger.debug('Options:', JSON.stringify(options));

    const inputText = getInputText(options);
    Logger.verbose(`Processing ${inputText.length} characters`);

    const level = getStrictnessLevel(options);
    Logger.verbose(`Using strictness level: ${level}`);

    const result = processText(inputText, level);

    if (options.interactive) {
      if (!isInteractiveSupported()) {
        console.error(
          warning('Interactive mode not available (not a TTY). Running in normal mode.')
        );
        outputResult(result, { ...options, interactive: false });
        return;
      }

      const interactiveResult = await runInteractive(result);

      if (interactiveResult.quit) {
        console.error(dim('\nQuitting. No changes applied.'));
        process.exit(0);
      }

      outputResult(result, options, interactiveResult);
    } else {
      outputResult(result, options);
    }
  } catch (err) {
    if (err instanceof ArgumentError) {
      console.error(error(err.message));
      console.error('Run "speak-strong --help" for usage information');
      process.exit(1);
    }
    if (err instanceof FileNotFoundError) {
      console.error(error(`File not found: ${err.filepath}`));
      process.exit(2);
    }
    if (err instanceof FileReadError) {
      console.error(error(err.message));
      process.exit(2);
    }
    if (err instanceof FileWriteError) {
      console.error(error(err.message));
      process.exit(3);
    }

    console.error(error(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}

main();
