// In-memory rate limiting designed for Hostinger Shared environments
// Prevents spam requests and memory bloat by strictly limiting the map size.

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitInfo>();
const MAX_TRACKED_IPS = 1000; // Hard limit on the map size to protect RAM

export function isRateLimited(ip: string, limit: number = 60, windowMs: number = 60000): { limited: boolean; count: number; reset: number } {
  const now = Date.now();
  
  // Security protection against map storage growth (RAM OOM Prevention)
  if (rateLimitMap.size > MAX_TRACKED_IPS) {
    // Immediate pruning of expired records to save memory
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetTime) {
        rateLimitMap.delete(key);
      }
    }
    
    // Fallback if still too large, flush everything (safe self-healing)
    if (rateLimitMap.size > MAX_TRACKED_IPS) {
      rateLimitMap.clear();
    }
  }

  const record = rateLimitMap.get(ip);

  if (!record) {
    const info: RateLimitInfo = { count: 1, resetTime: now + windowMs };
    rateLimitMap.set(ip, info);
    return { limited: false, count: 1, reset: info.resetTime };
  }

  if (now > record.resetTime) {
    // Window expired, reset
    record.count = 1;
    record.resetTime = now + windowMs;
    return { limited: false, count: 1, reset: record.resetTime };
  }

  record.count += 1;
  
  if (record.count > limit) {
    return { limited: true, count: record.count, reset: record.resetTime };
  }

  return { limited: false, count: record.count, reset: record.resetTime };
}
