# 📓 AI-Company: Stage 1 Friction Log & Admission Gate

**Positioning:** Founder Operating System (Pre-MVP Startup Phase)
**Current Validation Target:** FoodTruck-IL
**Mission:** Help the founder reach MVP launch with less cognitive load, better prioritization, and faster decision-making.

> FoodTruck-IL is not a source of features.
> FoodTruck-IL is a source of management problems.
> The platform learns generic management capabilities.
> The platform does not learn food truck functionality.

---

## 🚦 The Classification Gate

Before any capability enters AI-Company Core (`packages/*`), it must pass both tests:

### Question 1 — Independent Existence Test
If FoodTruck-IL disappeared tomorrow, would this capability still make sense?

### Question 2 — Vocabulary Test
Can I describe this capability without using FoodTruck-specific vocabulary?

**Examples:**

- ❌ `Truck Approval Queue` → ✅ `Entity Approval Queue`
- ❌ `Food Truck Owner Outreach Tracker` → ✅ `Relationship Pipeline`
- ❌ `Menu Approval Workflow` → ✅ `Content Approval Workflow`

If either test fails:
→ Keep it inside `instances/yoni-company/*`.

---

## 📊 Stage 1 Success Metric

The primary validation metric is not architecture.
The primary validation metric is **adoption**.

### Daily Usage Threshold

> Did I open AI-Company before 11:00 AM on at least **20 of 30** validation days?

If not:
**The platform failed validation regardless of any other metric.**

(Track daily — one tick per morning. Honest answer only; "I opened it at 11:02" is a No.)

---

## ☀️ Daily Founder Questions

Every morning AI-Company must help answer:

1. **What is blocking MVP launch?**
2. **What decision requires my attention?**
3. **What should I work on today?**
4. **What can be deferred?**
5. **What creates the biggest launch risk?**

Whenever AI-Company cannot answer one of these questions adequately, create a friction entry.

---

## 📥 Friction Stream

**Instructions:**

Create an entry immediately whenever:

- You leave AI-Company to complete a task manually.
- One of the five questions cannot be answered.
- AI-Company surfaces incorrect information.
- AI-Company creates more work than it saves.
- You think: *"I wish the system could help me with this."*

**Do not design a solution.**
**Do not create a feature request.**
**Only describe the management problem.**

Classification, platform implications, and feature decisions happen on Friday — not in the moment of friction.

| Date | Failed Question / Situation | What actually happened? | Time Lost | Temporary Workaround | Platform Candidate? | Status |
|---|---|---|---|---|---|---|
| *2026-06-05* | *Question #2* | *AI-Company showed a decision already resolved yesterday in Supabase* | *10 min* | *Verified manually in Supabase* | *TBD Friday* | `Example — delete after first real entry` |
| | | | | | | |
| | | | | | | |
| | | | | | | |

---

## 📅 Friday Review Process

Every Friday, 08:00–12:00. Protected slot. No FoodTruck-IL operational work during this window.

**Step 1** — Review all entries from the past week.

**Step 2** — For each entry, ask:

- Is this a **Platform capability**?
- Is this **Instance-specific**?
- Is this a **Bug**?

**Step 3** — Apply the Classification Gate (both questions above) to anything that looks like a Platform candidate.

**Step 4** — Move approved Platform items to:
`docs/platform/PLATFORM_IMPROVEMENTS.md`

**Step 5** — Move FoodTruck-specific items to:
`instances/yoni-company/*` (the appropriate file — backlog, config, or new instance-layer module).

**Step 6** — Mark bugs as `[Bug]` in the Status column and fix them in `packages/*` without admission review (bugs don't need to be useful to other companies; they need to not exist).

---

## ⛔ Stage 1 Constraint — No Founder Mode Features Yet

Do not build any new Founder Mode capability during the first two weeks.

First, run the five morning questions using the platform **exactly as it exists today**. Every place where the platform cannot answer those questions becomes a friction entry.

Only after **1–2 weeks of real friction data** should we decide whether new Founder OS capabilities are required.

This rule exists to prevent AI-Company from turning into another architecture project and to force the roadmap to come from actual usage.

---

## 📌 Platform Neutrality Invariants (Always-On Rules)

These rules sit above Stage 1's normal admission flow. They are platform-wide invariants — any violation is a `[Bug]`, fixable in `packages/*` without admission review.

- **Language Neutrality.** AI-Company is multilingual by design. English is the platform default. Any Hebrew (or non-English) string in `packages/*` or `apps/executive-dashboard/` is a leak. Language belongs to instance config. (See `docs/architecture/GENERIC_PLATFORM_BOUNDARY.md` §6.1 and refactor plan L13.)
- **Currency Neutrality.** All monetary records carry an explicit `currency` field. No platform package assumes ILS or USD. Currency belongs to instance config. (See §6.2 and L12.)
- **Locale Neutrality (general).** No platform code assumes a specific timezone, date format, calendar system, or measurement system. These belong to instance config when they matter.

Both L12 (currency) and L13 (language) ship behind **milestone triggers**, not calendar dates:

- **L12 ships before the first real-money transaction is recorded.**
- **L13 ships immediately when any of:** a second instance is created, any user-facing content is generated in a non-English language, any UI page requires translation, any prompt requires runtime language selection, or any external user begins using AI-Company.

**Language Ownership — three independent layers:**

| Layer | What it controls | Today |
|---|---|---|
| Platform (`packages/*`, `apps/`) | Default for all source, prompts, schemas, docs | English (fixed) |
| Instance (`instances/yoni-company/*`) | `defaultLanguage` + `supportedLanguages` for this company | `'en'` default, `['en', 'he']` supported |
| User (per-session) | Display language picked by operator | Yoni: `'he'`; future contractor: `'en'` |

**Known invariant violations (logged, not yet fixed):**
- `apps/executive-dashboard/app/ceo/page.tsx` — three Hebrew strings. These are **active-invariant violations**, not technical debt. We chose not to interrupt validation work to fix them; they will be addressed at the L13 milestone trigger or before any external user starts using the dashboard, whichever is first.

If you write a friction entry that names language or currency, mark Platform Candidate = **Yes (Invariant)**. These are not subject to the Stage 1 "must serve one of the 5 morning questions" filter — they're invariants, not features. Any new non-English string added to `packages/*` or `apps/` during validation **fires the L13 trigger** and must be fixed before the next merge to `main`.

---

## 🧠 Reminder

**FoodTruck-IL is not a source of features.**
**FoodTruck-IL is a source of management problems.**

The platform learns generic management capabilities.
The platform does not learn food truck functionality.
