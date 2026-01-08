# Speak Strong Roadmap

## Phase 1: Interactive Mode (`-i, --interactive`)

### Overview
Prompt the user to confirm each replacement before applying. Useful for reviewing changes one-by-one.

### CLI Interface
```bash
speak-strong -f email.txt -i
speak-strong -m "I just think we should try" --interactive
```

### User Experience
```
Found: "I just wanted to" → "I wanted to"
Category: minimizing

[a]ccept / [s]kip / [A]ccept all / [S]kip all / [q]uit ?  a

Found: "I think we should" → "We should"  
Category: hedging

[a]ccept / [s]kip / [A]ccept all / [S]kip all / [q]uit ?  s

── Result ──────────────────────────────────────────
I wanted to check if I think we should try this.

── Stats: 1 accepted, 1 skipped ──
```

### Implementation Plan

1. **New types** (`src/types/index.ts`):
   ```typescript
   export type InteractiveAction = 'accept' | 'skip' | 'accept-all' | 'skip-all' | 'quit';
   
   export interface InteractiveResult {
     accepted: Match[];
     skipped: Match[];
     quit: boolean;
   }
   ```

2. **New module** (`src/lib/interactive.ts`):
   - `promptForAction(match: Match): Promise<InteractiveAction>` - Shows the match, waits for keypress
   - `runInteractive(result: ProcessResult): Promise<InteractiveResult>` - Main loop through matches
   - Uses Bun's built-in `process.stdin` for raw key input
   - Colors: green for replacement text, dim for category

3. **CLI changes** (`speak-strong.ts`):
   - Add `-i, --interactive` flag to `CliOptions`
   - After `processText()`, if interactive mode:
     - Call `runInteractive(result)`
     - Build final text with only accepted replacements
   - Non-TTY check: skip interactive if `!process.stdin.isTTY`

4. **Tests** (`tests/interactive.test.ts`):
   - Mock stdin for key presses
   - Test accept/skip/quit flows
   - Test accept-all/skip-all shortcuts

### Edge Cases
- No matches found → skip interactive, show "No weak phrases found"
- Non-TTY input → fall back to non-interactive mode with warning
- Ctrl+C → graceful exit, show partial results

---

## Phase 2: Watch Mode (`--watch`)

### Overview
Monitor a file for changes and re-process automatically. Output updates in-place.

### CLI Interface
```bash
speak-strong -f email.txt --watch
speak-strong -f email.txt -o strong.txt --watch
```

### User Experience
```
Watching: email.txt (Ctrl+C to stop)

[10:42:15] Processed email.txt
  2 replacements, 1 suggestion
  
[10:42:30] Processed email.txt  
  3 replacements, 0 suggestions
  
^C
Stopped watching.
```

### Implementation Plan

1. **New module** (`src/lib/watcher.ts`):
   ```typescript
   import { watch } from 'fs';
   
   export interface WatchOptions {
     file: string;
     output?: string;
     level: StrictnessLevel;
     quiet?: boolean;
   }
   
   export function watchFile(options: WatchOptions): void;
   ```

2. **File watching**:
   - Use `fs.watch()` (cross-platform) or Bun's `Bun.file().watch()` if available
   - Debounce changes (300ms) to avoid multiple triggers on save
   - Track last content hash to avoid re-processing identical content

3. **Output modes**:
   - With `-o`: Write transformed text to output file
   - Without `-o`: Print to stdout with timestamp prefix
   - Clear previous output on each update (ANSI escape codes)

4. **CLI changes** (`speak-strong.ts`):
   - Add `--watch` flag to `CliOptions`
   - Require `--file` (can't watch stdin/message)
   - After initial process, enter watch loop

5. **Graceful shutdown**:
   - Listen for SIGINT (Ctrl+C)
   - Close file watcher
   - Print summary and exit

### Edge Cases
- File deleted while watching → warn and wait for recreation
- File moved → stop watching with error
- Binary file detected → skip processing with warning
- Large file → show "Processing..." indicator

---

## Phase 3: History with Undo

### Overview
Track all changes made by speak-strong. Allow viewing history and undoing changes.

### CLI Interface
```bash
# Show history
speak-strong --history
speak-strong --history --limit 10

# Undo last change
speak-strong --undo

# Undo specific change by ID
speak-strong --undo abc123

# Show diff for a specific change
speak-strong --show abc123
```

### Data Storage
Store in `~/.speak-strong/history.json`:
```json
{
  "version": 1,
  "entries": [
    {
      "id": "abc123",
      "timestamp": "2024-01-15T10:30:00Z",
      "inputFile": "/path/to/email.txt",
      "outputFile": "/path/to/email-strong.txt",
      "original": "I just wanted to...",
      "transformed": "I wanted to...",
      "level": "conservative",
      "replacements": 3,
      "suggestions": 1
    }
  ]
}
```

### Implementation Plan

1. **New types** (`src/types/index.ts`):
   ```typescript
   export interface HistoryEntry {
     id: string;
     timestamp: string;
     inputFile?: string;
     outputFile?: string;
     original: string;
     transformed: string;
     level: StrictnessLevel;
     replacementCount: number;
     suggestionCount: number;
   }
   
   export interface HistoryDatabase {
     version: number;
     entries: HistoryEntry[];
   }
   ```

2. **New module** (`src/lib/history.ts`):
   - `getHistoryPath(): string` - Returns ~/.speak-strong/history.json
   - `loadHistory(): HistoryDatabase` - Load or create history file
   - `saveEntry(entry: HistoryEntry): void` - Append to history
   - `getEntries(limit?: number): HistoryEntry[]` - Get recent entries
   - `getEntry(id: string): HistoryEntry | null` - Get by ID
   - `generateId(): string` - Short random ID (6 chars)

3. **Undo logic** (`src/lib/undo.ts`):
   - `undoEntry(entry: HistoryEntry): void` - Restore original content
   - For file output: overwrite with original
   - For stdout: can't undo (print original with instructions)

4. **CLI changes** (`speak-strong.ts`):
   - Add `--history`, `--undo`, `--show` flags
   - After successful processing, auto-save to history
   - History commands are standalone (don't require input)

5. **History limits**:
   - Max 100 entries (configurable via --history-limit)
   - Auto-prune old entries on save
   - Store text content inline (simple, no external files)

### Edge Cases
- First run (no history) → create ~/.speak-strong/
- Undo stdout output → "Cannot undo stdout. Original was: ..."
- File no longer exists → warn, mark entry as orphaned
- History file corrupted → backup and recreate

---

## Phase 4: VS Code Extension

### Overview
Real-time highlighting of weak phrases with quick-fix suggestions.

### Repository Structure
Create separate repo: `speak-strong-vscode`

```
speak-strong-vscode/
├── package.json          # Extension manifest
├── src/
│   ├── extension.ts      # Main entry point
│   ├── diagnostics.ts    # Underline weak phrases
│   ├── codeActions.ts    # Quick fixes
│   ├── rules.ts          # Shared rules (copy from speak-strong)
│   └── config.ts         # Extension settings
├── syntaxes/             # TextMate grammars (if needed)
└── test/                 # Extension tests
```

### Features

1. **Diagnostics (Underlines)**:
   - Yellow wavy underline for hedging/minimizing
   - Blue info underline for suggestions (aggressive level)
   - Severity configurable in settings

2. **Quick Fixes (Lightbulb)**:
   - "Replace with: [stronger phrase]"
   - "Ignore this phrase"
   - "Ignore in this file"

3. **Commands**:
   - `Speak Strong: Transform Selection`
   - `Speak Strong: Transform Document`
   - `Speak Strong: Show All Weak Phrases`

4. **Settings**:
   ```json
   {
     "speakStrong.level": "conservative",
     "speakStrong.enableOnSave": false,
     "speakStrong.languages": ["markdown", "plaintext", "latex"],
     "speakStrong.ignorePaths": ["**/node_modules/**"]
   }
   ```

### Implementation Plan

1. **Phase 4a**: Basic diagnostics
   - Register diagnostic collection
   - Parse document on open/change
   - Show underlines for matches

2. **Phase 4b**: Quick fixes
   - Register code action provider
   - Provide replacement actions
   - Implement ignore functionality

3. **Phase 4c**: Commands and settings
   - Add command palette entries
   - Implement settings reader
   - Add status bar indicator

4. **Phase 4d**: Polish
   - Performance optimization (debounce, incremental)
   - Multi-root workspace support
   - Telemetry (opt-in)

### Technology
- Language: TypeScript
- Bundler: esbuild
- Testing: @vscode/test-electron
- Publishing: vsce, Open VSX

---

## Implementation Order

| Phase | Feature | Complexity | Dependencies |
|-------|---------|------------|--------------|
| 1 | Interactive Mode | Medium | None |
| 2 | Watch Mode | Medium | None |
| 3 | History + Undo | Medium | None |
| 4 | VS Code Extension | High | Stable rules API |

### Recommended Approach
1. Start with **Interactive Mode** - it's self-contained and user-visible
2. Then **Watch Mode** - builds on file handling, natural companion to interactive
3. Then **History** - adds persistence layer, needed before complex workflows
4. Finally **VS Code Extension** - separate codebase, can reuse rules

---

## API Stability Notes

For the VS Code extension to share rules with the CLI:

1. **Option A**: Publish rules as npm package (`@speak-strong/rules`)
2. **Option B**: Copy rules into extension (simpler, some duplication)
3. **Option C**: Extension calls CLI as subprocess (heavy but always in sync)

Recommendation: Start with Option B, consider A when rules stabilize.
