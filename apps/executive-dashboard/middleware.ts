import { NextResponse, type NextRequest } from 'next/server';

/**
 * Minimal HTTP Basic Auth gate for the AI-Company dashboard.
 *
 * This is intentionally simple: it gates the entire dashboard (pages + API
 * routes) behind a single shared credential pair, designed for private,
 * single-operator daily use on Vercel during Production Validation Phase 1.
 * It is NOT a multi-tenant auth system, NOT SSO, and NOT password-recovery
 * capable. If `DASHBOARD_BASIC_AUTH_USER` and `DASHBOARD_BASIC_AUTH_PASSWORD`
 * are both set, the gate is enforced; if either is unset (local dev), the
 * gate is bypassed and the dashboard is reachable without auth.
 *
 * Set both env vars on the Vercel project before deploying.
 */

const PUBLIC_PREFIXES = ['/_next', '/favicon', '/robots.txt'];

export function middleware(req: NextRequest): NextResponse {
  const pathname = req.nextUrl.pathname;

  // Static / framework assets are not gated. Everything else is.
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const expectedUser = process.env.DASHBOARD_BASIC_AUTH_USER ?? '';
  const expectedPass = process.env.DASHBOARD_BASIC_AUTH_PASSWORD ?? '';

  // Local dev / preview without creds — open access. Production deployments
  // MUST set both env vars (see docs/deployment/VERCEL_DEPLOYMENT.md).
  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  const header = req.headers.get('authorization') ?? '';
  if (header.startsWith('Basic ')) {
    const encoded = header.slice('Basic '.length).trim();
    let decoded = '';
    try {
      decoded = atob(encoded);
    } catch {
      decoded = '';
    }
    const idx = decoded.indexOf(':');
    if (idx >= 0) {
      const user = decoded.slice(0, idx);
      const pass = decoded.slice(idx + 1);
      if (timingSafeEqual(user, expectedUser) && timingSafeEqual(pass, expectedPass)) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="AI-Company Dashboard", charset="UTF-8"',
    },
  });
}

/** Constant-time string comparison to avoid trivial timing leaks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const config = {
  // Match every route except Next internals (already filtered above as a
  // second line of defence) and the favicon/robots assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
