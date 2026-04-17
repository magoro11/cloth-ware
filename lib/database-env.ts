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

let hasWarnedAboutDatabaseEnv = false;

function firstDefined(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }

  return undefined;
}

function parseProjectRef(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;

  try {
    const { hostname } = new URL(supabaseUrl);
    return hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function parseConnectionDetails(rawUrl: string | undefined): { hostname: string; username: string } | null {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    return {
      hostname: parsed.hostname,
      username: decodeURIComponent(parsed.username),
    };
  } catch {
    return null;
  }
}

function validateDatabaseEnv(): void {
  if (hasWarnedAboutDatabaseEnv) return;

  const projectRef = parseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const problems: string[] = [];

  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const rawUrl = process.env[key];
    if (!rawUrl) continue;

    const parsed = parseConnectionDetails(rawUrl);
    if (!parsed) {
      problems.push(`${key} is not a valid URL.`);
      continue;
    }

    const isSupabasePooler = parsed.hostname.endsWith(".pooler.supabase.com");
    if (key === "DIRECT_URL" && isSupabasePooler) {
      problems.push("DIRECT_URL is using a Supabase pooler host. Use the direct database host for migrations and direct Prisma access.");
    }

    if (projectRef && parsed.username && !parsed.username.includes(projectRef)) {
      problems.push(`${key} username does not match the current Supabase project ref ${projectRef}.`);
    }
  }

  if (problems.length > 0) {
    hasWarnedAboutDatabaseEnv = true;
    console.warn(`Database environment warning: ${problems.join(" ")}`);
  }
}

export function normalizeDatabaseEnv(): void {
  process.env.DATABASE_URL ??= firstDefined(databaseUrlFallbacks);
  process.env.DIRECT_URL ??= firstDefined(directUrlFallbacks);
  validateDatabaseEnv();
}
