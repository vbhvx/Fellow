import { NextRequest } from 'next/server';
import { pool } from '@/db/client';
import { AppError } from '@/server/errors/app-error';

export interface RateLimitRule {
  /** Namespaces the counter, e.g. 'login:ip'. */
  name: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export class RateLimitError extends AppError {
  constructor(public readonly retryAfterSeconds: number) {
    super('Too many requests. Please try again later.', 'RATE_LIMITED', 429, { retryAfterSeconds });
  }
}

/**
 * Fixed-window counter in Postgres. One atomic upsert per check, so it is correct across any
 * number of app instances without extra infrastructure. Swap for Redis if auth traffic ever
 * dominates database load.
 */
export async function consumeRateLimit(rule: RateLimitRule, identifier: string): Promise<RateLimitResult> {
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const resetAt = new Date(windowStart.getTime() + windowMs);

  const { rows } = await pool.query<{ count: number }>(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, $2, 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
     RETURNING count`,
    [`${rule.name}:${identifier}`, windowStart]
  );

  const count = rows[0].count;
  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(rule.limit - count, 0),
    resetAt,
  };
}

export async function enforceRateLimit(rule: RateLimitRule, identifier: string): Promise<void> {
  if (process.env.RATE_LIMIT_DISABLED === 'true') return;
  const result = await consumeRateLimit(rule, identifier);
  if (!result.allowed) {
    throw new RateLimitError(Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)));
  }
}

/** Removes expired windows. Called periodically by the worker. */
export async function pruneRateLimits(): Promise<number> {
  const { rowCount } = await pool.query(`DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day'`);
  return rowCount ?? 0;
}

// Behind Vercel / a load balancer the client address is the first x-forwarded-for hop.
export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? req.ip ?? 'unknown';
}

export const RATE_LIMITS = {
  loginPerIp: { name: 'login:ip', limit: 20, windowSeconds: 60 },
  // Slows targeted credential stuffing against a single account from rotating IPs.
  loginPerAccount: { name: 'login:account', limit: 10, windowSeconds: 15 * 60 },
  registerPerIp: { name: 'register:ip', limit: 5, windowSeconds: 60 * 60 },
  invitationAcceptPerIp: { name: 'invite-accept:ip', limit: 20, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;
