import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TEST_DIR = join(tmpdir(), `speak-strong-test-${Date.now().toString()}`);
const ORIGINAL_HOME = process.env.HOME;

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  process.env.HOME = TEST_DIR;
});

afterEach(() => {
  process.env.HOME = ORIGINAL_HOME;
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('history module', () => {
  test('createEntryFromResult creates correct entry shape', async () => {
    const { createEntryFromResult } = await import('../src/lib/history.js');

    const result = {
      original: 'I think we should try',
      transformed: 'We should try',
      replacements: [
        {
          original: 'I think',
          replacement: 'We',
          start: 0,
          end: 7,
          rule: {
            pattern: 'I think',
            replacement: 'We',
            level: 'conservative' as const,
            category: 'hedging',
          },
        },
      ],
      suggestions: [],
    };

    const entry = createEntryFromResult(result, 'conservative', {
      inputFile: '/path/to/file.txt',
      outputFile: '/path/to/output.txt',
    });

    expect(entry.original).toBe('I think we should try');
    expect(entry.transformed).toBe('We should try');
    expect(entry.level).toBe('conservative');
    expect(entry.replacementCount).toBe(1);
    expect(entry.suggestionCount).toBe(0);
    expect(entry.inputFile).toBe('/path/to/file.txt');
    expect(entry.outputFile).toBe('/path/to/output.txt');
  });

  test('createEntryFromResult handles message input', async () => {
    const { createEntryFromResult } = await import('../src/lib/history.js');

    const result = {
      original: 'Test',
      transformed: 'Test',
      replacements: [],
      suggestions: [],
    };

    const entry = createEntryFromResult(result, 'moderate', {
      inputMessage: 'Test message',
    });

    expect(entry.inputMessage).toBe('Test message');
    expect(entry.inputFile).toBeUndefined();
    expect(entry.outputFile).toBeUndefined();
  });

  test('formatHistoryList returns message when empty', async () => {
    const { formatHistoryList } = await import('../src/lib/history.js');
    const result = formatHistoryList([]);
    expect(result).toContain('No history entries');
  });

  test('formatHistoryList formats entries correctly', async () => {
    const { formatHistoryList } = await import('../src/lib/history.js');

    const entries = [
      {
        id: 'abc123',
        timestamp: '2024-01-15T10:30:00Z',
        inputFile: '/path/to/file.txt',
        original: 'I think',
        transformed: 'We believe',
        level: 'conservative' as const,
        replacementCount: 2,
        suggestionCount: 0,
      },
    ];

    const result = formatHistoryList(entries);
    expect(result).toContain('abc123');
    expect(result).toContain('/path/to/file.txt');
    expect(result).toContain('2 replacements');
  });

  test('formatEntryDetails shows all entry info', async () => {
    const { formatEntryDetails } = await import('../src/lib/history.js');

    const entry = {
      id: 'xyz789',
      timestamp: '2024-01-15T14:00:00Z',
      inputFile: '/test/input.txt',
      outputFile: '/test/output.txt',
      original: 'I think we should',
      transformed: 'We should',
      level: 'aggressive' as const,
      replacementCount: 1,
      suggestionCount: 2,
    };

    const result = formatEntryDetails(entry);
    expect(result).toContain('xyz789');
    expect(result).toContain('aggressive');
    expect(result).toContain('/test/input.txt');
    expect(result).toContain('/test/output.txt');
    expect(result).toContain('I think we should');
    expect(result).toContain('We should');
  });

  test('undoEntry fails gracefully for stdout output', async () => {
    const { undoEntry } = await import('../src/lib/history.js');

    const entry = {
      id: 'test123',
      timestamp: '2024-01-15T10:00:00Z',
      original: 'Original text',
      transformed: 'Transformed text',
      level: 'conservative' as const,
      replacementCount: 1,
      suggestionCount: 0,
    };

    const result = undoEntry(entry);
    expect(result.success).toBe(false);
    expect(result.message).toContain('stdout');
    expect(result.message).toContain('Original text');
  });

  test('undoEntry fails when file does not exist', async () => {
    const { undoEntry } = await import('../src/lib/history.js');

    const entry = {
      id: 'test456',
      timestamp: '2024-01-15T10:00:00Z',
      outputFile: '/nonexistent/file.txt',
      original: 'Original text',
      transformed: 'Transformed text',
      level: 'conservative' as const,
      replacementCount: 1,
      suggestionCount: 0,
    };

    const result = undoEntry(entry);
    expect(result.success).toBe(false);
    expect(result.message).toContain('no longer exists');
  });

  test('undoEntry restores file content', async () => {
    const { undoEntry } = await import('../src/lib/history.js');
    const { readFileSync } = await import('node:fs');

    const testFile = join(TEST_DIR, 'test-undo.txt');
    writeFileSync(testFile, 'Transformed text');

    const entry = {
      id: 'test789',
      timestamp: '2024-01-15T10:00:00Z',
      outputFile: testFile,
      original: 'Original text',
      transformed: 'Transformed text',
      level: 'conservative' as const,
      replacementCount: 1,
      suggestionCount: 0,
    };

    const result = undoEntry(entry);
    expect(result.success).toBe(true);
    expect(readFileSync(testFile, 'utf-8')).toBe('Original text');
  });
});
