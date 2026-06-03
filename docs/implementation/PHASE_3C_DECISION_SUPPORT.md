# Phase 3C — Decision Support Engine

**Status:** In execution  
**Phase 3B:** Complete and accepted  
**Out of scope:** Autonomous execution, messaging, outreach, spend, governance changes, new AI executives, revenue intelligence

## Objective

Convert funnel bottlenecks into **CEO action recommendations** using a generic deterministic engine. The system **recommends only** — CEO approval is required before any action.

## Generic architecture

```
FunnelSnapshot (Phase 3B)
        ↓
@ai-company/decision-support-engine  (rules v1, no side effects)
        ↓
DecisionSupportResult
        ↓
Optional project adapter (wording + context only)
        ↓
Dashboard CEO Action Queue · Daily CEO Brief
```

- **Core engine:** reads `FunnelSnapshot`, `FunnelHealth`, conversions, drop-offs — never hardcodes stage ids such as `registered` / `approved` / `active`.
- **Project adapter:** FoodTruck-IL first; supplies business-specific titles/reasons using adapter configuration and supplemental counts (e.g. pending approvals).

## Inputs

| Input | Source |
|-------|--------|
| `FunnelSnapshot` | `@ai-company/business-funnel-engine` via connectors |
| `FunnelHealth` | Embedded in snapshot |
| Optional adapter context | Connector (project-specific counts, not used by generic engine) |

## Outputs

| Type | Description |
|------|-------------|
| `RecommendedAction` | Priority, category, title, reason, impact, approval flag |
| `DecisionSupportResult` | Actions per project, sorted by priority |

## Deterministic rules (v1)

| # | Condition | Priority | Category | Action |
|---|-----------|----------|----------|--------|
| 1 | Main bottleneck conversion &lt; 50% | P1 | product | Investigate funnel bottleneck |
| 2 | Any drop-off `lostCount` &gt; 5 | P1 if &gt; 10 else P2 | sales | Recover lost volume between stages |
| 3 | First-stage count &lt; 5 | P2 | marketing | Increase top-of-funnel acquisition |
| 4 | Funnel health `critical` | P1 | operations | Review funnel health immediately |

No AI. No LLM. No external calls. No writes.

## CEO-in-the-loop constraints

- Every action has `requiresApproval: true`
- No messages sent, no outreach triggered, no money spent
- Dashboard displays recommendations for review only
- Brief section **Recommended Actions** uses pre-computed strings only

## Dashboard

**CEO Action Queue** panel — priority, category, title, reason, expected impact, requires approval. Phase 2, 3A, and 3B panels unchanged.

## Daily CEO brief

**Recommended Actions** — numbered deterministic lines, e.g.:

*"1. Investigate Approved → Active bottleneck. Six approved trucks are not active. Expected impact: increase active trucks."*

## Acceptance criteria

- [ ] Generic engine produces actions from FoodTruck funnel snapshot
- [ ] FoodTruck adapter adds project-specific wording (not in core engine)
- [ ] Dashboard CEO Action Queue visible
- [ ] Brief includes recommended actions
- [ ] No autonomous side effects
- [ ] `pnpm build` and `pnpm typecheck` pass
- [ ] `docs/project-management/PHASE_3C_VALIDATION.md` completed

**Do not proceed to revenue intelligence until Phase 3C is validated and accepted.**
