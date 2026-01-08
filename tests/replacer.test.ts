import { describe, expect, test } from 'bun:test';
import { getStrictnessLevel, processText } from '../src/lib/replacer.js';

describe('getStrictnessLevel', () => {
  test('returns conservative by default', () => {
    expect(getStrictnessLevel({})).toBe('conservative');
  });

  test('returns moderate when moderate flag is set', () => {
    expect(getStrictnessLevel({ moderate: true })).toBe('moderate');
  });

  test('returns aggressive when aggressive flag is set', () => {
    expect(getStrictnessLevel({ aggressive: true })).toBe('aggressive');
  });

  test('aggressive takes precedence over moderate', () => {
    expect(getStrictnessLevel({ moderate: true, aggressive: true })).toBe('aggressive');
  });
});

describe('processText - conservative level', () => {
  describe('hedging patterns', () => {
    test('replaces "I think we should" with "We should"', () => {
      const result = processText('I think we should do this', 'conservative');
      expect(result.transformed).toBe('We should do this');
      expect(result.replacements).toHaveLength(1);
    });

    test('replaces "I think this" with "This"', () => {
      const result = processText('I think this is correct', 'conservative');
      expect(result.transformed).toBe('This is correct');
    });

    test('replaces standalone "I think" with "I believe"', () => {
      const result = processText('I think the approach is solid', 'conservative');
      expect(result.transformed).toBe('I believe the approach is solid');
    });

    test('replaces "I feel like" with "I believe"', () => {
      const result = processText('I feel like we need more time', 'conservative');
      expect(result.transformed).toBe('I believe we need more time');
    });

    test('replaces "maybe we should" with "we should"', () => {
      const result = processText('maybe we should try again', 'conservative');
      expect(result.transformed).toBe('We should try again');
    });

    test('removes "I\'m not sure, but"', () => {
      const result = processText("I'm not sure, but this seems right", 'conservative');
      expect(result.transformed).toBe('This seems right');
    });
  });

  describe('minimizing patterns', () => {
    test('replaces "I just wanted to" with "I wanted to"', () => {
      const result = processText('I just wanted to follow up', 'conservative');
      expect(result.transformed).toBe('I wanted to follow up');
    });

    test('replaces "just a quick" with "a quick"', () => {
      const result = processText('Just a quick question', 'conservative');
      expect(result.transformed).toBe('A quick question');
    });

    test('replaces "I only have a" with "I have a"', () => {
      const result = processText('I only have a small suggestion', 'conservative');
      expect(result.transformed).toBe('I have a small suggestion');
    });
  });

  describe('apologizing patterns', () => {
    test('replaces "sorry to bother you" with "excuse me"', () => {
      const result = processText('Sorry to bother you, can I ask a question?', 'conservative');
      expect(result.transformed).toBe('Excuse me, can I ask a question?');
    });

    test('replaces "I\'m sorry, but I disagree" with "I disagree"', () => {
      const result = processText("I'm sorry, but I disagree with this", 'conservative');
      expect(result.transformed).toBe('I disagree with this');
    });

    test('removes "sorry, but"', () => {
      const result = processText('Sorry, but we need to reschedule', 'conservative');
      expect(result.transformed).toBe('We need to reschedule');
    });
  });

  describe('non-committal patterns', () => {
    test('replaces "I\'ll try to" with "I will"', () => {
      const result = processText("I'll try to get that done", 'conservative');
      expect(result.transformed).toBe('I will get that done');
    });

    test('replaces "hopefully we can" with "we will"', () => {
      const result = processText('Hopefully we can finish on time', 'conservative');
      expect(result.transformed).toBe('We will finish on time');
    });
  });

  describe('approval-seeking patterns', () => {
    test('replaces "does that make sense" with alternative', () => {
      const result = processText('Does that make sense?', 'conservative');
      expect(result.transformed).toBe('Let me know if you have questions?');
    });

    test('removes "if you know what I mean"', () => {
      const result = processText('We need to be careful, if you know what I mean', 'conservative');
      expect(result.transformed).toBe('We need to be careful,');
    });
  });
});

describe('processText - case preservation', () => {
  test('preserves all uppercase', () => {
    const result = processText('I THINK we should proceed', 'conservative');
    expect(result.transformed).toContain('We should');
  });

  test('preserves capitalized first letter', () => {
    const result = processText('I think we should proceed', 'conservative');
    expect(result.transformed).toBe('We should proceed');
  });

  test('preserves lowercase', () => {
    const result = processText('and i think we should proceed', 'conservative');
    expect(result.transformed).toBe('And we should proceed');
  });
});

describe('processText - multiple replacements', () => {
  test('handles multiple patterns in one text', () => {
    const input = 'I just wanted to check. I think we should maybe try this.';
    const result = processText(input, 'conservative');
    expect(result.replacements.length).toBeGreaterThanOrEqual(2);
    expect(result.transformed).not.toContain('just wanted');
    expect(result.transformed).not.toContain('I think we should');
  });

  test('does not create overlapping replacements', () => {
    const input = 'I think we should try this';
    const result = processText(input, 'conservative');
    expect(result.replacements).toHaveLength(1);
    expect(result.replacements[0].original.toLowerCase()).toBe('i think we should');
  });
});

describe('processText - moderate level', () => {
  test('includes conservative rules', () => {
    const result = processText('I think we should try', 'moderate');
    expect(result.transformed).toBe('We should try');
  });

  test('removes "kind of"', () => {
    const result = processText('This is kind of important', 'moderate');
    expect(result.transformed).toBe('This is important');
  });

  test('removes "sort of"', () => {
    const result = processText('I sort of agree', 'moderate');
    expect(result.transformed).toBe('I agree');
  });

  test('removes "I guess"', () => {
    const result = processText('I guess we should proceed', 'moderate');
    expect(result.transformed).toBe('We should proceed');
  });

  test('replaces "would you mind if" with "I\'d like to"', () => {
    const result = processText('Would you mind if I take this task?', 'moderate');
    expect(result.transformed).toBe("I'd like to I take this task?");
  });

  test('removes "this might be a stupid question, but"', () => {
    const result = processText(
      'This might be a stupid question, but how does this work?',
      'moderate'
    );
    expect(result.transformed).toBe('How does this work?');
  });
});

describe('processText - aggressive level', () => {
  test('includes conservative and moderate rules', () => {
    const result = processText('I think this is kind of important', 'aggressive');
    expect(result.transformed).toBe('This is important');
  });

  test('suggests removing "in my opinion" (no auto-replace)', () => {
    const result = processText('In my opinion, this is the best approach', 'aggressive');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].original.toLowerCase()).toBe('in my opinion');
    expect(result.transformed).toContain('In my opinion');
  });

  test('suggests removing "to be honest"', () => {
    const result = processText('To be honest, I prefer the first option', 'aggressive');
    expect(result.suggestions.some((s) => s.original.toLowerCase() === 'to be honest')).toBe(true);
  });

  test('suggests removing "basically"', () => {
    const result = processText('Basically, we need to start over', 'aggressive');
    expect(result.suggestions.some((s) => s.original.toLowerCase() === 'basically')).toBe(true);
  });

  test('suggests removing "needless to say"', () => {
    const result = processText('Needless to say, this is important', 'aggressive');
    expect(result.suggestions.some((s) => s.original.toLowerCase() === 'needless to say')).toBe(
      true
    );
  });
});

describe('processText - edge cases', () => {
  test('handles empty string', () => {
    const result = processText('', 'conservative');
    expect(result.transformed).toBe('');
    expect(result.replacements).toHaveLength(0);
  });

  test('handles text with no weak language', () => {
    const result = processText('This is a clear and confident statement.', 'conservative');
    expect(result.transformed).toBe('This is a clear and confident statement.');
    expect(result.replacements).toHaveLength(0);
  });

  test('handles punctuation correctly', () => {
    const result = processText("I'm sorry, but I can't attend.", 'conservative');
    expect(result.transformed).toBe("I can't attend.");
  });

  test('does not match partial words', () => {
    const result = processText('The thinker was thoughtful', 'conservative');
    expect(result.transformed).toBe('The thinker was thoughtful');
    expect(result.replacements).toHaveLength(0);
  });

  test('handles multiple sentences', () => {
    const input = 'I think this is good. Maybe we should try it. Sorry to bother you.';
    const result = processText(input, 'conservative');
    expect(result.replacements.length).toBeGreaterThanOrEqual(2);
  });
});

describe('processText - real-world examples', () => {
  test('transforms a typical weak email opening', () => {
    const input =
      "I just wanted to reach out and see if maybe we could schedule some time to discuss the project. I'm not sure, but I think we might need more resources.";
    const result = processText(input, 'conservative');
    expect(result.transformed).not.toContain('just wanted');
    expect(result.transformed).not.toContain('maybe we could');
    expect(result.transformed).not.toContain("I'm not sure, but");
  });

  test('transforms a meeting request', () => {
    const input = 'Sorry to bother you, but does that make sense? I think we should meet tomorrow.';
    const result = processText(input, 'conservative');
    expect(result.transformed).toContain('Excuse me');
    expect(result.transformed).toContain('let me know if you have questions');
    expect(result.transformed).toContain('We should meet tomorrow');
  });

  test('transforms feedback language', () => {
    const input =
      "I feel like the design could be improved. I'm sorry, but I disagree with the color choice.";
    const result = processText(input, 'conservative');
    expect(result.transformed).toContain('I believe the design could be improved');
    expect(result.transformed).toContain('I disagree with the color choice');
  });
});
