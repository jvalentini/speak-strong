# Speak Strong Usage Guide

This guide shows how to use Speak Strong with real-world examples.

## Basic Usage

### Processing a Message

```bash
bun run speak-strong.ts -m "I just wanted to check in about the project"
```

Output:
```
── Replacements ──────────────────────────────────
  [minimizing]
  I just wanted to -> I wanted to

── Result ────────────────────────────────────────
I wanted to check in about the project

── Stats: 1 phrase replaced ──
```

### Processing a File

```bash
bun run speak-strong.ts -f docs/examples/email-followup-weak.txt
```

### Saving Output to a File

```bash
bun run speak-strong.ts -f input.txt -o output.txt
```

When saving to a file, the diff is shown in stderr and the clean text is written to the file.

## Strictness Levels

### Conservative (Default)

Best for: Everyday use, quick improvements

```bash
bun run speak-strong.ts -m "I think we should try this approach"
```

Replaces obvious hedges and minimizers while keeping your voice natural.

### Moderate

Best for: Important emails, presentations, proposals

```bash
bun run speak-strong.ts -m "I kind of think we should try this" --moderate
```

Also removes "kind of", "sort of", "I guess", and weak request patterns.

### Aggressive

Best for: Final review before sending important communications

```bash
bun run speak-strong.ts -m "Basically, in my opinion, we should try this" --aggressive
```

Flags additional filler phrases for manual review without auto-removing them.

## Real-World Examples

### Email Transformation

**Before (docs/examples/email-followup-weak.txt):**
```
Hi Sarah,

I just wanted to follow up on our conversation from yesterday. I think we 
should maybe consider pushing back the launch date by a week or two. I'm 
not sure, but I feel like the team might need more time to finish the 
testing phase.

Sorry to bother you with this, but I was wondering if you could check 
with the dev team about their timeline?
```

**After:**
```
Hi Sarah,

I wanted to follow up on our conversation from yesterday. We should maybe 
consider pushing back the launch date by a week or two. I believe the team 
might need more time to finish the testing phase.

Excuse me, could you check with the dev team about their timeline?
```

### Slack Message Transformation

**Before:**
```
Hey team! Just a quick heads up - I'm not sure, but I think there might 
be an issue with the payment processing module.
```

**After:**
```
Hey team! A quick heads up - I believe there might be an issue with the 
payment processing module.
```

### Meeting Notes Transformation

**Before:**
```
- I think we should maybe push the launch to February
- I feel like the current timeline is kind of aggressive
- I'll try to prepare a revised proposal by next week
```

**After:**
```
- We should maybe push the launch to February
- I believe the current timeline is kind of aggressive
- I will prepare a revised proposal by next week
```

(Note: "kind of" is only removed with `--moderate` flag)

## Tips for Best Results

1. **Start with conservative mode** to get familiar with the replacements
2. **Use moderate mode** for important professional communications
3. **Review aggressive suggestions** manually - not all fillers need removal
4. **Preserve your voice** - the tool improves clarity, not personality
5. **Context matters** - "I think" is fine in casual conversation

## Common Patterns Replaced

| Weak | Strong | Category |
|------|--------|----------|
| I just wanted to | I wanted to | minimizing |
| I think we should | We should | hedging |
| Sorry to bother you | Excuse me | apologizing |
| I'll try to | I will | non-committal |
| Does that make sense? | Let me know if you have questions | approval-seeking |
| I feel like | I believe | hedging |
| Maybe we should | We should | hedging |

## Piping and Shell Integration

```bash
# Process clipboard content (macOS)
pbpaste | bun run speak-strong.ts -m "$(cat)"

# Process and copy result (macOS)
bun run speak-strong.ts -m "I think we should try" -q | pbcopy

# Process multiple files
for f in *.txt; do
  bun run speak-strong.ts -f "$f" -o "strong-$f"
done
```

## Quiet Mode for Scripting

```bash
# Only output the transformed text
bun run speak-strong.ts -m "I think we should try" --quiet
# Output: We should try
```

## Verbose Mode for Debugging

```bash
bun run speak-strong.ts -m "I think we should try" --verbose
```

Shows processing details including character count and strictness level.
