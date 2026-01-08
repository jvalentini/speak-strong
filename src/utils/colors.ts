/**
 * Color utilities for terminal output
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  strikethrough: '\x1b[9m',
};

function isColorEnabled(): boolean {
  return process.stderr.isTTY && process.env.NO_COLOR !== '1';
}

export function colorize(text: string, color: keyof typeof colors): string {
  if (isColorEnabled()) {
    return `${colors[color]}${text}${colors.reset}`;
  }
  return text;
}

export function bold(text: string): string {
  return colorize(text, 'bright');
}

export function dim(text: string): string {
  return colorize(text, 'dim');
}

export function green(text: string): string {
  return colorize(text, 'green');
}

export function red(text: string): string {
  return colorize(text, 'red');
}

export function yellow(text: string): string {
  return colorize(text, 'yellow');
}

export function blue(text: string): string {
  return colorize(text, 'blue');
}

export function cyan(text: string): string {
  return colorize(text, 'cyan');
}

export function magenta(text: string): string {
  return colorize(text, 'magenta');
}

export function strikethrough(text: string): string {
  if (isColorEnabled()) {
    return `${colors.strikethrough}${text}${colors.reset}`;
  }
  return text;
}

export function success(text: string): string {
  if (!isColorEnabled()) {
    return `+ ${text}`;
  }
  return `${colors.green}+${colors.reset} ${green(text)}`;
}

export function error(text: string): string {
  if (!isColorEnabled()) {
    return `x ${text}`;
  }
  return `${colors.red}x${colors.reset} ${red(text)}`;
}

export function warning(text: string): string {
  if (!isColorEnabled()) {
    return `! ${text}`;
  }
  return `${colors.yellow}!${colors.reset} ${yellow(text)}`;
}

export function info(text: string): string {
  if (!isColorEnabled()) {
    return `i ${text}`;
  }
  return `${colors.cyan}i${colors.reset} ${cyan(text)}`;
}
