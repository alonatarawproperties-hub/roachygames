type RateBucket = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateBucket>();
const dedupeKeys = new Map<string, number>(); // key -> expiresAt

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000; // 1 minute

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
  for (const [key, expiresAt] of dedupeKeys) {
    if (expiresAt <= now) dedupeKeys.delete(key);
  }
}

export function rateLimit(opts: {
  route: string;
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; retryInSec: number } {
  cleanup();

  const now = Date.now();
  const bucketKey = `${opts.route}:${opts.key}`;
  let bucket = rateBuckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + opts.windowMs };
    rateBuckets.set(bucketKey, bucket);
  }

  bucket.count++;

  if (bucket.count > opts.limit) {
    const retryInSec = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryInSec: Math.max(1, retryInSec) };
  }

  return { allowed: true, retryInSec: 0 };
}

export function markKey(routeKey: string, ttlMs: number): boolean {
  cleanup();

  const now = Date.now();
  const existing = dedupeKeys.get(routeKey);

  if (existing && existing > now) {
    return true; // already exists, not expired
  }

  dedupeKeys.set(routeKey, now + ttlMs);
  return false; // first time, marked now
}

export function normalizeIp(req: { headers?: Record<string, any>; ip?: string }): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim() || "unknown";
  }
  return req.ip || "unknown";
}
