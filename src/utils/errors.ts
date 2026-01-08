/**
 * Custom error classes for speak-strong
 */

/**
 * Error for file not found
 */
export class FileNotFoundError extends Error {
  constructor(public readonly filepath: string) {
    super(`File not found: ${filepath}`);
    this.name = 'FileNotFoundError';
  }
}

/**
 * Error for file read operations
 */
export class FileReadError extends Error {
  constructor(
    public readonly filepath: string,
    public readonly originalError: unknown
  ) {
    const message = originalError instanceof Error ? originalError.message : String(originalError);
    super(`Failed to read file ${filepath}: ${message}`);
    this.name = 'FileReadError';
  }
}

/**
 * Error for file write operations
 */
export class FileWriteError extends Error {
  constructor(
    public readonly filepath: string,
    public readonly originalError: unknown
  ) {
    const message = originalError instanceof Error ? originalError.message : String(originalError);
    super(`Failed to write file ${filepath}: ${message}`);
    this.name = 'FileWriteError';
  }
}

/**
 * Error for invalid rules configuration
 */
export class RulesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RulesError';
  }
}

/**
 * Error for CLI argument validation
 */
export class ArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArgumentError';
  }
}
