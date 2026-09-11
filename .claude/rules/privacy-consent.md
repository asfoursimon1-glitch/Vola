---
paths:
  - "assets/js/pages/privacy.js"
  - "assets/js/integrations/consent.js"
  - "privacy.html"
---

# Privacy and consent — do not casually change this

The privacy page contains no written claims. `privacy.js` computes every one
of them from the same config the runtime reads — the storage table, the
processor list, the legal bases, the retention rows, even a DOM scan for a
Google Fonts link. Set `analyticsConfig.storesOnDevice` on a service that is
actually running (`domain` filled) and six things move together, including
four sentences on that page. A service that is off needs no consent, so the
flag alone does nothing.

## The registration requirement

If you add anything that stores or reads data on the device, or contacts a
third party, **you must** register it in both places:

- `privacy.js` — in `KEYS`, `OWNERS` and `processors()`
- `consent.js` — in `services()`, with `stores:` and a category

Miss one and the privacy page becomes a lie, silently. That is the specific
failure this architecture exists to prevent, and it is silent by nature: the
page still renders, still looks authoritative, and is now wrong about what
the site does with a reader's data.

A key that is never written is not a lie — `privacy.js` inspects real storage
and marks the empty ones — so a registered-but-unused key is fine. An
unregistered one that *is* written is the problem.

## There is no cookie banner, and that is the finished behaviour

Zero cookies, cookieless analytics, self-hosted fonts, localStorage only for
what the reader asked for. The consent layer is built, derived, and renders
nothing until a service declares `storesOnDevice: true`.

**Do not "add a cookie banner": it would be a regression.** See
`docs/CONSENT.md`.

## privacy.html is a draft

Six named blanks — registration number, VAT, DPO, statutory retention,
per-processor transfer mechanisms, a lawyer's review — and a `.devnote`
banner saying so. **Print a named blank rather than inventing a legal
detail.** Leave that banner in place; connecting Shopify does not resolve it.

This stops being deferrable the moment real customers can buy.
