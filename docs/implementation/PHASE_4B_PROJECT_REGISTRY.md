# Phase 4B — Generic Project Registry

**Status:** In execution  
**Phase 4A:** Complete and accepted  
**Out of scope:** Revenue intelligence, governance changes, new AI executives

## Objective

Remove hardcoded project definitions. **Discover projects from the database** (or in-memory seed in mock mode) so new businesses onboard via configuration records only.

## Architecture

```
ai_company.project_definitions
ai_company.project_funnel_stages
ai_company.project_connector_configs
        ↓
@ai-company/project-registry  (load + validate)
        ↓
@ai-company/connector-portfolio-intelligence  (resolve bundles per connector_type)
        ↓
Portfolio · Dashboard Registry page
```

- **No AI. No LLM.**
- Connector **implementations** remain code; **which projects use which connector** is data-driven.
- Mock stage counts live in `project_funnel_stages.mock_count` until live connectors ship.

## Tables

| Table | Purpose |
|-------|---------|
| `project_definitions` | Slug, name, status, enabled, sort order |
| `project_funnel_stages` | Stage id, label, order, mock count |
| `project_connector_configs` | Connector type + JSON config |

## Onboarding a new company (success criteria)

1. Insert `project_definitions` row  
2. Insert `project_funnel_stages` rows  
3. Insert `project_connector_configs` row (`mock-funnel` or live connector type)  
4. No dashboard or engine code changes  

## Dashboard

**Project Registry** page (`/registry`): name, status, connector, funnel stages, funnel health (from portfolio engine).

## Acceptance criteria

- [ ] Projects loaded from registry store (DB or in-memory mirror)
- [ ] Funnel configuration built dynamically from stages table
- [ ] Portfolio intelligence uses registry project list
- [ ] Registry page renders all enabled projects
- [ ] `pnpm build` and `pnpm typecheck` pass
- [ ] `docs/project-management/PHASE_4B_VALIDATION.md` completed
