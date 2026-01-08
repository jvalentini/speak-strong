import { beforeEach, describe, expect, test } from 'bun:test';
import { clearConfigCache, getConfig } from '../src/utils/config.js';

describe('getConfig', () => {
  beforeEach(() => {
    clearConfigCache();
  });

  test('returns default config values', () => {
    const config = getConfig();
    expect(config.history.maxEntries).toBe(100);
    expect(config.watcher.debounceMs).toBe(300);
    expect(config.rules.cacheEnabled).toBe(true);
  });

  test('returns cached config on subsequent calls', () => {
    const config1 = getConfig();
    const config2 = getConfig();
    expect(config1).toBe(config2);
  });

  test('clearConfigCache resets the cache', () => {
    const config1 = getConfig();
    clearConfigCache();
    const config2 = getConfig();
    expect(config1).not.toBe(config2);
    expect(config1).toEqual(config2);
  });
});
