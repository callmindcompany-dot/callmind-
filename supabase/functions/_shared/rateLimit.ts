const rateLimitMap = new Map<string, number[]>();
const MAX_KEYS = 10000;

/**
 * Lightweight sliding-window rate limiter for Deno Edge Functions.
 * Restricts client requests to max 30 requests/minute.
 * Uses a basic LRU strategy by re-inserting accessed keys.
 */
export function checkRateLimit(key: string, limit: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  
  // LRU Eviction: Delete oldest inserted if over limit
  if (rateLimitMap.size > MAX_KEYS) {
    const keys = Array.from(rateLimitMap.keys()).slice(0, Math.floor(MAX_KEYS * 0.2));
    keys.forEach(k => rateLimitMap.delete(k));
  }

  // Retrieve existing timestamps, remove them from Map to re-insert (LRU update)
  const timestamps = rateLimitMap.get(key) || [];
  if (rateLimitMap.has(key)) {
    rateLimitMap.delete(key);
  }
  
  // Filter out requests older than windowMs
  const recent = timestamps.filter(t => now - t < windowMs);
  recent.push(now);
  
  // Re-insert at end of insertion order
  rateLimitMap.set(key, recent);
  
  return recent.length <= limit;
}

/**
 * F-02-R FIX: Extract a stable, non-spoofable rate-limit key from the request.
 *
 * Priority order:
 *  1. Authorization header (JWT Bearer token) — best for authenticated endpoints.
 *     The full token is used as the key so different users on the same IP are
 *     tracked independently, and a user cannot spoof another's limit.
 *  2. A fixed sentinel "anonymous" — for truly unauthenticated public endpoints
 *     (e.g. webhook receivers). This groups all anonymous callers together,
 *     which is intentionally conservative for public-facing routes.
 *
 * NOTE: x-forwarded-for is intentionally NOT used because it is trivially
 * spoofable by any client and gives a false sense of per-IP limiting.
 */
export function getRateLimitKey(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    // Use the full token — unique per user session
    return authHeader;
  }
  // No auth header — public/webhook endpoint; group all anon callers
  return "anonymous";
}
