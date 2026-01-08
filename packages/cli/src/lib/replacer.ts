import {
  getStrictnessLevel as coreGetStrictnessLevel,
  processText as coreProcessText,
  type ProcessResult,
  type StrictnessLevel,
} from '@speak-strong/core';
import { Logger } from '../utils/logger.js';

export type { Match, ProcessResult, Rule, StrictnessLevel } from '@speak-strong/core';

export function processText(text: string, level: StrictnessLevel): ProcessResult {
  const result = coreProcessText(text, level);

  Logger.verbose(
    `Processed text: ${result.replacements.length} replacements, ${result.suggestions.length} suggestions`
  );

  return result;
}

export function getStrictnessLevel(options: {
  moderate?: boolean;
  aggressive?: boolean;
}): StrictnessLevel {
  return coreGetStrictnessLevel(options);
}
