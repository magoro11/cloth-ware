type MaybeError = {
  code?: string;
  name?: string;
  message?: string;
};

export function isDatabaseUnavailable(error: unknown): boolean {
  const e = (error || {}) as MaybeError;
  const message = e.message || "";

  return (
    e.code === "P1001" ||
    e.name === "PrismaClientInitializationError" ||
    message.includes("Can't reach database server") ||
    message.includes("Environment variable not found: DATABASE_URL")
  );
}

export function errorStatus(error: unknown, fallback: number): number {
  return isDatabaseUnavailable(error) ? 503 : fallback;
}
