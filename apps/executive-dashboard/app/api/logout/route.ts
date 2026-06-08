import { NextResponse } from 'next/server';

/**
 * D065 · P056-v2 — Logout. Expires the `__dash_auth` cookie minted by proxy.ts
 * (the cookie that carries auth on RSC/prefetch fetches) and returns the
 * operator to the root. On local dev the gate is bypassed (no creds), so this
 * is a harmless redirect; in production it ends the 12h session.
 */
export const dynamic = 'force-dynamic';

const AUTH_COOKIE = '__dash_auth';

export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL('/', request.url));
  res.cookies.set(AUTH_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
