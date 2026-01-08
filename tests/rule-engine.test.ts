import { describe, expect, test } from 'bun:test';
import {
  applyMatches,
  convertLegacyRule,
  findMatches,
  processWithRules,
} from '../src/lib/rule-engine.js';

describe('convertLegacyRule', () => {
  test('converts pattern to token sequence', () => {
    const rule = convertLegacyRule({
      pattern: 'I think we should',
      replacement: 'We should',
      level: 'conservative',
      category: 'hedging',
    });
    expect(rule.pattern).toEqual([
      { text: 'i' },
      { text: 'think' },
      { text: 'we' },
      { text: 'should' },
    ]);
    expect(rule.replacement).toEqual(['We', 'should']);
  });

  test('handles empty replacement (deletion)', () => {
    const rule = convertLegacyRule({
      pattern: 'just',
      replacement: '',
      level: 'moderate',
      category: 'minimizing',
    });
    expect(rule.replacement).toEqual([]);
  });

  test('handles null replacement (suggestion only)', () => {
    const rule = convertLegacyRule({
      pattern: 'basically',
      replacement: null,
      level: 'aggressive',
      category: 'filler',
      suggestion: 'Consider removing',
    });
    expect(rule.replacement).toBeNull();
    expect(rule.suggestion).toBe('Consider removing');
  });

  test('strips punctuation from pattern except apostrophes', () => {
    const rule = convertLegacyRule({
      pattern: "I'm not sure, but",
      replacement: '',
      level: 'conservative',
      category: 'hedging',
    });
    expect(rule.pattern).toEqual([
      { text: "i'm" },
      { text: 'not' },
      { text: 'sure' },
      { text: 'but' },
    ]);
  });
});

describe('findMatches', () => {
  test('finds single match', () => {
    const rule = convertLegacyRule({
      pattern: 'I think',
      replacement: 'I believe',
      level: 'conservative',
      category: 'hedging',
    });
    const matches = findMatches('I think this is good', [rule]);
    expect(matches).toHaveLength(1);
    expect(matches[0].textStart).toBe(0);
    expect(matches[0].textEnd).toBe(7);
  });

  test('finds multiple matches', () => {
    const rule = convertLegacyRule({
      pattern: 'maybe',
      replacement: '',
      level: 'conservative',
      category: 'hedging',
    });
    const matches = findMatches('maybe we should maybe try', [rule]);
    expect(matches).toHaveLength(2);
  });

  test('prioritizes longer patterns', () => {
    const rules = [
      convertLegacyRule({
        pattern: 'I think',
        replacement: 'I believe',
        level: 'conservative',
        category: 'hedging',
      }),
      convertLegacyRule({
        pattern: 'I think we should',
        replacement: 'We should',
        level: 'conservative',
        category: 'hedging',
      }),
    ];
    const matches = findMatches('I think we should try', rules);
    expect(matches).toHaveLength(1);
    expect(matches[0].rule.pattern.length).toBe(4);
  });

  test('prevents overlapping matches', () => {
    const rules = [
      convertLegacyRule({
        pattern: 'I think we should',
        replacement: 'We should',
        level: 'conservative',
        category: 'hedging',
      }),
      convertLegacyRule({
        pattern: 'we should',
        replacement: 'we will',
        level: 'conservative',
        category: 'hedging',
      }),
    ];
    const matches = findMatches('I think we should try', rules);
    expect(matches).toHaveLength(1);
  });

  test('handles case insensitivity', () => {
    const rule = convertLegacyRule({
      pattern: 'i think',
      replacement: 'I believe',
      level: 'conservative',
      category: 'hedging',
    });
    const matches = findMatches('I THINK this is good', [rule]);
    expect(matches).toHaveLength(1);
  });
});

describe('applyMatches', () => {
  test('applies single replacement', () => {
    const rule = convertLegacyRule({
      pattern: 'I think',
      replacement: 'I believe',
      level: 'conservative',
      category: 'hedging',
    });
    const matches = findMatches('I think this is good', [rule]);
    const result = applyMatches('I think this is good', matches);
    expect(result).toBe('I believe this is good');
  });

  test('applies deletion', () => {
    const rule = convertLegacyRule({
      pattern: 'just',
      replacement: '',
      level: 'moderate',
      category: 'minimizing',
    });
    const matches = findMatches('I just wanted to say', [rule]);
    const result = applyMatches('I just wanted to say', matches);
    expect(result).toBe('I wanted to say');
  });

  test('applies multiple replacements', () => {
    const rules = [
      convertLegacyRule({
        pattern: 'I think',
        replacement: 'I believe',
        level: 'conservative',
        category: 'hedging',
      }),
      convertLegacyRule({
        pattern: 'maybe',
        replacement: '',
        level: 'conservative',
        category: 'hedging',
      }),
    ];
    const matches = findMatches('I think maybe we should try', rules);
    const result = applyMatches('I think maybe we should try', matches);
    expect(result).toBe('I believe we should try');
  });

  test('preserves case - capitalized', () => {
    const rule = convertLegacyRule({
      pattern: 'I think we should',
      replacement: 'We should',
      level: 'conservative',
      category: 'hedging',
    });
    const matches = findMatches('I think we should try', [rule]);
    const result = applyMatches('I think we should try', matches);
    expect(result).toBe('We should try');
  });

  test('preserves case - lowercase', () => {
    const rule = convertLegacyRule({
      pattern: 'maybe we should',
      replacement: 'we should',
      level: 'conservative',
      category: 'hedging',
    });
    const matches = findMatches('and maybe we should try', [rule]);
    const result = applyMatches('and maybe we should try', matches);
    expect(result).toBe('And we should try');
  });
});

describe('sentence restructuring', () => {
  test('restructures "would you mind if I" to "I\'d like to"', () => {
    const rule = convertLegacyRule({
      pattern: 'would you mind if',
      replacement: "I'd like to",
      level: 'moderate',
      category: 'weak-request',
    });
    const result = processWithRules('Would you mind if I take this?', [rule]);
    expect(result.transformed).toBe("I'd like to take this?");
  });

  test('restructures with different subjects', () => {
    const rule = convertLegacyRule({
      pattern: 'would you mind if',
      replacement: "I'd like to",
      level: 'moderate',
      category: 'weak-request',
    });
    const result = processWithRules('Would you mind if we discuss this?', [rule]);
    expect(result.transformed).toBe("I'd like to discuss this?");
  });

  test('does not restructure when no subject follows', () => {
    const rule = convertLegacyRule({
      pattern: 'would you mind if',
      replacement: "I'd like to",
      level: 'moderate',
      category: 'weak-request',
    });
    const result = processWithRules('Would you mind if possible?', [rule]);
    expect(result.transformed).toBe("I'd like to possible?");
  });
});

describe('processWithRules', () => {
  test('separates replacements from suggestions', () => {
    const rules = [
      convertLegacyRule({
        pattern: 'I think',
        replacement: 'I believe',
        level: 'conservative',
        category: 'hedging',
      }),
      convertLegacyRule({
        pattern: 'basically',
        replacement: null,
        level: 'aggressive',
        category: 'filler',
        suggestion: 'Consider removing',
      }),
    ];
    const result = processWithRules('I think basically we should try', rules);
    expect(result.matches).toHaveLength(1);
    expect(result.suggestions).toHaveLength(1);
    expect(result.transformed).toBe('I believe basically we should try');
  });

  test('cleans up spacing after deletions', () => {
    const rule = convertLegacyRule({
      pattern: 'just',
      replacement: '',
      level: 'moderate',
      category: 'minimizing',
    });
    const result = processWithRules('I just wanted to say', [rule]);
    expect(result.transformed).toBe('I wanted to say');
    expect(result.transformed).not.toContain('  ');
  });
});
