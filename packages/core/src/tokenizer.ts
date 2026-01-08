/**
 * Tokenizer for speak-strong text processing.
 *
 * Splits text into tokens while preserving exact positions for accurate replacement.
 * Designed to be extended with NLP library integration (e.g., POS tagging).
 */

export type TokenType = 'word' | 'punctuation' | 'whitespace' | 'contraction';

export interface Token {
  /** The original text of the token */
  text: string;
  /** Token classification */
  type: TokenType;
  /** Start position in original text (inclusive) */
  start: number;
  /** End position in original text (exclusive) */
  end: number;
  /** Normalized form (lowercase, for matching) */
  normalized: string;
  /** Optional POS tag (for future NLP integration) */
  pos?: string;
}

export interface TokenizerOptions {
  /** Preserve contraction tokens as single units (default: true) */
  preserveContractions?: boolean;
}

// Common English contractions
const CONTRACTIONS = new Set([
  "i'm",
  "i'll",
  "i've",
  "i'd",
  "you're",
  "you'll",
  "you've",
  "you'd",
  "he's",
  "he'll",
  "he'd",
  "she's",
  "she'll",
  "she'd",
  "it's",
  "it'll",
  "it'd",
  "we're",
  "we'll",
  "we've",
  "we'd",
  "they're",
  "they'll",
  "they've",
  "they'd",
  "that's",
  "that'll",
  "that'd",
  "who's",
  "who'll",
  "who'd",
  "what's",
  "what'll",
  "what'd",
  "where's",
  "where'll",
  "where'd",
  "when's",
  "when'll",
  "when'd",
  "why's",
  "why'll",
  "why'd",
  "how's",
  "how'll",
  "how'd",
  "isn't",
  "aren't",
  "wasn't",
  "weren't",
  "hasn't",
  "haven't",
  "hadn't",
  "doesn't",
  "don't",
  "didn't",
  "won't",
  "wouldn't",
  "shouldn't",
  "couldn't",
  "mightn't",
  "mustn't",
  "can't",
  "let's",
  "here's",
  "there's",
]);

/**
 * Tokenize text into a sequence of tokens with position information.
 */
export function tokenize(text: string, options: TokenizerOptions = {}): Token[] {
  const { preserveContractions = true } = options;
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < text.length) {
    const char = text[pos];

    // Whitespace
    if (/\s/.test(char)) {
      const start = pos;
      while (pos < text.length && /\s/.test(text[pos])) {
        pos++;
      }
      tokens.push({
        text: text.slice(start, pos),
        type: 'whitespace',
        start,
        end: pos,
        normalized: text.slice(start, pos),
      });
      continue;
    }

    // Punctuation (but not apostrophe at start of word)
    if (/[^\w\s']/.test(char) || (char === "'" && !/\w/.test(text[pos + 1] || ''))) {
      tokens.push({
        text: char,
        type: 'punctuation',
        start: pos,
        end: pos + 1,
        normalized: char,
      });
      pos++;
      continue;
    }

    // Word (possibly with apostrophe for contractions)
    if (/[\w']/.test(char)) {
      const start = pos;
      let word = '';

      while (pos < text.length && /[\w']/.test(text[pos])) {
        word += text[pos];
        pos++;
      }

      // Clean trailing apostrophes that aren't part of contractions
      while (word.endsWith("'") && !CONTRACTIONS.has(word.toLowerCase())) {
        word = word.slice(0, -1);
        pos--;
      }

      // Check if it's a contraction
      const isContraction = preserveContractions && CONTRACTIONS.has(word.toLowerCase());

      tokens.push({
        text: word,
        type: isContraction ? 'contraction' : 'word',
        start,
        end: pos,
        normalized: word.toLowerCase(),
      });
      continue;
    }

    // Fallback: single character
    tokens.push({
      text: char,
      type: 'punctuation',
      start: pos,
      end: pos + 1,
      normalized: char,
    });
    pos++;
  }

  return tokens;
}

/**
 * Get only word and contraction tokens (skip whitespace and punctuation).
 */
export function getWordTokens(tokens: Token[]): Token[] {
  return tokens.filter((t) => t.type === 'word' || t.type === 'contraction');
}

/**
 * Reconstruct text from tokens.
 */
export function tokensToText(tokens: Token[]): string {
  return tokens.map((t) => t.text).join('');
}

/**
 * Find token at a given position in the original text.
 */
export function tokenAtPosition(tokens: Token[], position: number): Token | undefined {
  return tokens.find((t) => position >= t.start && position < t.end);
}

/**
 * Get a slice of tokens by position range in original text.
 */
export function tokenSlice(tokens: Token[], start: number, end: number): Token[] {
  return tokens.filter((t) => t.start >= start && t.end <= end);
}
