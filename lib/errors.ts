type MaybeError = {
  code?: string;
  name?: string;
  message?: string;
};

function getErrorMessage(error: unknown): string {
  const e = (error || {}) as MaybeError;
  return e.message || "";
}

export function databaseIssue(error: unknown): "missing_database_url" | "database_unreachable" | null {
  const e = (error || {}) as MaybeError;
  const message = getErrorMessage(error);

  if (message.includes("Environment variable not found: DATABASE_URL")) {
    return "missing_database_url";
  }

  if (
    e.code === "P1001" ||
    e.code === "P1017" ||
    e.name === "PrismaClientInitializationError" ||
    message.includes("Can't reach database server") ||
    message.includes("forcibly closed by the remote host") ||
    message.includes("ConnectionReset")
  ) {
    return "database_unreachable";
  }

  return null;
}

export function isDatabaseUnavailable(error: unknown): boolean {
  return databaseIssue(error) !== null;
}

export function databaseErrorMessage(error: unknown): string {
  const issue = databaseIssue(error);

  if (issue === "missing_database_url") {
    return "DATABASE_URL is not configured in the runtime environment.";
  }

  if (issue === "database_unreachable") {
    return "The database is configured but could not be reached from the app.";
  }

  return "Database is currently unavailable.";
}

export function logDatabaseIssue(context: string, error: unknown): void {
  const message = getErrorMessage(error);

  if (isDatabaseUnavailable(error)) {
    console.warn(`${context}: ${databaseErrorMessage(error)}${message ? ` (${message})` : ""}`);
    return;
  }

  console.error(context, error);
}

export function errorStatus(error: unknown, fallback: number): number {
  return isDatabaseUnavailable(error) ? 503 : fallback;
}
