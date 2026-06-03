# Supabase migrations — platform vs instance

This directory is split into two layers per the generic-platform rule
(`docs/architecture/GENERIC_PLATFORM_BOUNDARY.md`, leak L7).

```
supabase/migrations/
├── platform/   ← reusable schema, ships with the AI-Company platform
└── instance/   ← seed and config rows specific to *this* company
```

When you fork this repo to spin up a new AI-Native company (AcmeCo, …), you
keep everything under `platform/` unchanged and replace the contents of
`instance/` with your own seed.

## What goes where

### `platform/` — schema only

Generic DDL: types, tables, indexes, RLS policies, triggers. No `INSERT`,
no project-specific slug, no vendor name. These migrations are deployable
verbatim into any AI-Company instance.

### `instance/` — seed and config

Inserts and updates that name specific projects, vendors, currencies, or
demo values. These files belong to *this* company's portfolio (FoodTruck-IL,
Lab-OS, Inventory Engine, BurgerStop, WhatsApp Platform). A different
company replaces them entirely.

## File classification

| File | Layer | What it does |
|---|---|---|
| `platform/0001_init.sql` | platform | Original Phase 1 schema (`projects`, `data_sources`, `project_metrics`, `risks`, `opportunities`, `executive_reports`, `report_links`) + enums + RLS policies in the un-namespaced `public` schema. |
| `platform/0003_init_ai_company_schema.sql` | platform | Namespaced variant that puts the same Phase 1 schema under `ai_company.*` so the platform can co-host with another app's `public` schema. After applying, add `ai_company` to **Supabase Dashboard → Settings → API → Exposed schemas**. |
| `platform/0005_project_registry.sql` | platform | `ai_company.project_definitions`, `ai_company.project_funnel_stages`, `ai_company.project_connector_configs` — generic registry tables. |
| `platform/0007_revenue_ledger.sql` | platform | `ai_company.revenue_transactions` table (currency-agnostic schema; instances supply their own rows). |
| `platform/0009_ceo_operating_system.sql` | platform | `ai_company.ceo_directives` + `ai_company.ceo_decisions` tables for the CEO Operating System surface. |
| `instance/0002_seed.sql` | instance | Inserts the four current projects (`foodtruck-il`, `lab-os`, `inventory-engine`, `whatsapp-engine`) into the un-namespaced `projects` table. |
| `instance/0004_seed_ai_company_schema.sql` | instance | Same four projects inserted into `ai_company.projects`. |
| `instance/0006_seed_project_registry.sql` | instance | Seeds `ai_company.project_definitions` with `foodtruck-il`, `lab-os`, `inventory-engine`, `burgerstop` plus their funnel-stage definitions and connector configs. |
| `instance/0008_seed_revenue_connectors.sql` | instance | Updates per-project connector configs with revenue source / currency / mock totals (ILS for foodtruck-il; USD for lab-os, inventory-engine). |

No file is currently classified as **mixed**. Every schema migration is
pure DDL; every seed migration is pure DML. A `grep -E "^create table|^create type"`
on the `instance/` folder returns zero matches, and a
`grep -iE "^insert|foodtruck|lab-os|burgerstop|inventory-engine|whatsapp-engine"`
on the `platform/` folder returns zero matches.

## Apply order

Migrations are still numbered globally (`0001` through `0009`). The
ordering matters because seeds reference tables created by schema files
(e.g. `instance/0006_seed_project_registry.sql` requires
`platform/0005_project_registry.sql` to exist first). To apply correctly:

1. Apply every file in `platform/` in numeric order:
   `0001 → 0003 → 0005 → 0007 → 0009`.
2. Then apply every file in `instance/` in numeric order:
   `0002 → 0004 → 0006 → 0008`.

Or, equivalently, apply all files together in numeric order — the
numbering interleaves correctly because schema-before-seed is preserved
by the original sequence (each schema migration has a lower number than
the seed migration that depends on it).

### Recommended `supabase` CLI invocation

If you use the Supabase CLI with the default `supabase db push` flow, it
expects migrations directly under `supabase/migrations/`. Since the files
now live in subfolders, use one of these:

```bash
# Option A — apply each layer explicitly (CI-friendly).
for f in supabase/migrations/platform/*.sql; do psql "$DATABASE_URL" -f "$f"; done
for f in supabase/migrations/instance/*.sql; do psql "$DATABASE_URL" -f "$f"; done

# Option B — apply in unified numeric order (matches the old flat-folder behaviour).
for f in $(ls supabase/migrations/{platform,instance}/*.sql | sort); do
  psql "$DATABASE_URL" -f "$f"
done

# Option C — symlink for `supabase db push`:
ln -sf platform/*.sql instance/*.sql supabase/migrations/
```

A future refactor will move these into a `supabase/migrate.sh` script
that the dashboard's `package.json` invokes.

## Cloning for AcmeCo

To spin up a new AI-Native company off this repo:

1. Fork the repo.
2. Keep `supabase/migrations/platform/` **untouched**.
3. Replace `supabase/migrations/instance/` with AcmeCo's seed:
   - Different `project_definitions` rows.
   - Different funnel-stage seeds.
   - Different revenue connector configs.
   - Different currency defaults.
4. Apply migrations to AcmeCo's Supabase project in the order above.
5. Verify: `select slug from ai_company.project_definitions order by sort_order` returns AcmeCo's projects, not this company's.

If a future leak introduces project slugs into `platform/`, it should
fail review — the platform layer must remain instance-agnostic. See
`docs/project-management/GENERIC_PLATFORM_REFACTOR_PLAN.md` for the
remaining boundary leaks queued for migration.

## What this split does NOT do

- **No production data is touched.** This is a source-tree reorganisation.
  No `psql` was run as part of L7.
- **No file contents changed.** Each `.sql` file is byte-identical to its
  pre-split version — only the path moved.
- **No application code references migration paths.** A repo-wide grep for
  `supabase/migrations` returned only documentation hits.
- **No mixed migrations were rewritten.** If a future migration mixes DDL
  and instance seed, document it in this README's classification table
  and earmark it for split.

When you're ready to apply these migrations, decide which layered apply
strategy (A/B/C above) fits your CI and run it manually. L7 leaves the
deployment decision in your hands.
