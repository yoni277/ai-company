# Merge Gate — `fix/dashboard-rsc-auth`

Architect-approved fix (cookie-backed dashboard auth gate). **Owner of this
gate: Claude Code (Builder).** Do not merge until every box below is checked.

Branch: `fix/dashboard-rsc-auth` · Commit: `6ae1568`
Change: deleted `apps/executive-dashboard/middleware.ts`, added
`apps/executive-dashboard/proxy.ts` (Next 16 Proxy), docs.
Background: `docs/deployment/AUTH_GATE.md`.

## 1. Build/test gate (Claude Code, in the terminal)

Run from repo root on the branch:

```bash
pnpm -r typecheck
pnpm -r test
pnpm --filter executive-dashboard build
```

All three must pass. (Note: workspace `test` scripts are currently
`echo no-op`, so `pnpm -r test` will pass trivially — that's expected until
real tests land; it is not evidence of behavioral coverage.)

Cowork pre-check already done (sandbox, partial): `tsc --noEmit` on
`@ai-company/executive-dashboard` exits **0**. The full `-r` sweep and the
real `next build` were NOT run in Cowork's sandbox (missing native binaries
there — SWC / lightningcss — would fail for environment reasons, not code).

## 2. Vercel preview verification (manual, in a browser)

Deploy the branch as a Vercel **Preview** with both env vars set
(`DASHBOARD_BASIC_AUTH_USER`, `DASHBOARD_BASIC_AUTH_PASSWORD`). Then confirm:

- [ ] **Login works** — first load prompts for Basic Auth; correct creds let you in.
- [ ] **Nav links click normally** — clicking header links navigates (the original bug); no dead clicks.
- [ ] **Refresh still works** — hard-reloading any deep route stays authenticated and renders.
- [ ] **Unauthenticated access blocked** — incognito / no creds → 401 challenge, no dashboard content.
- [ ] **RSC fetch without cookie blocked** — e.g.
      `curl -s -o /dev/null -w "%{http_code}" -H "RSC: 1" https://<preview-url>/ceo`
      returns **401** (and with the issued cookie returns 200).

## 3. Merge

After 1 + 2 are green: merge `fix/dashboard-rsc-auth`. Then Cowork logs the
result against tracker row **P051** and flips its Next Action to Closed.

## Optional follow-up (not required for this fix)

Fold a deploy-stable server secret into the cookie hash
(`sha256("v1:" + SECRET + ":" + user + ":" + pass)`) so the session token
isn't derivable from the credential pair alone, and consider a shorter TTL /
server-side revocation. Tracked as a future improvement, not a blocker.
