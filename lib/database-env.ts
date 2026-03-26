const databaseUrlFallbacks = [
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
];

const directUrlFallbacks = [
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
];

function firstDefined(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }

  return undefined;
}

export function normalizeDatabaseEnv(): void {
  process.env.DATABASE_URL ??= firstDefined(databaseUrlFallbacks);
  process.env.DIRECT_URL ??= firstDefined(directUrlFallbacks);
}
