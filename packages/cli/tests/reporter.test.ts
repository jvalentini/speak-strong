import { describe, expect, test } from 'bun:test';
import { formatOutput } from '../src/lib/reporter.js';
import type { ProcessResult } from '../src/types/index.js';

function createMockResult(overrides: Partial<ProcessResult> = {}): ProcessResult {
  return {
    original: 'I think we should try this',
    transformed: 'We should try this',
    replacements: [],
    suggestions: [],
    ...overrides,
  };
}

describe('formatOutput', () => {
  test('outputs transformed text when showDiff is false', () => {
    const result = createMockResult();
    const output = formatOutput(result, false);
    expect(output).toBe('We should try this');
  });

  test('outputs only transformed text when no changes made', () => {
    const result = createMockResult({
      original: 'Clear statement',
      transformed: 'Clear statement',
    });
    const output = formatOutput(result, true);
    expect(output).toBe('Clear statement');
  });

  test('includes replacements section when showDiff is true', () => {
    const result = createMockResult({
      replacements: [
        {
          original: 'I think we should',
          replacement: 'We should',
          start: 0,
          end: 17,
          rule: {
            pattern: 'I think we should',
            replacement: 'We should',
            level: 'conservative',
            category: 'hedging',
          },
        },
      ],
    });
    const output = formatOutput(result, true);
    expect(output).toContain('Replacements');
    expect(output).toContain('hedging');
  });

  test('includes suggestions section when present', () => {
    const result = createMockResult({
      suggestions: [
        {
          original: 'in my opinion',
          replacement: null,
          start: 0,
          end: 13,
          rule: {
            pattern: 'in my opinion',
            replacement: null,
            level: 'aggressive',
            category: 'filler',
            suggestion: 'Consider removing',
          },
        },
      ],
    });
    const output = formatOutput(result, true);
    expect(output).toContain('Suggestions');
    expect(output).toContain('manual review');
  });

  test('groups replacements by category', () => {
    const result = createMockResult({
      replacements: [
        {
          original: 'I think',
          replacement: 'I believe',
          start: 0,
          end: 7,
          rule: {
            pattern: 'I think',
            replacement: 'I believe',
            level: 'conservative',
            category: 'hedging',
          },
        },
        {
          original: 'just wanted',
          replacement: 'wanted',
          start: 20,
          end: 31,
          rule: {
            pattern: 'just wanted',
            replacement: 'wanted',
            level: 'conservative',
            category: 'minimizing',
          },
        },
      ],
    });
    const output = formatOutput(result, true);
    expect(output).toContain('hedging');
    expect(output).toContain('minimizing');
  });

  test('includes Result section header when showDiff is true with changes', () => {
    const result = createMockResult({
      replacements: [
        {
          original: 'I think',
          replacement: 'I believe',
          start: 0,
          end: 7,
          rule: {
            pattern: 'I think',
            replacement: 'I believe',
            level: 'conservative',
            category: 'hedging',
          },
        },
      ],
    });
    const output = formatOutput(result, true);
    expect(output).toContain('Result');
  });

  test('shows suggestion hints', () => {
    const result = createMockResult({
      suggestions: [
        {
          original: 'basically',
          replacement: null,
          start: 0,
          end: 9,
          rule: {
            pattern: 'basically',
            replacement: null,
            level: 'aggressive',
            category: 'filler',
            suggestion: 'Consider removing - often adds no meaning',
          },
        },
      ],
    });
    const output = formatOutput(result, true);
    expect(output).toContain('often adds no meaning');
  });
});
