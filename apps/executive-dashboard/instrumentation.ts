/**
 * SEC-1 (S2) — boot assertion for the auth gate.
 *
 * Next runs register() once per server process at startup. We use it to make a
 * dangerous misconfiguration LOUD at boot rather than silent at runtime:
 *
 *   - In production, the dashboard auth gate must be ENFORCED. The only way to
 *     run unauthenticated is the explicit DASHBOARD_AUTH_DISABLED=1 escape hatch
 *     (intended for local dev). If that escape hatch is set in production, we
 *     throw at boot — a fail-open dashboard must never ship.
 *   - Missing credentials in production are not fatal here: proxy.ts already
 *     FAILS CLOSED (returns 401), so a missing env denies rather than exposes.
 *     We log a clear error so the misconfig is visible, but we do not crash the
 *     boot (which would also take down the 401 response the gate must serve).
 *
 * This pairs with proxy.ts: the proxy denies per-request (the runtime guard);
 * this assertion catches the one config that would defeat it (the boot guard).
 */
export async function register(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return;

  const authDisabled = process.env.DASHBOARD_AUTH_DISABLED === '1';
  if (authDisabled) {
    throw new Error(
      'SEC-1/S2: DASHBOARD_AUTH_DISABLED=1 is set in production — refusing to boot a ' +
        'fail-open dashboard. Unset it (the gate fails closed by default).',
    );
  }

  const hasUser = Boolean(process.env.DASHBOARD_BASIC_AUTH_USER);
  const hasPass = Boolean(process.env.DASHBOARD_BASIC_AUTH_PASSWORD);
  if (!hasUser || !hasPass) {
    // Not fatal — proxy.ts fails closed (401). Surface it loudly so the
    // operator notices a dashboard that denies everyone.
    // eslint-disable-next-line no-console
    console.error(
      'SEC-1/S2: DASHBOARD_BASIC_AUTH_USER / DASHBOARD_BASIC_AUTH_PASSWORD are not both set ' +
        'in production — the auth gate is failing closed (all requests 401). Set both to enable access.',
    );
  }
}
