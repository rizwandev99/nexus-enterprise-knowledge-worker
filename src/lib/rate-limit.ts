// src/lib/rate-limit.ts
//
// Sliding window rate limiter — in-memory, resets on cold start.
// Sufficient for portfolio/demo environments.
// Swap the `store` Map for an Upstash Redis client in production to get
// distributed, persistent rate-limiting across serverless replicas.

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// ── Window configuration ──────────────────────────────────────────────────────
const WINDOW_MS = 60 * 1000; // 1-minute sliding window

/**
 * Check whether the given `identifier` (typically a client IP) is within its
 * rate-limit quota for the current window.
 *
 * @param identifier  - Unique key for the requester (IP address, API key, …).
 * @param maxRequests - Maximum allowed calls per window for this endpoint.
 * @returns           - `{ allowed, remaining, resetAt }` — never throws.
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = store.get(identifier);

  // ── No existing entry, or window has fully expired → start a fresh window ──
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(identifier, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + WINDOW_MS,
    };
  }

  // ── Quota exhausted for the current window ────────────────────────────────
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + WINDOW_MS,
    };
  }

  // ── Within quota — increment and continue ────────────────────────────────
  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.windowStart + WINDOW_MS,
  };
}

// ── Stale-entry janitor (runs every 5 minutes) ───────────────────────────────
// Prevents unbounded Map growth in long-running Node.js processes.
// Uses a 2x window multiplier so legitimate sliding windows are never evicted
// while they are still active.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);
