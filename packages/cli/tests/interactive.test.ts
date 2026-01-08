import { describe, expect, test } from 'bun:test';
import { applyAcceptedReplacements } from '../src/lib/interactive.js';
import type { Match, Rule } from '../src/types/index.js';

const createMatch = (
  original: string,
  replacement: string | null,
  start: number,
  end: number,
  category = 'hedging'
): Match => ({
  original,
  replacement,
  start,
  end,
  rule: {
    pattern: original.toLowerCase(),
    replacement,
    level: 'conservative',
    category,
  } as Rule,
});

describe('applyAcceptedReplacements', () => {
  test('returns original text when no matches accepted', () => {
    const result = applyAcceptedReplacements('I think we should try', []);
    expect(result).toBe('I think we should try');
  });

  test('applies single replacement', () => {
    const original = 'I think we should try';
    const matches = [createMatch('I think', 'I believe', 0, 7)];
    const result = applyAcceptedReplacements(original, matches);
    expect(result).toBe('I believe we should try');
  });

  test('applies multiple replacements in correct order', () => {
    const original = 'I just wanted to say I think we should try';
    const matches = [
      createMatch('I just wanted to', 'I wanted to', 0, 16, 'minimizing'),
      createMatch('I think', 'I believe', 21, 28),
    ];
    const result = applyAcceptedReplacements(original, matches);
    expect(result).toBe('I wanted to say I believe we should try');
  });

  test('handles removal (null replacement)', () => {
    const original = 'I kind of think we should try';
    const matches = [createMatch('kind of ', null, 2, 10, 'filler')];
    const result = applyAcceptedReplacements(original, matches);
    expect(result).toBe('I think we should try');
  });

  test('cleans up double spaces after replacement', () => {
    const original = 'I just  wanted to try';
    const matches = [createMatch('just ', null, 2, 7, 'minimizing')];
    const result = applyAcceptedReplacements(original, matches);
    expect(result).toBe('I wanted to try');
  });

  test('preserves original text when no replacements', () => {
    const original = 'Hello , world';
    const result = applyAcceptedReplacements(original, []);
    expect(result).toBe('Hello , world');
  });

  test('capitalizes first letter if needed', () => {
    const original = 'i think we should';
    const matches = [createMatch('i think', '', 0, 7)];
    const result = applyAcceptedReplacements(original, matches);
    expect(result).toBe('We should');
  });

  test('capitalizes after sentence end', () => {
    const original = 'First sentence. i think second.';
    const matches = [createMatch('i think ', '', 16, 24)];
    const result = applyAcceptedReplacements(original, matches);
    expect(result).toBe('First sentence. Second.');
  });

  test('handles overlapping positions correctly', () => {
    const original = 'I think I just think we should';
    const matches = [
      createMatch('I think', 'We believe', 0, 7),
      createMatch('I just think', 'we believe', 8, 20),
    ];
    const result = applyAcceptedReplacements(original, matches);
    expect(result).toBe('We believe we believe we should');
  });

  test('preserves text between replacements', () => {
    const original = 'Maybe we should try';
    const matches = [createMatch('Maybe', 'Perhaps', 0, 5)];
    const result = applyAcceptedReplacements(original, matches);
    expect(result).toBe('Perhaps we should try');
  });

  test('preserves newlines', () => {
    const original = 'I think we should.\n\nMaybe we can.';
    const matches = [createMatch('I think', 'I believe', 0, 7)];
    const result = applyAcceptedReplacements(original, matches);
    expect(result).toContain('\n\n');
    expect(result.split('\n').length).toBe(3);
  });

  test('preserves tabs', () => {
    const original = 'I think we should:\n\t- First\n\t- Second';
    const matches = [createMatch('I think', 'I believe', 0, 7)];
    const result = applyAcceptedReplacements(original, matches);
    expect(result).toContain('\t');
    expect(result).toContain('\t- First');
  });

  test('collapses multiple spaces within lines but preserves newlines', () => {
    const original = 'I think  we  should.\n\nMaybe  we  can.';
    const matches = [createMatch('I think', 'I believe', 0, 7)];
    const result = applyAcceptedReplacements(original, matches);
    expect(result).not.toContain('  '); // Multiple spaces collapsed
    expect(result).toContain('\n\n'); // Newlines preserved
  });

  test('preserves multi-line formatting', () => {
    const original = `Subject: Test

I think we should meet.

Best,
John`;
    const matches = [createMatch('I think', 'I believe', 15, 22)];
    const result = applyAcceptedReplacements(original, matches);
    expect(result).toContain('Subject: Test');
    expect(result).toContain('Best,');
    expect(result).toContain('John');
    expect(result.split('\n').length).toBeGreaterThan(4);
  });
});
