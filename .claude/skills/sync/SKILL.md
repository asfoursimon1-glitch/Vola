---
name: sync
description: Run the build-time syncs that pull the Shopify catalogue, Judge.me reviews and the self-hosted fonts into the repo. Use when products or reviews have changed in an admin and the site needs to catch up, or when a sync's output looks wrong and needs reproducing offline.
---

# The build-time syncs

Three tools, Node 18+, no dependencies. Each rewrites **only** the array it
owns in `assets/js/core/data.js`.

```bash
node tools/shopify-sync.mjs                    # catalogue → data.js
JUDGEME_TOKEN=… node tools/judgeme-sync.mjs    # reviews → data.js
node tools/fonts-fetch.mjs                     # woff2 + fonts.css + OFL.txt
```

Both content syncs before a deploy:

```bash
node tools/shopify-sync.mjs && JUDGEME_TOKEN=… node tools/judgeme-sync.mjs
```

## Credentials

`JUDGEME_TOKEN` is **private** and must never be written into a file in this
repository — it is served publicly by GitHub Pages. Pass it on the command
line, or from Actions secrets in CI. This is why reviews are synced at build
time rather than fetched in the browser.

Shopify's catalogue sync can take `SHOPIFY_DOMAIN` and
`SHOPIFY_STOREFRONT_TOKEN` from the environment, but does not need to — the
Storefront token is public by design and already sits in
`assets/js/integrations/shopify-config.js`.

## Dry runs and offline reproduction

Always available with no store and no token:

```bash
SHOPIFY_MOCK=tools/fixtures/products.json node tools/shopify-sync.mjs --dry --json
JUDGEME_MOCK=tools/fixtures/judgeme.json node tools/judgeme-sync.mjs --dry
```

## After a sync, check the derived copy

The catalogue drives counts across the site, and a count reaching zero is the
recurring failure. In particular, `pickTag()` only marks a piece as
made-to-order when its Shopify tags include `atelier` or `made-to-order` —
with none tagged, the made-to-order story disappears site-wide. That is
correct behaviour, but it is usually a missing tag in Shopify rather than an
intention.

Run the `verify` skill's derived-copy sweep afterwards, or the `copy-auditor`
subagent for a fuller pass.

## Read a warning, do not dismiss it

These tools **skip rather than guess** when matching is ambiguous. A warning
about two candidate products means one review went unattached — find out
which, rather than rerunning and hoping.
