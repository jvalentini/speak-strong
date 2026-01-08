import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type AppConfig, AppConfigSchema } from './schemas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../data/config.json');

let cachedConfig: AppConfig | null = null;

const DEFAULT_CONFIG: AppConfig = {
  history: {
    maxEntries: 100,
  },
  watcher: {
    debounceMs: 300,
  },
  rules: {
    cacheEnabled: true,
  },
};

export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    const rawConfig = JSON.parse(content);
    const result = AppConfigSchema.safeParse(rawConfig);

    if (result.success) {
      cachedConfig = result.data;
      return cachedConfig;
    }

    cachedConfig = DEFAULT_CONFIG;
    return cachedConfig;
  } catch {
    cachedConfig = DEFAULT_CONFIG;
    return cachedConfig;
  }
}

export function clearConfigCache(): void {
  cachedConfig = null;
}

export type { AppConfig };
