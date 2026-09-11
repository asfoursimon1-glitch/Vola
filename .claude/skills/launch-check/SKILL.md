---
name: launch-check
description: Walk the pre-launch readiness list for the VOLA storefront — what still blocks taking real money from real customers, and what is placeholder content. Use before going live, or to check what is left.
---

# Launch readiness

Work down in order. The first section is *blocking*: until it clears, a
customer cannot buy, or can buy and be misled.

## Blocking

- [ ] **Payment gateway is live, not test.** Shopify admin → Settings →
      Payments. Verified test-mode on 2026-09-12: the checkout prints
      *"1 to simulate an approved transaction"*, so no real card can be
      charged. Re-check by reaching the payment step and confirming those
      testing instructions are gone.
- [ ] **The bag total matches checkout.** Measured $690 on the bag and
      $759 at checkout — Shopify adds estimated tax, while `cart.html` says
      *Duties & taxes — Settled at delivery* and the help panel says prices
      exclude destination tax. Either Shopify stops charging it or the copy
      stops promising it. A total that jumps at the last step is a classic
      abandonment trigger.
- [ ] **`privacy.html` reviewed by a lawyer**, and its six named blanks
      filled: registration number, VAT, DPO, statutory retention,
      per-processor transfer mechanisms. Its `.devnote` banner comes out only
      when they are. Deferrable while nobody can buy; not once they can.
- [ ] **The `.devnote` banners are gone** from `account.html`,
      `register.html` and `track.html`. The auth ones remove themselves once
      `accountUrl` is set — confirm, do not assume.

## Storefront configuration

- [ ] **The Shopify theme redirects to the live site.** `layout/theme.liquid`,
      after `<head>` — see §7 of `docs/SHOPIFY.md`. Without it, *Continue
      shopping* on the thank-you page lands on a bare Shopify theme, and the
      `myshopify.com` storefront is a second, indexable copy of the shop.
- [ ] **Shipping rates are named in the right language.** A rate called
      `قياسي` was live on 2026-09-12.
- [ ] **Express wallets enabled** (Shop Pay, Google Pay). They were off. This
      is the one-tap checkout that actually moves conversion.
- [ ] `shopifyConfig.country` agrees with the store. It said `IT`; the store
      is registered in Lebanon and checkout defaults there in USD.

## Content still placeholder

See README's *Content to replace before launch* for the full list. The
objects that matter:

- [ ] `VOLA.house` in `app.js` — address, hours, email, phone, founding year,
      reply promise. Restated nowhere else, so this is the only edit.
- [ ] `VOLA.terms` in `app.js` — shipping threshold, flat rate, returns window.
- [ ] `VOLA.delivery` in `app.js` — countries and zone times.
- [ ] `data.js` — products, mills, cloth weights, price bands, category
      intros, cost shares, commission prices, the size chart.
- [ ] **Tag the made-to-order pieces** `atelier` or `made-to-order` in
      Shopify. Untagged, the whole made-to-order story is switched off across
      the site — correctly, but probably not intentionally.
- [ ] A real catalogue. A product named `test-1` was live on 2026-09-12.

## Before the final deploy

- [ ] Run the `sync` skill, then the `verify` skill across the pages that
      changed.
- [ ] `copy-auditor` subagent for a derived-copy pass — the counts are only
      as honest as the data behind them.
