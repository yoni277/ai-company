# FoodTruck-IL Friction Log — Production Validation Instance #1

Every time AI-Company makes you do something manually, takes too long, gives
you the wrong answer, or you route around it (Slack, spreadsheet, SQL,
memory), write one line here. Don't elaborate. Don't classify yet.
Friday's weekly review is the classification step.

## Fields

`date | area | description | workaround | cost | category`

- **date** — `YYYY-MM-DD` (the day it happened, not when you logged it)
- **area** — one-word category: `briefing`, `ceo-os`, `registry`, `connector`, `auth`, `data`, `latency`, `prompt`, `other`
- **description** — what broke or annoyed you (one short sentence)
- **workaround** — what you did instead (or "none" if it just blocked you)
- **cost** — how much attention it cost: `s` (seconds), `m` (minutes), `h` (hours)
- **category** — leave blank during the week. Set on Friday to `A` (platform), `B` (instance-specific), or `C` (bug).

## Entries

| date       | area    | description | workaround | cost | category |
|------------|---------|-------------|------------|------|----------|
| 2026-06-04 | other   | (example — delete this row) Chief of Staff briefing said nothing actionable for 3 days running | none, but consider whether daily cadence is too frequent | m | |
| 2026-06-04 | data    | (example — delete this row) Registry showed 4 projects but real FoodTruck-IL has 12 active trucks; couldn't see them anywhere | opened Supabase SQL editor directly | h | |
| 2026-06-04 | latency | (example — delete this row) `/api/coo/briefing` took 47s, exceeds the 8s budget from test-plan-phase-5 | none, waited | m | |

## Weekly review process

Every Friday afternoon (or whenever you protect the platform-improvement slot):

1. Walk through every unclassified row above.
2. Set `category`:
   - **A** — Platform Improvement. Useful to 30-50%+ of future companies, industry/vendor/currency agnostic, configurable, passes AcmeCo Clone Test. Promote to AI-Company backlog.
   - **B** — Instance-Specific. Only useful to FoodTruck-IL or food-truck businesses generally. Stays inside `instances/yoni-company/*`.
   - **C** — Bug. Something the platform claims to do but doesn't. Fix in `packages/*` is OK without admission review.
3. Move classified rows into the closed-out section at the bottom (or leave in place; the column makes it grep-able).
4. The Category A list becomes input to the 20% effort window for the following week.

## Closed entries

(rows here have been classified and acted on — keep for retrospective)
