import { describe, expect, test } from 'bun:test';
import {
  getWordTokens,
  tokenAtPosition,
  tokenize,
  tokenSlice,
  tokensToText,
} from '@speak-strong/core';

describe('tokenize', () => {
  test('tokenizes simple words', () => {
    const tokens = tokenize('hello world');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toMatchObject({ text: 'hello', type: 'word', start: 0, end: 5 });
    expect(tokens[1]).toMatchObject({ text: ' ', type: 'whitespace', start: 5, end: 6 });
    expect(tokens[2]).toMatchObject({ text: 'world', type: 'word', start: 6, end: 11 });
  });

  test('tokenizes punctuation separately', () => {
    const tokens = tokenize('Hello, world!');
    expect(tokens.map((t) => t.text)).toEqual(['Hello', ',', ' ', 'world', '!']);
  });

  test('tokenizes contractions as single tokens', () => {
    const tokens = tokenize("I'm going to the store");
    const wordTokens = getWordTokens(tokens);
    expect(wordTokens[0]).toMatchObject({ text: "I'm", type: 'contraction', normalized: "i'm" });
  });

  test('handles multiple contractions', () => {
    const tokens = tokenize("I'll try but I can't promise");
    const contractions = tokens.filter((t) => t.type === 'contraction');
    expect(contractions.map((t) => t.normalized)).toEqual(["i'll", "can't"]);
  });

  test('preserves whitespace types', () => {
    const tokens = tokenize('hello\tworld\nfoo');
    const whitespace = tokens.filter((t) => t.type === 'whitespace');
    expect(whitespace.map((t) => t.text)).toEqual(['\t', '\n']);
  });

  test('handles empty string', () => {
    const tokens = tokenize('');
    expect(tokens).toHaveLength(0);
  });

  test('handles multiple spaces', () => {
    const tokens = tokenize('hello  world');
    expect(tokens[1]).toMatchObject({ text: '  ', type: 'whitespace' });
  });

  test('normalizes to lowercase', () => {
    const tokens = tokenize('Hello WORLD');
    expect(tokens[0].normalized).toBe('hello');
    expect(tokens[2].normalized).toBe('world');
  });

  test('tracks positions correctly', () => {
    const text = 'Hello, world!';
    const tokens = tokenize(text);
    for (const token of tokens) {
      expect(text.slice(token.start, token.end)).toBe(token.text);
    }
  });
});

describe('getWordTokens', () => {
  test('filters to words and contractions only', () => {
    const tokens = tokenize("Hello, I'm here!");
    const words = getWordTokens(tokens);
    expect(words.map((t) => t.text)).toEqual(['Hello', "I'm", 'here']);
  });
});

describe('tokensToText', () => {
  test('reconstructs original text', () => {
    const text = "Hello, I'm going to the store!";
    const tokens = tokenize(text);
    expect(tokensToText(tokens)).toBe(text);
  });
});

describe('tokenAtPosition', () => {
  test('finds token at position', () => {
    const tokens = tokenize('hello world');
    expect(tokenAtPosition(tokens, 0)?.text).toBe('hello');
    expect(tokenAtPosition(tokens, 3)?.text).toBe('hello');
    expect(tokenAtPosition(tokens, 5)?.text).toBe(' ');
    expect(tokenAtPosition(tokens, 6)?.text).toBe('world');
  });

  test('returns undefined for out of bounds', () => {
    const tokens = tokenize('hi');
    expect(tokenAtPosition(tokens, 100)).toBeUndefined();
  });
});

describe('tokenSlice', () => {
  test('gets tokens in range', () => {
    const tokens = tokenize('hello world foo');
    const slice = tokenSlice(tokens, 6, 11);
    expect(slice.map((t) => t.text)).toEqual(['world']);
  });
});
