# AI-Company — Executive Operating Plan (30 Days)

**Plan start:** 2026-06-03  
**Owner:** CEO (Yoni)  
**Platform:** Use `/ceo` Command Center daily; record directives and decisions in CEO OS.

**North star:** Increase **live portfolio coverage** from 25% to ≥50% while fixing FoodTruck activation.

---

## Week 1 — FoodTruck activation sprint

**Theme:** Unblock **Approved → Active** (6 inactive approved trucks).

| Day | CEO focus | Platform use |
|-----|-----------|----------------|
| 1–2 | Contact 6 inactive approved trucks; log blockers | Approve P1 actions in CEO decision panel; assign owner **Yoni**, due dates |
| 3 | Clear 1 pending truck approval | Pending approvals card on Overview |
| 4 | Review activation outcomes | Funnel + Owner Acquisition panels |
| 5 | Weekly review | Command Center highlights; update weekly goals checklist |
| 7 | Checkpoint | Target: ≥2 trucks moved to active |

**Directive to enter (example):**

> “All outreach on inactive approved trucks is P1 until activation rate exceeds 50%.”

**Success metrics:**

- Activation rate trend up from 45.5%  
- Fewer inactive approved trucks (7d)  
- At least one **approved** CEO decision marked **in_progress** → **completed**

**Do not start:** Phase 5C, BurgerStop connector work, new dashboard features.

---

## Week 2 — BurgerStop live migration plan

**Theme:** Second real company in portfolio.

| Workstream | Tasks | Engineering (when approved) |
|------------|-------|------------------------------|
| Product | Define WhatsApp order flow, menu, customer record | — |
| Data | Map real tables to funnel stages + revenue source | Registry `connector_type` + `revenueSource` |
| CEO | Directive: “BurgerStop mock data deprecated by [date]” | Override flag + target project |

**Deliverables by end of week 2:**

- Written cutover checklist (tables, env vars, registry config)  
- Registry row updated in **draft** (not necessarily live yet)  
- Mock badge still shown until cutover verified  

**Success metrics:**

- Cutover plan reviewed in Command Center scorecard (CTO PASS remains)  
- No false reliance on BurgerStop mock revenue in meetings  

---

## Week 3 — Lab-OS lead pipeline

**Theme:** Replace mock funnel with real lead → demo → pilot data.

| Day | Focus |
|-----|--------|
| 1–3 | Identify CRM/source of truth for Lab-OS leads |
| 4–5 | Define funnel stage mapping (Lead, Demo, Pilot, Subscribed, Active) |
| 6–7 | First live connector spike OR manual import path documented |

**CEO OS:**

- Decision: defer mock-based Lab-OS recommendations until live  
- Directive: “Lab-OS funnel counts must come from [system] by week 4”

**Success metrics:**

- At least one real lead recorded in target system  
- Weekly goal: “Create first Lab-OS lead” checked  

---

## Week 4 — Portfolio review

**Theme:** Measure maturity; decide Phase 5C gate.

| Activity | Output |
|----------|--------|
| Executive Meeting #002 | `EXECUTIVE_MEETING_002.md` (future) |
| Compare live vs mock counters on `/ceo` | Expect 2/4 live if BurgerStop or Lab-OS cut over |
| Review all **approved / in_progress** CEO decisions | Close or complete |
| Re-read [DATA_MATURITY_REPORT.md](./DATA_MATURITY_REPORT.md) | Update scores |

**Go / no-go for Phase 5C:**

| Gate | Required |
|------|----------|
| Live projects | ≥ **2** |
| Live revenue sources | ≥ **2** |
| FoodTruck activation | Sustained improvement |
| CEO directives | Active standing instructions documented |

If gate **fails** → extend business cutover 30 days; keep Phase 5C deferred.

---

## Daily CEO routine (15 minutes)

1. Open **`/ceo`** — read 4 highlight cards + data maturity.  
2. Check **CEO decision panel** — approve/defer P1 actions.  
3. Scan **decision tracker** — in progress items.  
4. Optional: Overview for drill-down panels.  
5. Friday: generate daily brief; confirm directives appear in brief.

---

## What we are not doing this month

- Phase 5C Financial Health Engine  
- Autonomous outreach or spend  
- New AI executives  
- Forecasting / budgeting modules  
- Treating portfolio ₪ totals as audited financials  

---

## Related documents

- [EXECUTIVE_MEETING_001.md](./EXECUTIVE_MEETING_001.md)
- [NEXT_PHASE_RECOMMENDATION.md](./NEXT_PHASE_RECOMMENDATION.md)
- [FIRST_STAFF_MEETING_READINESS.md](./FIRST_STAFF_MEETING_READINESS.md)
- [../architecture/CURRENT_SYSTEM_STATE.md](../architecture/CURRENT_SYSTEM_STATE.md)
