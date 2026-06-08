# Vercel Deployment — Private Daily Use

This doc covers deploying the AI-Company dashboard to Vercel for the CEO's
private daily use during Production Validation Phase 1 (Instance #1:
FoodTruck-IL). It is **not** a public-demo deployment guide. No public URL,
no anonymous access, no showcase features.

The deployment unit is `apps/executive-dashboard`. The rest of the monorepo
(packages, instance configs, connectors) is built from source on each deploy.

---

## 1. One-time Vercel project setup

1. Create a new Vercel project pointing at `https://github.com/yoni277/ai-company`.
2. In **Project Settings → General → Root Directory**, set:
   ```
   apps/executive-dashboard
   ```
   This is the load-bearing setting. The `vercel.json` in that directory
   then takes care of running `pnpm install` and `pnpm build` from the
   monorepo root so workspace packages resolve.
3. In **Project Settings → General → Build & Development Settings**, leave
   "Override" toggles **off** — `vercel.json` already supplies the install
   and build commands.
4. In **Project Settings → Environment Variables**, set the variables
   listed in section 2 for the **Production** environment (and Preview if
   you want PR previews behind the same gate).
5. In **Project Settings → General**, **disable** "Vercel Authentication"
   for deployments unless you also pay for the Pro plan's password
   protection. The cookie-backed auth gate in this repo (`proxy.ts`) handles
   gating; do not stack a second layer or you'll lock yourself out. See
   `docs/deployment/AUTH_GATE.md` for why the gate is cookie-backed and not
   Basic-Auth-only.
6. Set the production branch to `main`.

---

## 2. Required environment variables

All variables go on Vercel under **Production** (and **Preview** if used).
Do not commit any of these to git.

### Auth gate (mandatory before going live)

| Variable                        | Required | Notes                                                                 |
| ------------------------------- | -------- | --------------------------------------------------------------------- |
| `DASHBOARD_BASIC_AUTH_USER`     | yes      | Username for the HTTP Basic prompt. Anything memorable.               |
| `DASHBOARD_BASIC_AUTH_PASSWORD` | yes      | Strong password. Treat as a secret. Min 24 random chars recommended.  |

If either is unset in production, **the dashboard becomes publicly
accessible**. Setting both is the only safe configuration.

### Build runtime

| Variable                          | Required | Notes                                                                                                |
| --------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `ENABLE_EXPERIMENTAL_COREPACK`    | yes      | Set to `1`. Without it Vercel ignores `packageManager` in `package.json` and uses its bundled pnpm 8, which fails the workspace's `engines.pnpm: >=9.0.0`. |

### Platform data mode

| Variable                  | Required | Default | Notes                                                                                    |
| ------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------- |
| `AI_COMPANY_DATA_MODE`    | yes      | `mock`  | Set to `supabase` for Phase 1. `mock` is only useful for local demos.                    |
| `AI_COMPANY_ACTIVE_CONNECTORS` | no   | (all)   | Comma-separated allowlist of connector names. Leave unset to register all instance connectors. |

### Supabase (platform schema — `ai_company.*`)

| Variable                       | Required | Notes                                                              |
| ------------------------------ | -------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`     | yes      | Project URL of the Supabase project holding the `ai_company` schema. |
| `SUPABASE_SERVICE_ROLE_KEY`    | yes      | Service-role key. Server-only — never expose to the browser.       |
| `SUPABASE_SCHEMA`              | no       | Defaults to `ai_company`. Override only if you've renamed it.      |

### Supabase (FoodTruck instance data)

These can point at the same Supabase project as above or at a separate one,
depending on whether you keep platform + instance data co-located.

| Variable                                  | Required for live mode | Notes                                                              |
| ----------------------------------------- | ---------------------- | ------------------------------------------------------------------ |
| `FOODTRUCK_SUPABASE_URL`                  | yes                    | Empty string ≠ unset. Leave fully unset to fall through to `NEXT_PUBLIC_SUPABASE_URL`. |
| `FOODTRUCK_SUPABASE_SERVICE_ROLE_KEY`     | yes                    | Same: leave unset (not empty) to fall back to `SUPABASE_SERVICE_ROLE_KEY`. |

### LLM (Anthropic primary, OpenAI fallback)

| Variable             | Required | Notes                                                                                   |
| -------------------- | -------- | --------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`  | yes      | Without this the executives fall back to the deterministic Fake clients. Phase 1 needs live LLM. |
| `ANTHROPIC_MODEL`    | no       | Defaults to `claude-sonnet-4-6`.                                                        |
| `OPENAI_API_KEY`     | no       | Only used by the Chief of Staff daily-brief OpenAI fallback. Optional.                  |
| `OPENAI_MODEL`       | no       | Defaults to `gpt-4o-mini`.                                                              |

### GitHub connector (optional)

Only set these if you want the GitHub connector to register live; otherwise
it stays in mock mode (a Phase 1-acceptable state).

| Variable             | Required | Notes                                                |
| -------------------- | -------- | ---------------------------------------------------- |
| `GITHUB_TOKEN`       | no       | Personal access token, repo-read scope.              |
| `GITHUB_REPOSITORY`  | no       | `owner/repo` shorthand the connector reads.          |

### Diagnostics

| Variable                            | Required | Notes                                                                                                                                                  |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AI_COMPANY_LOG_CONNECTOR_MODE`     | no       | Set to `1` for the first few deploys so the FoodTruck-IL connector prints `[platform] FoodTruck-IL connector: live` or `... mock` on first invocation. |

---

## 3. Pre-deploy checklist

Run locally from `/Users/yonimansharof/ai-company`:

```
corepack pnpm install
corepack pnpm typecheck
corepack pnpm -C apps/executive-dashboard build
```

All three must pass. If `build` fails locally, the Vercel build will fail too.

Then, **before promoting the first production deploy to your bookmarked URL**, confirm:

- [ ] **Auth env vars are set.** `DASHBOARD_BASIC_AUTH_USER` and
      `DASHBOARD_BASIC_AUTH_PASSWORD` exist on the Production environment in
      Vercel. Without them the deployment is publicly accessible.
- [ ] **Data mode is `supabase`.** `AI_COMPANY_DATA_MODE=supabase` is set on
      Production.
- [ ] **Supabase credentials valid.** Hit `/api/projects` once and confirm
      it returns the registry-seeded project list rather than a 500.
- [ ] **Anthropic key valid.** Hit `/api/chief-of-staff/briefing` (POST) and
      confirm the response is a Claude-generated briefing (look for the
      headline content and not the deterministic Fake fallback).
- [ ] **Connector mode logged.** With `AI_COMPANY_LOG_CONNECTOR_MODE=1`,
      check Vercel runtime logs for the `[platform] FoodTruck-IL connector:
      live` line. If it says `mock`, the FOODTRUCK_* env vars are missing
      or empty (empty string ≠ unset — Vercel must omit the key, not set it
      to `""`).
- [ ] **Auth gate works.** In a private window, open the deploy URL and
      confirm the browser shows the basic-auth prompt. Reject once, then
      authenticate; reaching `/` should now render.

## 4. Post-deploy smoke check

In a private browser window, authenticate once, then walk the five routes
from the task list:

- [ ] `GET /` — landing page renders, project tiles visible.
- [ ] `GET /ceo` — CEO Operating System view loads.
- [ ] `GET /registry` — project registry table shows the four seeded
      projects (foodtruck-il / lab-os / inventory-engine / burgerstop).
- [ ] `GET /api/projects` — returns the four projects as JSON.
- [ ] `GET /api/registry/projects` — returns the registry-format payload.

If all five return 200 with expected content, the deploy is live. Bookmark
the URL.

---

## 5. Rollback

Vercel keeps every deployment forever. If a deploy regresses, the **Deployments**
tab lets you promote an earlier deploy to Production in one click. No git revert
needed for emergencies.

For a permanent rollback that survives future deploys, `git revert` the offending
commit on `main` and let Vercel rebuild from `main`.

---

## 6. Operational notes

- **Cost cap:** Anthropic charges per briefing. If you wire the platform up
  to run scheduled briefings later, set an Anthropic spend cap before
  enabling the schedule.
- **Logs:** Vercel runtime logs are 1-hour rolling for the Hobby plan, 24-hour
  for Pro. For Phase 1 friction-log entries that reference platform errors,
  copy the stack trace to the friction log immediately — don't rely on Vercel
  retaining it.
- **Auth change:** to rotate the password, update
  `DASHBOARD_BASIC_AUTH_PASSWORD` in Vercel and trigger a redeploy.
  Existing tabs keep working until the browser drops the cached
  credential.
