# Phase 4A — Multi-Project Intelligence Layer

**Status:** In execution  
**Phases 2–3C:** Complete and accepted  
**Out of scope:** Revenue intelligence, governance changes, new AI executives

## Objective

Aggregate intelligence across **multiple business units** so the CEO sees portfolio-wide health, bottlenecks, and priorities in one dashboard.

Initial portfolio:

| Project | Phase 4A status |
|---------|-----------------|
| FoodTruck-IL | Live (project #1) |
| Lab-OS | Mock funnel + decision (connector-ready) |
| Inventory Engine | Mock funnel + decision (connector-ready) |
| BurgerStop | Mock funnel + decision (connector-ready) |

## Architecture

```
Per-project provider (connector + funnel config)
        ↓
ProjectIntelligenceBundle { funnel, decision, live }
        ↓
@ai-company/portfolio-intelligence-engine  (deterministic)
        ↓
PortfolioIntelligenceSnapshot
        ↓
Portfolio Overview panel · CEO brief Portfolio Summary
```

- **No AI. No LLM.** Aggregation and ranking only.
- New companies add a **provider** + **funnel configuration** — no dashboard or engine redesign.

## Aggregation model

| Output | Description |
|--------|-------------|
| `ProjectHealthSnapshot` | Per-project funnel status, bottleneck, recommendation counts |
| `PortfolioHealthSnapshot` | Portfolio-wide status and score |
| `PortfolioPriority` | Ranked projects with reason |
| `PortfolioActionQueue` | Cross-project actions sorted by priority |

### Ranking (deterministic)

Priority score increases with: critical funnel health, P1 actions, severe bottlenecks, large drop-offs. Lowest score = healthiest project; highest = needs attention.

## Dashboard additions

**Portfolio Overview** (above project-specific panels):

- Project name
- Health status
- Main bottleneck
- Open recommendations count
- Priority rank

Phase 2, 3A, 3B, and 3C panels unchanged.

## Daily CEO brief

**Portfolio Summary** — deterministic line naming highest-priority project and why.

## Success criteria

- [ ] Multiple projects in portfolio snapshot
- [ ] Ranking identifies healthiest vs needs-attention project
- [ ] Dashboard Portfolio Overview visible
- [ ] Brief includes portfolio summary
- [ ] `pnpm build` and `pnpm typecheck` pass
- [ ] `docs/project-management/PHASE_4A_VALIDATION.md` completed

**Do not proceed to revenue intelligence until Phase 4A is validated and accepted.**
