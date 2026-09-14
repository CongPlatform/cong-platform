import type { NextFunction, Request, Response } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastCleanup = 0;

function cleanup(now: number) {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function communityRateLimit(options: {
  name: string;
  windowMs: number;
  max: number;
}) {
  return function rateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const now = Date.now();
    cleanup(now);
    const authUserId = res.locals.authUser?.id;
    const actor = authUserId || req.ip || "anonymous";
    const key = `${options.name}:${actor}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (current.count >= options.max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error:
          "Muitas ações em pouco tempo. Aguarde um pouco e tente novamente.",
        code: "COMMUNITY_RATE_LIMITED",
        retryAfter,
      });
      return;
    }

    current.count += 1;
    next();
  };
}

export const communitySearchRateLimit = communityRateLimit({
  name: "community-search",
  windowMs: 60_000,
  max: 40,
});

export const communityWriteRateLimit = communityRateLimit({
  name: "community-write",
  windowMs: 60_000,
  max: 24,
});

export const communityHeavyWriteRateLimit = communityRateLimit({
  name: "community-heavy-write",
  windowMs: 10 * 60_000,
  max: 12,
});

export const communityReportRateLimit = communityRateLimit({
  name: "community-report",
  windowMs: 60 * 60_000,
  max: 8,
});

export const communityInteractionRateLimit = communityRateLimit({
  name: "community-interaction",
  windowMs: 60_000,
  max: 60,
});
