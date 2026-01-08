import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import {
  AppConfigSchema,
  formatValidationErrors,
  RulesDatabaseSchema,
  validateRulesDatabase,
} from '../src/utils/schemas.js';

describe('RulesDatabaseSchema', () => {
  test('validates a valid rules database', () => {
    const validDb = {
      version: '1.0.0',
      conservative: [{ pattern: 'I think', replacement: 'I believe', category: 'hedging' }],
      moderate: [],
      aggressive: [],
    };

    const result = RulesDatabaseSchema.safeParse(validDb);
    expect(result.success).toBe(true);
  });

  test('rejects missing version', () => {
    const invalidDb = {
      conservative: [],
      moderate: [],
      aggressive: [],
    };

    const result = RulesDatabaseSchema.safeParse(invalidDb);
    expect(result.success).toBe(false);
  });

  test('rejects empty version', () => {
    const invalidDb = {
      version: '',
      conservative: [],
      moderate: [],
      aggressive: [],
    };

    const result = RulesDatabaseSchema.safeParse(invalidDb);
    expect(result.success).toBe(false);
  });

  test('rejects rule with empty pattern', () => {
    const invalidDb = {
      version: '1.0.0',
      conservative: [{ pattern: '', replacement: 'test', category: 'hedging' }],
      moderate: [],
      aggressive: [],
    };

    const result = RulesDatabaseSchema.safeParse(invalidDb);
    expect(result.success).toBe(false);
  });

  test('rejects rule with empty category', () => {
    const invalidDb = {
      version: '1.0.0',
      conservative: [{ pattern: 'test', replacement: 'test', category: '' }],
      moderate: [],
      aggressive: [],
    };

    const result = RulesDatabaseSchema.safeParse(invalidDb);
    expect(result.success).toBe(false);
  });

  test('allows optional fields in rules', () => {
    const validDb = {
      version: '1.0.0',
      conservative: [
        { pattern: 'test', category: 'hedging' },
        { pattern: 'test2', category: 'filler', suggestion: 'Consider removing' },
        { pattern: 'test3', category: 'weak-request', restructure: true },
      ],
      moderate: [],
      aggressive: [],
    };

    const result = RulesDatabaseSchema.safeParse(validDb);
    expect(result.success).toBe(true);
  });
});

describe('AppConfigSchema', () => {
  test('validates a valid config', () => {
    const validConfig = {
      history: { maxEntries: 50 },
      watcher: { debounceMs: 500 },
      rules: { cacheEnabled: false },
    };

    const result = AppConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  test('applies defaults for missing optional fields', () => {
    const partialConfig = {
      history: {},
      watcher: {},
      rules: {},
    };

    const result = AppConfigSchema.safeParse(partialConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.history.maxEntries).toBe(100);
      expect(result.data.watcher.debounceMs).toBe(300);
      expect(result.data.rules.cacheEnabled).toBe(true);
    }
  });

  test('rejects negative maxEntries', () => {
    const invalidConfig = {
      history: { maxEntries: -1 },
      watcher: { debounceMs: 300 },
      rules: { cacheEnabled: true },
    };

    const result = AppConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  test('rejects non-integer debounceMs', () => {
    const invalidConfig = {
      history: { maxEntries: 100 },
      watcher: { debounceMs: 300.5 },
      rules: { cacheEnabled: true },
    };

    const result = AppConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  test('allows optional historyDir', () => {
    const validConfig = {
      history: { maxEntries: 100, historyDir: '/custom/path' },
      watcher: { debounceMs: 300 },
      rules: { cacheEnabled: true },
    };

    const result = AppConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.history.historyDir).toBe('/custom/path');
    }
  });
});

describe('validateRulesDatabase', () => {
  test('returns validated database for valid input', () => {
    const validDb = {
      version: '2.0.0',
      conservative: [{ pattern: 'I think', replacement: 'I believe', category: 'hedging' }],
      moderate: [],
      aggressive: [],
    };

    const result = validateRulesDatabase(validDb);
    expect(result.version).toBe('2.0.0');
    expect(result.conservative).toHaveLength(1);
  });

  test('throws ZodError for invalid input', () => {
    const invalidDb = { version: '' };

    expect(() => validateRulesDatabase(invalidDb)).toThrow();
  });
});

describe('formatValidationErrors', () => {
  test('formats simple error', () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 123 });

    if (!result.success) {
      const formatted = formatValidationErrors(result.error);
      expect(formatted).toContain('name');
    }
  });

  test('formats nested error paths', () => {
    const schema = z.object({
      history: z.object({
        maxEntries: z.number(),
      }),
    });
    const result = schema.safeParse({ history: { maxEntries: 'not a number' } });

    if (!result.success) {
      const formatted = formatValidationErrors(result.error);
      expect(formatted).toContain('history.maxEntries');
    }
  });

  test('handles multiple errors', () => {
    const schema = z.object({
      a: z.string(),
      b: z.number(),
    });
    const result = schema.safeParse({ a: 123, b: 'string' });

    if (!result.success) {
      const formatted = formatValidationErrors(result.error);
      expect(formatted).toContain('a');
      expect(formatted).toContain('b');
      expect(formatted.split('\n').length).toBe(2);
    }
  });
});
