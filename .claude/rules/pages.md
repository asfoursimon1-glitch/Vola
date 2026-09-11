---
paths:
  - "*.html"
---

# The 16 pages

Hand-written, no templating. **They must stay at the repository root** —
deployment is classic GitHub Pages serving `main` from the root, so moving
them breaks the site.

## Script order is identical on all 16 pages

Only the folder prefix differs; every path is `assets/js/<folder>/<name>`.

```
shopify-config.js  →  consent.js  →  analytics.js  →  data.js  →  app.js  →  [page scripts]
(integrations)        (integrations) (integrations)   (core)      (core)      (pages, + a
                                                                               shared core tail:
                                                                               auth/shopify/
                                                                               newsletter/motion/
                                                                               fit/faq/forms)
```

Consequences worth knowing before you reorder anything:

- `data.js` publishes `VOLA.products` **synchronously at script time**. Page
  scripts read it directly, not on `DOMContentLoaded`.
- `consent.js` and `analytics.js` load *before* `app.js`, so they cannot use
  `V.esc`, `V.toast` or `document.body` at boot. Their APIs are defined
  immediately; only their rendering is deferred.
- Page scripts go last and are named after the page (`shop.html` → `shop.js`).

## Do not restate a fact in markup

`VOLA.terms` (shipping threshold, flat rate, returns window) and `VOLA.house`
(address, email, phone, hours, reply promise) are the single sources of
truth in `app.js`. These were once written out in nine places. **Read them,
never retype them.**

Before writing any user-facing sentence in a page, ask: *can this go out of
date without anyone noticing?* If yes, compute it — and make sure it still
reads correctly when the count is zero.

## `.devnote` banners

They mark a preview that must not be mistaken for the real thing. The auth
ones on `account.html` and `register.html` remove themselves once
`accountUrl` is configured. The one on `privacy.html` **stays** — it marks a
draft policy with named blanks that needs a lawyer, and no amount of
configuration resolves it.
