import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { consumeRateLimit, enforceRateLimit, RateLimitError } from '@/server/security/rate-limit';
import { formatErrorResponse } from '@/server/errors/app-error';

const rule = (limit: number) => ({ name: `test:${crypto.randomUUID()}`, limit, windowSeconds: 60 });

describe('Postgres-backed rate limiter', () => {
  it('allows up to the limit and then rejects', async () => {
    const r = rule(3);
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await consumeRateLimit(r, 'ip-1')).allowed);
    expect(results).toEqual([true, true, true, false, false]);
  });

  it('is exact under concurrent requests (no lost updates)', async () => {
    const r = rule(5);
    const results = await Promise.all(Array.from({ length: 20 }, () => consumeRateLimit(r, 'ip-2')));
    expect(results.filter((x) => x.allowed)).toHaveLength(5);
  });

  it('tracks identifiers independently', async () => {
    const r = rule(1);
    expect((await consumeRateLimit(r, 'a')).allowed).toBe(true);
    expect((await consumeRateLimit(r, 'b')).allowed).toBe(true);
    expect((await consumeRateLimit(r, 'a')).allowed).toBe(false);
  });

  it('maps to a 429 with Retry-After', async () => {
    const r = rule(0);
    const previous = process.env.RATE_LIMIT_DISABLED;
    process.env.RATE_LIMIT_DISABLED = 'false';
    try {
      const error = await enforceRateLimit(r, 'ip-3').catch((e) => e);
      expect(error).toBeInstanceOf(RateLimitError);
      const res = formatErrorResponse(error, 'req_test');
      expect(res.status).toBe(429);
      expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
      expect((await res.json()).error.code).toBe('RATE_LIMITED');
    } finally {
      process.env.RATE_LIMIT_DISABLED = previous;
    }
  });
});
