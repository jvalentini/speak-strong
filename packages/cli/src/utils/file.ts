/**
 * File I/O utilities with proper error handling
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { FileNotFoundError, FileReadError, FileWriteError } from './errors.js';

/**
 * Check if a file exists
 */
export function fileExists(filepath: string): boolean {
  return existsSync(filepath);
}

/**
 * Read a text file with proper error handling
 * @throws {FileNotFoundError} If file doesn't exist
 * @throws {FileReadError} If file read fails
 */
export function readTextFile(filepath: string): string {
  if (!existsSync(filepath)) {
    throw new FileNotFoundError(filepath);
  }

  try {
    return readFileSync(filepath, 'utf8');
  } catch (err) {
    throw new FileReadError(filepath, err);
  }
}

/**
 * Ensure directory exists for a file path
 */
export function ensureDirectoryExists(filepath: string): void {
  const dir = dirname(filepath);
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Write a text file with proper error handling
 * Automatically creates directory if it doesn't exist
 * @throws {FileWriteError} If file write fails
 */
export function writeTextFile(filepath: string, content: string): void {
  try {
    ensureDirectoryExists(filepath);
    writeFileSync(filepath, content, 'utf8');
  } catch (err) {
    throw new FileWriteError(filepath, err);
  }
}

/**
 * Load and parse a JSON file
 * @throws {FileNotFoundError} If file doesn't exist
 * @throws {FileReadError} If file read or parse fails
 */
export function loadJson<T>(filepath: string): T {
  const content = readTextFile(filepath);
  try {
    return JSON.parse(content) as T;
  } catch (err) {
    throw new FileReadError(filepath, err);
  }
}
