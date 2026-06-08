# Dashboard Auth Gate — why it's cookie-backed, not Basic-Auth-only

## TL;DR

The dashboard is gated by `apps/executive-dashboard/proxy.ts` (Next 16 Proxy,
formerly Middleware). It accepts an HTTP **Basic Auth** challenge **once**, then
issues a secure **HttpOnly cookie** that authenticates every subsequent request.
Do **not** revert to a Basic-Auth-only gate: it breaks navigation in the App
Router.

## Why Basic Auth alone breaks the App Router

In the App Router, clicking a `<Link>` does **not** trigger a full page load.
The router issues a background `fetch()` for the destination's **RSC payload**
(requests carrying an `RSC` header, with `.rsc` / `.segments` URLs). The page
HTML you see is only fetched on the very first hard load.

HTTP Basic Auth relies on the browser replaying the cached `Authorization:
Basic …` header. The browser does this for **top-level navigations**, but **not
reliably for `fetch()`/prefetch requests** — Chrome in particular does not
attach cached Basic credentials to them. So with a Basic-Auth-only gate:

- The first hard load works (browser sends `Authorization`, prompted once).
- Every in-app link click fires an RSC `fetch()` **without** credentials.
- The gate returns `401` with a plain-text body (`Authentication required`).
- That body is **not a valid RSC payload**, so the router can't parse it and
  the soft navigation **silently aborts** — the symptom is *"clicking links
  does nothing."* A manual full reload of the same URL still works, which makes
  it look like only the links are broken.

This only manifests where the gate is actually enforced — i.e. **production /
Vercel**, where `DASHBOARD_BASIC_AUTH_USER` and `DASHBOARD_BASIC_AUTH_PASSWORD`
are set. Local dev leaves both unset, so the gate is bypassed and links work,
which is why the bug doesn't show up locally.

## How the cookie gate fixes it

1. First request with no cookie → `401` + `WWW-Authenticate`, browser prompts.
2. Browser resends with `Authorization: Basic …`. The proxy validates it and
   responds with `Set-Cookie: __dash_auth=<token>` (HttpOnly, Secure on HTTPS,
   `SameSite=Lax`, 12h).
3. The browser then sends that cookie on **every** same-origin request —
   including RSC / prefetch `fetch()`es — so soft navigation works.

The cookie value is `SHA-256("v1:<user>:<pass>")`. It's stateless (the edge gate
recomputes and compares it per request, no session store), preimage-resistant
(can't be reversed to the password), and HttpOnly (not readable by JS).

`.rsc` requests are **never** exempted from the gate — an unauthenticated RSC
request is blocked exactly like a page request. The cookie, not an exemption,
is what lets authenticated navigation through.

## Required env (unchanged)

Set both on Vercel Production (and Preview if used):

| Variable                        | Notes                                  |
| ------------------------------- | -------------------------------------- |
| `DASHBOARD_BASIC_AUTH_USER`     | Username for the initial Basic prompt. |
| `DASHBOARD_BASIC_AUTH_PASSWORD` | Strong secret (≥24 random chars).      |

If either is unset in production the dashboard is **publicly accessible**.

## Verified behavior (HTTP layer)

| Scenario                              | Result                          |
| ------------------------------------- | ------------------------------- |
| Page load, no auth                    | `401` (blocked)                 |
| Page load, valid Basic Auth           | passes gate, sets `__dash_auth` |
| RSC fetch with valid cookie           | passes gate (reaches the app)   |
| RSC fetch with no cookie              | `401` (blocked)                 |
| RSC fetch with bad cookie             | `401` (blocked)                 |
