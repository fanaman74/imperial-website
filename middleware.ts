import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Simple in-memory rate limiter for API routes.
 * Note: In serverless deployments, each instance has its own memory.
 * For production, consider Upstash Redis or a similar distributed store.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 60 seconds)
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetTime) rateLimitMap.delete(key);
  }
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Stricter limits for sensitive endpoints
const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/otp/send': { windowMs: 60_000, maxRequests: 3 },        // 3 per minute
  '/api/otp/verify': { windowMs: 60_000, maxRequests: 10 },      // 10 per minute
  '/api/admin/login': { windowMs: 60_000, maxRequests: 5 },      // 5 per minute
  '/api/reservation': { windowMs: 60_000, maxRequests: 5 },      // 5 per minute
  '/api/event-contact': { windowMs: 60_000, maxRequests: 5 },    // 5 per minute
};

// General limit for all other API routes
const DEFAULT_LIMIT: RateLimitConfig = { windowMs: 60_000, maxRequests: 30 };

function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return ip;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Refresh Supabase Auth session on every request so tokens don't expire
  let response = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: req.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.getUser();

  // Only rate-limit API routes
  if (!pathname.startsWith('/api/')) {
    return response;
  }

  const config = ROUTE_LIMITS[pathname] || DEFAULT_LIMIT;
  const clientKey = getClientKey(req);
  const limitKey = `${pathname}:${clientKey}`;

  cleanup();

  const now = Date.now();
  const entry = rateLimitMap.get(limitKey);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(limitKey, { count: 1, resetTime: now + config.windowMs });
    return response;
  }

  entry.count++;

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(entry.resetTime),
        },
      }
    );
  }

  const remaining = Math.max(0, config.maxRequests - entry.count);
  response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(entry.resetTime));
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
