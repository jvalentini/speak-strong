import { z } from 'zod';

export const RuleEntrySchema = z.object({
  pattern: z.string().min(1, 'Pattern cannot be empty'),
  replacement: z.string().optional(),
  category: z.string().min(1, 'Category cannot be empty'),
  suggestion: z.string().optional(),
  restructure: z.boolean().optional(),
});

export const RulesDatabaseSchema = z.object({
  version: z.string().min(1, 'Version is required'),
  conservative: z.array(RuleEntrySchema),
  moderate: z.array(RuleEntrySchema),
  aggressive: z.array(RuleEntrySchema),
});

export const AppConfigSchema = z.object({
  history: z.object({
    maxEntries: z.number().int().positive().default(100),
    historyDir: z.string().optional(),
  }),
  watcher: z.object({
    debounceMs: z.number().int().positive().default(300),
  }),
  rules: z.object({
    cacheEnabled: z.boolean().default(true),
  }),
});

export type RuleEntry = z.infer<typeof RuleEntrySchema>;
export type RulesDatabase = z.infer<typeof RulesDatabaseSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;

export function validateRulesDatabase(data: unknown): RulesDatabase {
  return RulesDatabaseSchema.parse(data);
}

export function validateAppConfig(data: unknown): AppConfig {
  return AppConfigSchema.parse(data);
}

export function formatValidationErrors(error: z.ZodError): string {
  return error.issues
    .map((e) => {
      const path = e.path.join('.');
      return path ? `${path}: ${e.message}` : e.message;
    })
    .join('\n');
}
