# yoni-company — instance configuration

This directory holds **per-company configuration** for the AI-Company platform.
Everything under `packages/` and `apps/executive-dashboard/` is generic; the
company-specific decisions (which projects, which connectors, which env-var
fallbacks, which seed data) live here.

The dashboard imports from this directory via the tsconfig path alias
`@active-instance/*`, defined in `apps/executive-dashboard/tsconfig.json`:

```json
"paths": {
  "@active-instance/*": ["../../instances/yoni-company/*"]
}
```

**To clone the platform for a different company** (e.g. AcmeCo):

1. Copy this directory to `instances/acme/`.
2. Edit `acme/instance-seed.ts` with AcmeCo's projects.
3. Edit `acme/instance-connectors.ts` with AcmeCo's connectors and env-var fallbacks.
4. Flip the alias in `apps/executive-dashboard/tsconfig.json`:
   ```json
   "@active-instance/*": ["../../instances/acme/*"]
   ```
5. `corepack pnpm install && corepack pnpm -C apps/executive-dashboard build`.

That's it. The platform layer (`packages/`, `apps/`) is unchanged.

## What lives here

| File | Purpose |
|---|---|
| `instance-seed.ts` | `INSTANCE_PROJECTS_SEED` — the project list pre-loaded into the in-memory store when `AI_COMPANY_DATA_MODE=mock`. |
| `instance-connectors.ts` | `buildInstanceConnectors(env)` — constructs this company's `DataConnector` set with the right env-var fallbacks (e.g. `FOODTRUCK_SUPABASE_*` for FoodTruck-IL). |

## What does NOT live here

Tasks tracked in `docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md`
that haven't migrated yet:

- Per-project vendor lists (L2) — still in `packages/ai-coo`.
- Per-project marketing channel hints (L3) — still in `packages/ai-vp-marketing`.
- Project registry TS seed (L8) — still in `packages/project-registry/src/seed-data.ts`.
- The four `packages/connectors/*` folders (L9 part 2) — still alongside platform packages.
- Currency / IL-specific copy strings (L11, L12).

Those will arrive in subsequent refactor steps. For now, `instance-seed.ts`
and `instance-connectors.ts` are the only files definitively classified as
instance-layer.
