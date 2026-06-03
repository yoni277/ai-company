# AI-Company — Data Maturity Report (June 2026)

**Report date:** 2026-06-03  
**Portfolio projects:** 4 active (registry)

---

## Executive summary

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Platform readiness** | **9/10** | Registry, engines, dashboard, CEO OS operational |
| **Business data maturity** | **5/10** | 1 of 4 projects on live business connectors |
| **Portfolio intelligence trust** | **Partial** | ~25% live project signals; revenue dollars ~26% live-sourced |

---

## Portfolio status

| Project | Funnel / ops | Revenue | Registry connector | Overall |
|---------|--------------|---------|-------------------|---------|
| **FoodTruck-IL** | **LIVE** | **LIVE** (volume + unit economics) | `foodtruck-business` | **Production** |
| **Lab-OS** | MOCK | MOCK | `mock-funnel` | Scenario |
| **Inventory Engine** | MOCK | MOCK | `mock-funnel` | Scenario |
| **BurgerStop** | MOCK | MOCK (₪0) | `mock-funnel` | Scenario |

---

## Live connectors (production)

| Connector | Project(s) | What is real |
|-----------|------------|--------------|
| `foodtruck-business` | FoodTruck-IL | `trucks`, `truck_events`, activation, funnel stage counts |
| `foodtruck-supabase-events` | FoodTruck-IL | Transaction **count** in 30d window |
| `connector-github` | Platform | Repo metrics (configured backend repo) |
| `connector-supabase` | Platform | DB health, activity counts |
| `project-registry` | All | Definitions from **database** |

---

## Mock connectors

| Connector / source | Project(s) | What is simulated |
|--------------------|--------------|-------------------|
| `mock-funnel` | Lab-OS, Inventory, BurgerStop | Stage counts from `project_funnel_stages.mock_count` |
| `mock-revenue` | Lab-OS, Inventory, BurgerStop | Registry JSON unit economics |
| `stripe`, `erp`, `csv-import` | — | Stubbed (zero or mock) |

---

## Production readiness by layer

| Layer | Ready? | Blocker |
|-------|--------|---------|
| Dashboard UI | ✅ | — |
| Registry (DB) | ✅ | Requires `AI_COMPANY_DATA_MODE=supabase` |
| Portfolio ranking | ✅ | Works; interpret mock projects carefully |
| Revenue visibility | ✅ | Label live/mock |
| Financial visibility | ✅ | Trends N/A until snapshot history |
| CEO Operating System | ✅ | Supabase tables + APIs |
| Cross-project P&L trust | ❌ | 75% mock revenue |
| Financial health scoring | ❌ | Phase 5C not started |

---

## FoodTruck-IL nuance (live but incomplete)

| Signal | Maturity |
|--------|----------|
| Truck registrations / approval | **Live** |
| Activation / events | **Live** |
| Revenue transaction count | **Live** |
| Revenue dollar amounts | **Configured** (not payment-ledger) |
| Payments / Stripe | **Not integrated** |

---

## Recommended maturity targets (30 days)

1. **FoodTruck-IL:** Improve activation (business ops, not platform).  
2. **BurgerStop:** Live WhatsApp/order/funnel/revenue connectors → **2nd live company**.  
3. **Lab-OS:** Live CRM/funnel → **3rd live company**.  
4. **Snapshot history:** Enable financial trends after cutover.  
5. **Re-evaluate Phase 5C** when ≥2 projects report live funnel + revenue.

---

## Related documents

- [EXECUTIVE_MEETING_001.md](./EXECUTIVE_MEETING_001.md)
- [FIRST_STAFF_MEETING_READINESS.md](./FIRST_STAFF_MEETING_READINESS.md)
- [OPEN_RISKS.md](./OPEN_RISKS.md)
- [NEXT_PHASE_RECOMMENDATION.md](./NEXT_PHASE_RECOMMENDATION.md)
