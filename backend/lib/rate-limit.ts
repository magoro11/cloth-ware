type Window = { count: number; resetAt: number };

const stores = new Map<string, Window>();

// Fixed-window in-memory rate limiter. Note: in a multi-instance/serverless
// deployment this is per-instance; swap in Upstash/Redis for production.
export function rateLimit(
  identifier: string,
  options: { limit: number; windowMs: number },
): { success: boolean; remaining: number; resetAt: number } {
  const { limit, windowMs } = options;
  const now = Date.now();
  const entry = stores.get(identifier);

  if (!entry || now >= entry.resetAt) {
    stores.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: Math.max(0, limit - 1), resetAt: now + windowMs };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  return { success: entry.count <= limit, remaining, resetAt: entry.resetAt };
}
