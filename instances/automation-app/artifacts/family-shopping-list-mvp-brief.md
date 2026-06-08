# Family Shopping-List Consolidation — MVP Brief

**Instance:** Automation App (Customer #1) · **Automation #1**
**Source:** E1 DOOS run, directive `348a535f-aee3-412d-8d66-5d702470243e` (Chief of Staff, CTO, VP Marketing, CFO)
**Status:** Pre-product · zero customers · demand-validation stage

---

## 1. Problem statement
Families coordinate grocery needs across scattered WhatsApp/SMS messages and verbal requests. The result is duplicated items, forgotten requests, and no single agreed list before a shopping trip. Existing list apps (AnyList, OurGroceries, Bring!, Listonic) require everyone to manually open the app and type — they do not ingest the channel families *already* use (WhatsApp). The unaddressed job: turn the messy family message stream into one deduplicated, categorized, owner-approved list with near-zero effort.

## 2. Target customer
Primary: the household manager, age 28–45, in a family of 3+, who uses WhatsApp as the primary family communication channel and already receives shopping requests there. Secondary: couples and roommate groups coordinating shared purchases. Both are reachable in the validation phase via organic parenting/household social content — no paid media required.

## 3. User flow
1. User connects their personal WhatsApp to the app's bot.
2. Family members text/forward items to a shared bot number (or tag messages).
3. The app's AI deduplicates and categorizes items in real time (produce, dairy, household, …).
4. The owner receives a push notification with the consolidated list and a one-tap approve / edit screen.
5. On approval the list is delivered (and optionally exported to Notes/Reminders or a store cart).
This maps natively onto the marketplace's `open → choose → pay (IAP) → connect → run → result/approval` pattern.

## 4. Feature scope (MVP, iOS-first)
- WhatsApp inbound webhook receiving family messages.
- AI deduplication + categorization (structured-output LLM) of items.
- Push notification to the owner with an approve/edit screen.
- `$2.99` one-time IAP gate before first list delivery.
- Optional: one-tap copy/export of the final list.

## 5. Out of scope (v2+)
SMS inbound; multi-family / multi-admin accounts; in-app cart checkout; receipt scanning; Android; web interface; family-invite flow (v1 is single-owner WhatsApp bot to remove permission friction).

## 6. Pricing hypothesis
`$2.99` one-time IAP per activation (App-Store impulse-buy zone, below the $5 resistance threshold); no free tier (a free tier destroys the demand signal). A/B test `$1.99 / $2.99 / $4.99`, plus a `$4.99` "Family Pack" to probe willingness-to-pay uplift from the social-utility framing. Comparable apps charge `$4–8/month`; a one-time price removes subscription fatigue for an unproven product.

## 7. Validation plan (14-day fake-door sprint, pre-build)
- Days 0–2: ship a no-code landing page showing the WhatsApp → deduped list → approval flow, with a fake "`$2.99` Get Early Access" IAP CTA + waitlist capture.
- Days 3–7: organic seeding — TikTok/Instagram Reels of the "messy family WhatsApp" pain, 3–5 Reddit threads (r/Parenting, r/Cooking), WhatsApp/Facebook household groups (UTM-tagged).
- Days 8–14: micro-influencer barter reels (family-organizer niche). No paid spend until ≥5% IAP-intent CTR is observed.

## 8. Success metrics & go/no-go
- **GO** if, within 14 days: ≥200 landing-page visitors **and** ≥30 IAP-intent taps (≥5% CTR) **and** ≥10 qualitative pain confirmations.
- **NO-GO** if <100 visitors, or <2% IAP CTR, or the recurring objection is "free apps already do this" → pivot the same sprint to **Receipt Scan & File** (the CFO's runner-up; cleaner monetization, camera-only, lower channel risk).
- Funnel instrumented from day one: awareness → waitlist → IAP-intent tap → declared purchase intent.

---

*Evidence basis: synthesized from the E1 executive analyses (Chief of Staff report `56f1b505`, VP Marketing report `d50375ab` with ~40 E2-tier research sources, CTO report `d47c2df4`, CFO dissent report `ba5069dc`). No primary customer evidence yet — the validation plan above generates the first primary signal.*
