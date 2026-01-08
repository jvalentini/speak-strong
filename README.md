# Speak Strong

A CLI tool that transforms weak, hesitant language into strong, confident communication.

## The Problem

We often undermine ourselves with weak language patterns:

- **Hedging**: "I think we should..." instead of "We should..."
- **Minimizing**: "I just wanted to..." instead of "I wanted to..."
- **Over-apologizing**: "Sorry to bother you..." instead of "Excuse me..."
- **Non-committal**: "I'll try to..." instead of "I will..."

These patterns can make you sound uncertain, unconfident, and less credible in professional settings.

## The Solution

Speak Strong analyzes your text and:
1. **Replaces** weak phrases with stronger alternatives
2. **Suggests** additional improvements for manual review
3. **Preserves** your original meaning and tone

## Quick Start

```bash
# Install dependencies
bun install

# Process a message directly
bun run speak-strong.ts -m "I just wanted to check if maybe we could try this approach"

# Process a file
bun run speak-strong.ts -f email.txt

# Save output to a file
bun run speak-strong.ts -f email.txt -o email-strong.txt
```

## Example

**Before:**
```
I just wanted to follow up on our conversation. I think we should maybe consider 
a different approach. I'm sorry, but I disagree with the timeline. Sorry to bother 
you, but does that make sense?
```

**After:**
```
I wanted to follow up on our conversation. We should maybe consider a different 
approach. I disagree with the timeline. Excuse me, but let me know if you have 
questions?
```

## Installation

Speak Strong requires [Bun](https://bun.sh) to run.

```bash
# Clone the repository
git clone https://github.com/jvalentini/speak-strong.git
cd speak-strong

# Install dependencies
bun install

# Run directly
bun run speak-strong.ts --help
```

## Usage

### Input Options

```bash
# Process a message string
speak-strong -m "Your message here"
speak-strong --message "Your message here"

# Process a file
speak-strong -f path/to/file.txt
speak-strong --file path/to/file.md
```

### Output Options

```bash
# Output to stdout (default)
speak-strong -m "I think we should try"

# Write to a file
speak-strong -m "I think we should try" -o output.txt
speak-strong -f input.txt --output output.txt
```

### Strictness Levels

Speak Strong has three levels of strictness:

| Level | Flag | Description |
|-------|------|-------------|
| Conservative | *(default)* | Replaces obvious hedges, minimizers, and apologies |
| Moderate | `--moderate` | Adds fillers and weak request patterns |
| Aggressive | `--aggressive` | Suggests removal of common filler phrases |

```bash
# Conservative (default) - replaces obvious patterns
speak-strong -m "I think we should try"

# Moderate - also removes "kind of", "sort of", "I guess"
speak-strong -m "I kind of think we should try" --moderate

# Aggressive - suggests removing "basically", "in my opinion", etc.
speak-strong -m "Basically, in my opinion, we should try" --aggressive
```

### Verbosity Options

```bash
# Normal output (shows replacements + result)
speak-strong -m "I think we should try"

# Verbose - shows progress information
speak-strong -m "I think we should try" --verbose

# Quiet - only shows the transformed result
speak-strong -m "I think we should try" --quiet
```

## Output Format

When processing text, Speak Strong shows:

1. **Replacements** - phrases that were automatically replaced
2. **Suggestions** - phrases flagged for manual review (aggressive mode)
3. **Result** - the transformed text
4. **Stats** - count of replacements and suggestions

```
── Replacements ──────────────────────────────────
  [hedging]
  I think we should -> We should
  [minimizing]
  I just wanted to -> I wanted to

── Suggestions (manual review) ───────────────────
  [filler]
  ! "basically": Consider removing - often adds no meaning

── Result ────────────────────────────────────────
We should try this approach.

── Stats: 2 phrases replaced, 1 suggestion ──
```

## Categories of Weak Language

### Conservative Level
- **Hedging**: "I think", "I feel like", "maybe", "I'm not sure but"
- **Minimizing**: "just", "only", "a small", "a quick"
- **Apologizing**: "sorry to bother", "I'm sorry but", "sorry but"
- **Non-committal**: "I'll try to", "hopefully", "might be able to"
- **Approval-seeking**: "does that make sense", "if you know what I mean"

### Moderate Level (includes Conservative)
- **Fillers**: "kind of", "sort of", "I guess", "I suppose"
- **Weak requests**: "would you mind if", "I was wondering if"
- **Self-deprecating**: "this might be a stupid question", "I'm no expert"

### Aggressive Level (includes Moderate)
- **Opinion markers**: "in my opinion", "I would argue"
- **Unnecessary qualifiers**: "basically", "actually", "literally"
- **Credibility underminers**: "to be honest", "needless to say"

## Development

```bash
# Run in development mode
bun run dev

# Type check
bun run typecheck

# Lint
bun run lint

# Format
bun run format

# Run tests
bun test

# Run all checks
bun run check
```

## Project Structure

```
speak-strong/
├── speak-strong.ts       # CLI entry point
├── src/
│   ├── lib/
│   │   ├── replacer.ts   # Core replacement engine
│   │   └── reporter.ts   # Output formatting
│   ├── types/
│   │   └── index.ts      # TypeScript interfaces
│   ├── utils/
│   │   ├── colors.ts     # Terminal colors
│   │   ├── errors.ts     # Custom error classes
│   │   ├── file.ts       # File I/O utilities
│   │   └── logger.ts     # Logging utility
│   └── data/
│       └── rules.json    # Replacement rules database
├── tests/                # Test files
├── docs/                 # Documentation and examples
└── package.json
```

## Configuration

The replacement rules are stored in `src/data/rules.json`. Each rule has:

```json
{
  "pattern": "I think we should",
  "replacement": "We should",
  "level": "conservative",
  "category": "hedging"
}
```

For suggestion-only rules (no auto-replacement):

```json
{
  "pattern": "in my opinion",
  "replacement": null,
  "level": "aggressive",
  "category": "filler",
  "suggestion": "Consider removing - your opinion is implied when you speak"
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `bun test`
5. Run checks: `bun run check`
6. Submit a pull request

## License

ISC
