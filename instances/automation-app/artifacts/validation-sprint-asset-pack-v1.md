# Validation Sprint Asset Pack v1 — Automation App

**Instance:** Automation App (Customer #1) · **Sprint:** 14-day pre-build fake-door demand test
**Source:** E4 DOOS run, directive `b4355d01-9d30-4d16-a38c-e4d4456ab02d` (Chief of Staff, VP Marketing, CFO, CTO, COO)
**Portfolio (from E3):** Where Did I Park (HERO, $1.99) · Receipt Scan & File ($2.99) · Instant Audio-to-Action ($1.99) — all one-time IAP, no v1 subscription.
**Status:** Pre-product · zero customers · no real product is built or charged during this sprint.

---

## Section 1 — Executive Summary

The goal of this 14-day sprint is **demand proof before any code is written.** Three fake-door landing pages (one per v1 automation) present the real value proposition, the real price, and a mock "buy" flow that captures purchase intent without charging anyone. Traffic is **organic-first** (Reddit, short-form video, productivity communities), with a small paid backstop only if organic stalls. A go/no-go scorecard decides, on Day 14, which automations advance to build.

**Hard rule:** every page must instrument analytics *before* any traffic is sent — untracked traffic makes the go/no-go subjective and wastes the sprint. **Ethics rule:** the post-click screen must immediately state *"We're validating demand — you won't be charged."* Misleading a user before the first real customer exists is not worth the signal.

### Sprint operating rules (Chief Architect directives)

1. **Run in strict waves, not concurrently.** One automation per week, with a hard gate between each — you learn from each page and improve the next:
   - **Week 1 — Where Did I Park (HERO) only.** Establish the baseline. Gate: did it clear the thresholds in Section 7?
   - **Week 2 — Receipt Scan & File** — *only if Week 1 produced signal.* Apply Week 1's learnings to the page/copy.
   - **Week 3 — Instant Audio-to-Action** — *only if Week 2 produced signal.*
2. **Do not build any automation yet.** The entire purpose of this sprint is *validate before building.* Portfolio selected ≠ permission to build. The next real risk is **market demand**, and only the sprint retires it.
3. **Thresholds are inviolable — the biggest risk now is a false-positive demand signal.** Do **not** lower a threshold because you like an idea. The sprint's job is to **kill weak ideas cheaply.** Instrument carefully; follow the Section 7 thresholds and the Section 8 decision rule exactly as written.

---

## Section 2 — Where Did I Park  (HERO · $1.99)

**Angle:** universal, relatable pain; zero learning curve; strongest viral-demo potential.

**Landing page**
- Headline: **"Never lose your car again."**
- Subhead: *"One tap saves your spot. One tap finds it. That's the whole app."*
- Body: *"Parked in a giant lot, an unfamiliar street, level 4 of a garage? Tap once when you park. When you're ready to leave, tap once to walk straight back. No accounts, no clutter, no subscription."*
- Visual: a 15-second screen recording of save → walk away → retrieve (this doubles as the primary ad asset).
- **CTA button:** **"Reserve My Spot — $1.99 at launch"**
- Post-click screen: *"You're on the list — and we're validating demand, so **you won't be charged today.** Drop your email and you'll get it first (and at launch price)."* → email capture.

**Pricing presentation:** single one-time **$1.99**, shown as *"$1.99 once. Yours forever. No subscription."*

**Validation metrics:** unique visitors · CTA click-through rate (CTR) · absolute CTA clicks · email captures · (secondary) social shares. **Primary signal: CTR + absolute clicks** — this is the highest-traffic page and sets the sprint's demand floor.

---

## Section 3 — Receipt Scan & File  ($2.99)

**Angle:** "serious utility"; lead with the *outcome*, not the feature; explicitly out-position free/complex tools (Expensify free tier, Apple Wallet, Google Photos).

**Landing page**
- Headline: **"Receipts filed and searchable in 10 seconds."**
- Subhead: *"Snap it. We categorize it, file it, and make it searchable. No subscription. One tap. Done."*
- Body: *"Shoebox of receipts? Tax season dread? Take a photo — it's auto-categorized (meals, travel, supplies), filed, and instantly searchable. Not an expense suite you have to learn. One job, done well."*
- Contrast line: *"Free apps make you do the filing. This does it for you."*
- **CTA button:** **"Reserve Early Access — $2.99 at launch"**
- Post-click screen: *"You won't be charged today — we're testing demand. **Would you pay $1.99 instead?** (yes / no)"* + email capture. *(The price question isolates "wrong price" from "wrong product.")*

**Pricing presentation:** one-time **$2.99** (portfolio's highest), framed *"one-time, no subscription."* Price-sensitivity probe captured on the post-click screen.

**Validation metrics:** visitors · CTR · absolute clicks · email captures · **price-sensitivity split ($1.99 vs $2.99)**. Watch for price suppressing the signal.

---

## Section 4 — Instant Audio-to-Action  ($1.99)

**Angle:** AI-native differentiator; the single hammer is *"not a transcript — a to-do list."* Out-position Otter.ai, Apple Transcription, ChatGPT voice.

**Landing page**
- Headline: **"Your voice memos, turned into a to-do list."**
- Subhead: *"Not a transcript. Actual action items — extracted, organized, and ready to do."*
- Body: *"That voice-memo graveyard of ideas you never acted on? Speak it, and get back a clean checklist of next steps — not a wall of text. Built for the moments your hands are full."*
- Contrast line: *"Transcription tools give you words. This gives you what to do with them."*
- **CTA button:** **"Reserve My Spot — $1.99 at launch"**
- Post-click screen: *"You won't be charged today. Drop your email for first access."* → email capture.

**Pricing presentation:** one-time **$1.99**, *"once, no subscription."*

**Validation metrics:** visitors · CTR · absolute clicks · **email captures (weighted equally with CTR for this automation)** — productivity audiences research before buying, so capture rate is the more reliable 14-day signal.

---

## Section 5 — Channel Plan  (organic-first)

| Channel | Automation | Tactic | Target |
|---|---|---|---|
| Reddit (organic) | Where Did I Park | Problem-story threads in r/mildlyinfuriating, r/CasualConversation, r/LifeProTips; link in comments/bio | 200–300 visits / 7d, $0 CAC |
| TikTok/Reels (social) | Where Did I Park | 3× 15–30s "I lost my car again" shorts, end-card link | 150+ referrals, 50+ emails |
| Reddit (organic) | Receipt Scan | r/freelance, r/digitalnomad, r/personalfinance — tax-season receipt pain | 150–200 high-WTP visits |
| Twitter/X (social) | Receipt Scan | 5-tweet "tax receipt hell" thread + poll | 100+ clicks; poll informs copy |
| Twitter/X + LinkedIn (social) | Audio-to-Action | "Voice-memo graveyard" posts, #productivity #GTD #PKM | 120–180 high-intent visits |
| Reddit (organic) | Audio-to-Action | r/productivity, r/gtd soft-launch "testing interest" post | 50–100 visits; upvotes = proxy |
| ProductHunt Ship (product) | All 3 | "Upcoming" pages, pre-launch email collection | 50–100 waitlist/automation |
| Meta paid (backstop) | Where Did I Park | **$50 ad, Day 8 only if HERO <200 visitors by Day 7** | 100 cold visits; isolates CTR |

Backstop: keep 2–3 reserve subreddits + a **$100 paid reserve** ready if organic is under-indexed by Day 5.

---

## Section 6 — Content Plan

- **Tone:** authentic problem-framing, no hard sell ("testing an app that fixes this — would you try it?"). Lead with the pain, link the fake-door page.
- **Hero asset:** the 15-second Where-Did-I-Park demo video — reusable across TikTok, Reels, and the landing page.
- **Per automation:** 1 problem-story (Reddit) + 3 short-form videos or tweets + 1 community soft-launch post.
- **Sequencing:** HERO content goes live **24–48h before** the other two so the post format can be tuned on the highest-traffic automation first.
- **Always-on:** ProductHunt "Upcoming" pages collect emails for the entire sprint.

---

## Section 7 — Go/No-Go Scorecard  (per automation)

Instrument **before Day 1**: GA4 / pixel + heatmap + CTA-click events + email-capture events. Untracked traffic = invalid sprint.

| Metric | GO threshold (14 days) | NO-GO |
|---|---|---|
| Unique visitors | ≥ 200 | < 100 |
| CTA click-through rate | ≥ 5% | < 2% |
| Absolute CTA (purchase-intent) clicks | ≥ 30 | — |
| Email captures | ≥ 50 (equal weight for Audio-to-Action) | — |
| Qualitative pain confirmations | ≥ 10 (comments/replies) | recurring "free apps already do this" |

**Decision rule:** an automation advances to build **only if it clears CTR *and* absolute clicks *and* email captures.** Clearing one or two = hold, not go. **Day 7 mid-sprint read** is a hard checkpoint: drop or paid-test under-indexed automations rather than waste week two.

---

## Section 8 — Day-14 Decision Template

```
AUTOMATION: ______________________      PRICE: $______
Visitors: ____   CTR: ____%   CTA clicks: ____   Emails: ____   Pain confirmations: ____
Price probe (Receipt only): $1.99 ___  / $2.99 ___

Thresholds cleared?   CTR [ ]   Absolute clicks [ ]   Email captures [ ]
DECISION:  ☐ GO (advance to build)   ☐ HOLD (1–2 thresholds)   ☐ NO-GO (pivot / drop)
If NO-GO, reason:  ☐ wrong price   ☐ wrong product   ☐ traffic too low to judge
Next action: ____________________________________________
```

**Portfolio decision (all 3):** rank by signal strength; build the strongest 1–2 first (waved launch per E3: HERO solo → +Receipt → +Audio); park the rest. Begin Quick Publisher API applications in parallel regardless (4–12wk lead time) for v2.

---

*Compiled from the E4 executive reports (CoS `74cb7d87`, VP Marketing `c6faf505`, CFO `817913ee`, CTO `eb9cc636`, COO `e8b26923`). This is an instance-layer deliverable; the platform stays generic. A future generic "Executive Deliverable Compiler" capability (backlog L24) would produce this artifact automatically from the 5 reports.*
