/**
 * Logger utility for consistent logging to stderr
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  VERBOSE = 3,
  DEBUG = 4,
}

export interface LoggerOptions {
  quiet?: boolean;
  verbose?: boolean;
  debug?: boolean;
}

export class Logger {
  private static quiet = false;
  private static level: LogLevel = LogLevel.INFO;

  static configure(options: LoggerOptions): void {
    Logger.quiet = options.quiet ?? false;
    if (options.debug) {
      Logger.level = LogLevel.DEBUG;
    } else if (options.verbose) {
      Logger.level = LogLevel.VERBOSE;
    } else {
      Logger.level = LogLevel.INFO;
    }
  }

  static error(message: string, ...args: unknown[]): void {
    if (!Logger.quiet && Logger.level >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: unknown[]): void {
    if (!Logger.quiet && Logger.level >= LogLevel.WARN) {
      console.error(`[WARN] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: unknown[]): void {
    if (!Logger.quiet && Logger.level >= LogLevel.INFO) {
      console.error(message, ...args);
    }
  }

  static verbose(message: string, ...args: unknown[]): void {
    if (!Logger.quiet && Logger.level >= LogLevel.VERBOSE) {
      console.error(`[VERBOSE] ${message}`, ...args);
    }
  }

  static debug(message: string, ...args: unknown[]): void {
    if (!Logger.quiet && Logger.level >= LogLevel.DEBUG) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }

  static log(message: string): void {
    if (!Logger.quiet && Logger.level >= LogLevel.INFO) {
      console.error(message);
    }
  }
}
