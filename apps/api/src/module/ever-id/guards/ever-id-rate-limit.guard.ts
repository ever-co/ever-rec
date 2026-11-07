import { CanActivate, ExecutionContext, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { everIdHttpError } from '../ever-id.errors';

/** Requests per minute and client address on a rate-limited Ever ID route. */
export const EVER_ID_RATE_LIMIT_PER_MINUTE = 10;

const RATE_LIMITED = 'ever-id:rate-limited';
/** Buckets kept in memory at most; the oldest are dropped first. */
const MAX_BUCKETS = 10_000;

/** Marks a route as limited to {@link EVER_ID_RATE_LIMIT_PER_MINUTE} requests per minute and address. */
export const EverIdRateLimited = () => SetMetadata(RATE_LIMITED, true);

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/**
 * In-memory token bucket, keyed by route and client address.
 *
 * Scoped to the Ever ID controller; it adds no dependency and changes nothing for other routes.
 * Each API replica keeps its own buckets, so N replicas allow N times the limit, which is
 * acceptable for these routes. The address is the first `x-forwarded-for` hop when present (the
 * same rule the sign-up audit uses), else the socket address.
 */
@Injectable()
export class EverIdRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.reflector.get<boolean>(RATE_LIMITED, context.getHandler())) {
      return true;
    }
    const http = context.switchToHttp();
    const request = http.getRequest();
    const key = `${context.getHandler().name}|${this.clientAddress(request)}`;
    const retryAfter = this.take(key, this.now());
    if (retryAfter > 0) {
      http.getResponse()?.setHeader?.('Retry-After', String(retryAfter));
      throw everIdHttpError(HttpStatus.TOO_MANY_REQUESTS, 'rate_limited', 'Too many attempts. Please wait a minute.');
    }
    return true;
  }

  /** Takes one token; returns 0 when allowed, else the seconds until the next token. */
  take(key: string, now: number): number {
    const capacity = EVER_ID_RATE_LIMIT_PER_MINUTE;
    const refillPerMs = capacity / 60_000;
    const bucket = this.buckets.get(key) ?? { tokens: capacity, updatedAt: now };
    bucket.tokens = Math.min(capacity, bucket.tokens + (now - bucket.updatedAt) * refillPerMs);
    bucket.updatedAt = now;

    // Re-insert so the map stays ordered by last use, then drop the least recently used.
    this.buckets.delete(key);
    this.buckets.set(key, bucket);
    if (this.buckets.size > MAX_BUCKETS) {
      this.buckets.delete(this.buckets.keys().next().value);
    }

    if (bucket.tokens < 1) {
      return Math.max(1, Math.ceil((1 - bucket.tokens) / refillPerMs / 1000));
    }
    bucket.tokens -= 1;
    return 0;
  }

  protected now(): number {
    return Date.now();
  }

  private clientAddress(request: any): string {
    const forwarded = request?.headers?.['x-forwarded-for'];
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (typeof first === 'string' && first.trim()) {
      return first.split(',')[0].trim();
    }
    return request?.ip ?? request?.socket?.remoteAddress ?? 'unknown';
  }
}
