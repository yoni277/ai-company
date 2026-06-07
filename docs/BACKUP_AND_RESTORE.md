# Backup & Restore

## Code / repo backup

**Location:** iCloud Drive — `~/Library/Mobile Documents/com~apple~CloudDocs/ai-company-backup-2026-06-06.tar.gz` (~3.5 MB).

**Contents:** full project — source, `.git` history, all `packages/`, `apps/`, `docs/` (including `docs/archive/runtime-reset-2026-06-06/`), `instances/`, `connectors/`, `supabase/`, scripts, and `AI-Company_Master_Status_Tracker.xlsx`. The archive **excludes** regenerable folders: `node_modules`, `.next`, `.pnpm-store`, `.turbo`, `dist` (this is why 6.8 GB on disk compresses to ~3.5 MB).

### To restore on any machine
1. Extract the archive.
2. `corepack pnpm install` to rebuild `node_modules`.
3. `pnpm dev`.

### Notes
- The archive **includes `.env.local`** (API keys / GitHub PAT). It is intended for your own backup — be mindful if that iCloud folder is ever shared.
- This is a **code/repo** backup only. The **database** baselines are separate (see below).

## Database baselines (Supabase, project `wimsglxixekmjsfpnqjb`, schema `ai_company`)

Captured as in-database snapshot schemas (restorable via `INSERT … SELECT`; see `scripts/runtime-reset/restore.sql`):

- **`ai_company_backup_20260606`** — full pre-reset data (the original FoodTruck-IL runtime).
- **`ai_company_zerostate_20260606`** — the verified pristine zero-state baseline (D050): empty runtime tables + the project registry present but disabled.

If you also want a database dump saved into iCloud alongside the code, it can be exported to a `.sql`/JSON file on request.

## Re-running the code backup later

```bash
ICLOUD="$HOME/Library/Mobile Documents/com~apple~CloudDocs"
cd ~ && tar -czf "$ICLOUD/ai-company-backup-$(date +%F).tar.gz" \
  --exclude='*/node_modules' --exclude='*/.next' --exclude='*/.pnpm-store' \
  --exclude='*/.turbo' --exclude='*/dist' \
  ai-company
```
