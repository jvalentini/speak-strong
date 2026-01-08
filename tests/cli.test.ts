import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const TEST_DIR = join(import.meta.dir, 'fixtures');
const CLI_PATH = join(import.meta.dir, '../speak-strong.ts');

beforeAll(() => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
});

afterAll(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
});

async function runCli(
  args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await $`bun ${CLI_PATH} ${args}`.quiet();
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: result.exitCode,
    };
  } catch (error: unknown) {
    const shellError = error as { stdout: Buffer; stderr: Buffer; exitCode: number };
    return {
      stdout: shellError.stdout?.toString() || '',
      stderr: shellError.stderr?.toString() || '',
      exitCode: shellError.exitCode || 1,
    };
  }
}

describe('CLI - Help and Version', () => {
  test('shows help with --help', async () => {
    const result = await runCli(['--help']);
    expect(result.stdout).toContain('speak-strong');
    expect(result.stdout).toContain('USAGE');
    expect(result.stdout).toContain('--file');
    expect(result.stdout).toContain('--message');
    expect(result.exitCode).toBe(0);
  });

  test('shows help with -h', async () => {
    const result = await runCli(['-h']);
    expect(result.stdout).toContain('speak-strong');
    expect(result.exitCode).toBe(0);
  });

  test('shows version with --version', async () => {
    const result = await runCli(['--version']);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(result.exitCode).toBe(0);
  });

  test('shows help when no arguments provided', async () => {
    const result = await runCli([]);
    expect(result.stdout).toContain('USAGE');
    expect(result.exitCode).toBe(0);
  });
});

describe('CLI - Message Input', () => {
  test('processes message with -m flag', async () => {
    const result = await runCli(['-m', 'I think we should try this']);
    expect(result.stdout).toContain('We should try this');
    expect(result.exitCode).toBe(0);
  });

  test('processes message with --message flag', async () => {
    const result = await runCli(['--message', 'I just wanted to check in']);
    expect(result.stdout).toContain('I wanted to check in');
    expect(result.exitCode).toBe(0);
  });

  test('shows replacements in output', async () => {
    const result = await runCli(['-m', 'I think we should try']);
    expect(result.stdout).toContain('Replacements');
    expect(result.stdout).toContain('hedging');
  });

  test('shows stats in stderr', async () => {
    const result = await runCli(['-m', 'I think we should try']);
    expect(result.stderr).toContain('Stats');
    expect(result.stderr).toContain('replaced');
  });

  test('handles text with no weak language', async () => {
    const result = await runCli(['-m', 'This is a clear statement.']);
    expect(result.stdout).toContain('This is a clear statement.');
    expect(result.stderr).toContain('No weak language detected');
  });
});

describe('CLI - File Input', () => {
  test('processes file with -f flag', async () => {
    const inputFile = join(TEST_DIR, 'input.txt');
    writeFileSync(inputFile, 'I think we should proceed with the plan.');
    const result = await runCli(['-f', inputFile]);
    expect(result.stdout).toContain('We should proceed with the plan.');
    expect(result.exitCode).toBe(0);
  });

  test('processes file with --file flag', async () => {
    const inputFile = join(TEST_DIR, 'input2.txt');
    writeFileSync(inputFile, 'Sorry to bother you, but I have a question.');
    const result = await runCli(['--file', inputFile]);
    expect(result.stdout).toContain('Excuse me');
    expect(result.exitCode).toBe(0);
  });

  test('fails gracefully for non-existent file', async () => {
    const result = await runCli(['-f', '/nonexistent/file.txt']);
    expect(result.stderr).toContain('File not found');
    expect(result.exitCode).toBe(2);
  });
});

describe('CLI - File Output', () => {
  test('writes output to file with -o flag', async () => {
    const outputFile = join(TEST_DIR, 'output.txt');
    const result = await runCli(['-m', 'I think we should try', '-o', outputFile]);
    expect(result.exitCode).toBe(0);
    expect(existsSync(outputFile)).toBe(true);

    const content = await Bun.file(outputFile).text();
    expect(content).toBe('We should try');
  });

  test('writes output to file with --output flag', async () => {
    const outputFile = join(TEST_DIR, 'output2.txt');
    const result = await runCli(['--message', 'I just wanted to ask', '--output', outputFile]);
    expect(result.exitCode).toBe(0);

    const content = await Bun.file(outputFile).text();
    expect(content).toBe('I wanted to ask');
  });

  test('shows diff in stderr when writing to file', async () => {
    const outputFile = join(TEST_DIR, 'output3.txt');
    const result = await runCli(['-m', 'I think this is good', '-o', outputFile]);
    expect(result.stderr).toContain('Replacements');
    expect(result.stderr).toContain('Output written to');
  });
});

describe('CLI - Strictness Levels', () => {
  test('uses conservative level by default', async () => {
    const result = await runCli(['-m', 'I think we should try kind of hard']);
    expect(result.stdout).toContain('kind of');
  });

  test('moderate level removes additional patterns', async () => {
    const result = await runCli(['-m', 'I think this is kind of important', '--moderate']);
    expect(result.stdout).toContain('This is important');
    expect(result.transformed || result.stdout).not.toMatch(/kind of important/);
  });

  test('aggressive level adds suggestions', async () => {
    const result = await runCli(['-m', 'In my opinion, this is good', '--aggressive']);
    expect(result.stdout).toContain('Suggestions');
    expect(result.stdout).toContain('In my opinion');
  });
});

describe('CLI - Verbosity Options', () => {
  test('verbose mode shows additional info', async () => {
    const result = await runCli(['-m', 'I think we should try', '--verbose']);
    expect(result.stderr).toContain('speak-strong');
    expect(result.stderr).toContain('Processing');
    expect(result.stderr).toContain('strictness level');
  });

  test('quiet mode suppresses stats', async () => {
    const result = await runCli(['-m', 'I think we should try', '--quiet']);
    expect(result.stderr).not.toContain('Stats');
    expect(result.stdout).toContain('We should try');
  });

  test('quiet mode still shows replacements in stdout', async () => {
    const result = await runCli(['-m', 'I think we should try', '-q']);
    expect(result.stdout).toContain('We should try');
  });
});

describe('CLI - Error Handling', () => {
  test('fails when both file and message provided', async () => {
    const inputFile = join(TEST_DIR, 'dummy.txt');
    writeFileSync(inputFile, 'test');
    const result = await runCli(['-f', inputFile, '-m', 'test message']);
    expect(result.stderr).toContain('Cannot use both');
    expect(result.exitCode).toBe(1);
  });

  test('fails when neither file nor message provided with other flags', async () => {
    const result = await runCli(['--verbose']);
    expect(result.stderr).toContain('Either --file or --message is required');
    expect(result.exitCode).toBe(1);
  });

  test('fails when both moderate and aggressive provided', async () => {
    const result = await runCli(['-m', 'test', '--moderate', '--aggressive']);
    expect(result.stderr).toContain('Cannot use both');
    expect(result.exitCode).toBe(1);
  });

  test('fails for unknown option', async () => {
    const result = await runCli(['--unknown-option']);
    expect(result.stderr).toContain('Unknown option');
    expect(result.exitCode).toBe(1);
  });
});

describe('CLI - Real-world Examples', () => {
  test('transforms a typical email', async () => {
    const email = `Hi Team,

I just wanted to follow up on our conversation. I think we should maybe consider a different approach. I'm sorry, but I disagree with the timeline.

Sorry to bother you, but does that make sense?

Best,
John`;

    const inputFile = join(TEST_DIR, 'email.txt');
    writeFileSync(inputFile, email);
    const result = await runCli(['-f', inputFile]);

    expect(result.stdout).toContain('I wanted to follow up');
    expect(result.stdout).toContain('We should maybe consider');
    expect(result.stdout).toContain('I disagree with the timeline');
    expect(result.stdout).toContain('Excuse me');
    expect(result.exitCode).toBe(0);
  });

  test('transforms meeting notes', async () => {
    const notes = `Meeting Notes:
- I feel like we need more resources
- Maybe we should hire another developer
- I'll try to get the budget approved`;

    const inputFile = join(TEST_DIR, 'notes.txt');
    writeFileSync(inputFile, notes);
    const result = await runCli(['-f', inputFile]);

    expect(result.stdout).toContain('I believe we need more resources');
    expect(result.stdout).toContain('We should hire another developer');
    expect(result.stdout).toContain('I will get the budget approved');
    expect(result.exitCode).toBe(0);
  });

  test('transforms a Slack message', async () => {
    const message =
      "Hey, I'm not sure, but I think the deployment might have caused some issues. Just a quick heads up!";
    const result = await runCli(['-m', message]);

    expect(result.stdout).toContain('I believe the deployment');
    expect(result.stdout).toContain('A quick heads up');
    expect(result.exitCode).toBe(0);
  });
});
