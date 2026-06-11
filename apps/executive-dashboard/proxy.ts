import { NextResponse, type NextRequest } from 'next/server';

/**
 * Cookie-backed auth gate for the AI-Company dashboard (Next 16 Proxy).
 *
 * Replaces the previous Basic-Auth-only middleware. Basic Auth alone is
 * incompatible with the App Router: a `<Link>` click does not do a full page
 * load — it issues a background `fetch()` for the destination's RSC payload.
 * Browsers (Chrome in particular) do not reliably replay cached HTTP Basic
 * credentials on those `fetch()` requests, so the gate returned `401` with a
 * plain-text body the router cannot parse, and the soft navigation silently
 * aborted ("clicking links does nothing"). See docs/deployment/AUTH_GATE.md.
 *
 * Fix: the first request that presents valid Basic credentials is issued a
 * secure, HttpOnly cookie. The browser sends that cookie automatically on
 * every same-origin request — including RSC / prefetch fetches — so soft
 * navigation works while the dashboard stays gated.
 *
 * Single shared credential pair, designed for private single-operator daily
 * use on Vercel during Production Validation. NOT multi-tenant, NOT SSO.
 *
 * SEC-1 (S2) — FAIL CLOSED. If `DASHBOARD_BASIC_AUTH_USER` and
 * `DASHBOARD_BASIC_AUTH_PASSWORD` are both set the gate is enforced. If either
 * is unset/misconfigured the gate DENIES (401) by default — it no longer opens.
 * Local dev must opt out EXPLICITLY with `DASHBOARD_AUTH_DISABLED=1`; that flag
 * is asserted *off* in production by instrumentation.ts (boot assertion), so a
 * forgotten Preview env or a typo can never silently expose the dashboard.
 */

const PUBLIC_PREFIXES = ['/_next', '/favicon', '/robots.txt'];
const AUTH_COOKIE = '__dash_auth';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12; // 12h

/**
 * Stateless session token: SHA-256 over the credential pair. Preimage
 * resistance means it cannot be reversed to recover the password, and it is
 * deterministic so the (stateless) edge gate can recompute and compare it on
 * every request without a session store. Versioned so the format can rotate.
 */
async function sessionToken(user: string, pass: string): Promise<string> {
  const data = new TextEncoder().encode(`v1:${user}:${pass}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const pathname = req.nextUrl.pathname;

  // Static / framework assets are not gated. Everything else is — including
  // `.rsc` / `.segments` navigation fetches (no RSC exemption).
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const expectedUser = process.env.DASHBOARD_BASIC_AUTH_USER ?? '';
  const expectedPass = process.env.DASHBOARD_BASIC_AUTH_PASSWORD ?? '';

  // S2 (SEC-1) — FAIL CLOSED. A missing/misconfigured credential pair denies by
  // default. Only an EXPLICIT opt-out unblocks it (local dev), and that opt-out
  // is rejected in production at boot (instrumentation.ts). Previously this
  // returned NextResponse.next() on unset creds — fail-open — which exposed the
  // entire dashboard + every /api route the moment an env var was missing.
  if (!expectedUser || !expectedPass) {
    if (process.env.DASHBOARD_AUTH_DISABLED === '1') {
      return NextResponse.next();
    }
    return unauthorized();
  }

  const token = await sessionToken(expectedUser, expectedPass);

  // 1) Cookie path — this is what carries auth on App Router RSC / prefetch
  //    fetches, so soft navigation (Link clicks) keeps working.
  const cookie = req.cookies.get(AUTH_COOKIE)?.value ?? '';
  if (cookie && timingSafeEqual(cookie, token)) {
    return NextResponse.next();
  }

  // 2) Basic Auth path — first authenticated request mints the cookie.
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
        const res = NextResponse.next();
        res.cookies.set(AUTH_COOKIE, token, {
          httpOnly: true,
          // Secure on HTTPS (Vercel); relaxed on plain-HTTP previews so the
          // cookie is still issued. Production is always HTTPS.
          secure: req.nextUrl.protocol === 'https:',
          sameSite: 'lax',
          path: '/',
          maxAge: COOKIE_MAX_AGE_SECONDS,
        });
        return res;
      }
    }
  }

  // 3) Unauthenticated — challenge. RSC fetches receive this too; once the
  //    cookie is set on the initial page load they no longer reach here.
  return unauthorized();
}

/** 401 challenge — the single fail-closed response for every denied path. */
function unauthorized(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="AI-Company Dashboard", charset="UTF-8"',
    },
  });
}

export const config = {
  // Match every route except Next internals (already filtered above as a
  // second line of defence) and the favicon/robots assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
