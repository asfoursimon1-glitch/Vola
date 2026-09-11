---
paths:
  - "tools/*.mjs"
---

# House rules for the sync tools

```bash
node tools/shopify-sync.mjs                    # catalogue → data.js
JUDGEME_TOKEN=… node tools/judgeme-sync.mjs    # reviews → data.js  (--dry, --json)
node tools/fonts-fetch.mjs                     # woff2 + fonts.css + OFL.txt
```

Node 18+, no dependencies, and it stays that way.

- **Rewrite only the array you own** in `data.js`. Everything else in that
  file is hand-written and must survive a run untouched.
- **Strip your own prior banner** before writing, so reruns are idempotent.
- **Skip rather than guess when matching is ambiguous.** Two candidate
  products is a warning, not a coin flip. A wrong match is worse than a
  missing one, because nobody goes looking for it.
- **`process.exitCode`, never `process.exit()`** — it trips a libuv assertion
  on Windows here.
- **Credentials come from `process.env`, never from a file in this repo.**
  The Judge.me API token, the Shopify Admin token and the Klaviyo private key
  are private; this directory is served publicly by GitHub Pages. The public
  ones (Storefront token, Klaviyo company ID, Formspree endpoint, Plausible
  domain) belong in `shopify-config.js` and ship in the browser by design.

## Offline runs

`tools/fixtures/` holds recorded responses, so a bug can be reproduced with
no store and no token:

```bash
SHOPIFY_MOCK=tools/fixtures/products.json node tools/shopify-sync.mjs --dry --json
JUDGEME_MOCK=tools/fixtures/judgeme.json node tools/judgeme-sync.mjs --dry
```

The products fixture deliberately contains a product type (`scarves`) that
matches no category, so that command also exercises the ambiguity warning.

## What the tags mean

`pickTag()` reads the Shopify product tags. A piece tagged `atelier` or
`made-to-order` drives the made-to-order story across the site — the
traceability card, the homepage editions card, the shop filter, the returns
exclusion. With none tagged, all of that correctly disappears rather than
rendering a nought. See `.claude/agents/copy-auditor.md` for why.

## CRLF

Fixed once already (`ce44401`). These tools run on Windows here; do not
assume `\n`.
