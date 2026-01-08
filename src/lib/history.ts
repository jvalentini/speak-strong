import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type {
  HistoryDatabase,
  HistoryEntry,
  ProcessResult,
  StrictnessLevel,
} from '../types/index.js';
import { bold, cyan, dim, green, red, yellow } from '../utils/colors.js';
import { getConfig } from '../utils/config.js';
import { writeTextFile } from '../utils/file.js';

function getHistoryDir(): string {
  const config = getConfig();
  return config.history.historyDir || join(homedir(), '.speak-strong');
}

function getHistoryFile(): string {
  return join(getHistoryDir(), 'history.json');
}

function getMaxEntries(): number {
  return getConfig().history.maxEntries;
}

const CURRENT_VERSION = 1;

function generateId(): string {
  return Math.random().toString(36).substring(2, 8);
}

function ensureHistoryDir(): void {
  const historyDir = getHistoryDir();
  if (!existsSync(historyDir)) {
    mkdirSync(historyDir, { recursive: true });
  }
}

export function loadHistory(): HistoryDatabase {
  ensureHistoryDir();
  const historyFile = getHistoryFile();

  if (!existsSync(historyFile)) {
    return { version: CURRENT_VERSION, entries: [] };
  }

  try {
    const content = readFileSync(historyFile, 'utf-8');
    const db = JSON.parse(content) as HistoryDatabase;
    return db;
  } catch {
    const backupPath = `${historyFile}.backup`;
    if (existsSync(historyFile)) {
      writeFileSync(backupPath, readFileSync(historyFile));
      console.error(yellow(`History file corrupted. Backed up to ${backupPath}`));
    }
    return { version: CURRENT_VERSION, entries: [] };
  }
}

function saveHistory(db: HistoryDatabase): void {
  ensureHistoryDir();
  const historyFile = getHistoryFile();
  writeFileSync(historyFile, JSON.stringify(db, null, 2));
}

export function saveEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
  const db = loadHistory();
  const maxEntries = getMaxEntries();

  const fullEntry: HistoryEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  db.entries.unshift(fullEntry);

  if (db.entries.length > maxEntries) {
    db.entries = db.entries.slice(0, maxEntries);
  }

  saveHistory(db);
  return fullEntry;
}

export function getEntries(limit?: number): HistoryEntry[] {
  const db = loadHistory();
  if (limit && limit > 0) {
    return db.entries.slice(0, limit);
  }
  return db.entries;
}

export function getEntry(id: string): HistoryEntry | null {
  const db = loadHistory();
  return db.entries.find((e) => e.id === id) || null;
}

export function getLatestEntry(): HistoryEntry | null {
  const db = loadHistory();
  return db.entries[0] || null;
}

export function createEntryFromResult(
  result: ProcessResult,
  level: StrictnessLevel,
  options: { inputFile?: string; inputMessage?: string; outputFile?: string }
): Omit<HistoryEntry, 'id' | 'timestamp'> {
  return {
    inputFile: options.inputFile,
    inputMessage: options.inputMessage,
    outputFile: options.outputFile,
    original: result.original,
    transformed: result.transformed,
    level,
    replacementCount: result.replacements.length,
    suggestionCount: result.suggestions.length,
  };
}

export function formatHistoryList(entries: HistoryEntry[]): string {
  if (entries.length === 0) {
    return dim('No history entries found.');
  }

  const lines: string[] = [];
  lines.push(bold('Recent transformations:\n'));

  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    const timeStr = date.toLocaleString();
    const source = entry.inputFile || '(message)';
    const stats = `${entry.replacementCount} replacement${entry.replacementCount === 1 ? '' : 's'}`;

    lines.push(`  ${cyan(entry.id)}  ${dim(timeStr)}`);
    lines.push(`    ${source} → ${stats}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function formatEntryDetails(entry: HistoryEntry): string {
  const lines: string[] = [];
  const date = new Date(entry.timestamp);

  lines.push(bold(`Entry: ${entry.id}\n`));
  lines.push(`  ${dim('Date:')} ${date.toLocaleString()}`);
  lines.push(`  ${dim('Level:')} ${entry.level}`);

  if (entry.inputFile) {
    lines.push(`  ${dim('Input file:')} ${entry.inputFile}`);
  }
  if (entry.outputFile) {
    lines.push(`  ${dim('Output file:')} ${entry.outputFile}`);
  }

  lines.push(`  ${dim('Replacements:')} ${entry.replacementCount}`);
  lines.push(`  ${dim('Suggestions:')} ${entry.suggestionCount}`);
  lines.push('');
  lines.push(bold(red('── Original ──────────────────────────────────────')));
  lines.push(entry.original);
  lines.push('');
  lines.push(bold(green('── Transformed ───────────────────────────────────')));
  lines.push(entry.transformed);

  return lines.join('\n');
}

export function undoEntry(entry: HistoryEntry): { success: boolean; message: string } {
  if (!entry.outputFile) {
    return {
      success: false,
      message: `Cannot undo: output was to stdout.\n\nOriginal text was:\n${dim('─'.repeat(50))}\n${entry.original}`,
    };
  }

  if (!existsSync(entry.outputFile)) {
    return {
      success: false,
      message: `Cannot undo: output file no longer exists: ${entry.outputFile}`,
    };
  }

  try {
    writeTextFile(entry.outputFile, entry.original);
    return {
      success: true,
      message: `Restored original content to ${entry.outputFile}`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Failed to restore file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
