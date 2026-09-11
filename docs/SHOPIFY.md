# Connecting VOLÀ to Shopify

This site is static — no server, no build step. That constraint decides how
each kind of Shopify data reaches it, and the three answers are different.

| What | How | Why |
|---|---|---|
| **Catalogue** | Build time — `node tools/shopify-sync.mjs` writes `assets/js/core/data.js` | Every page reads `VOLA.products` synchronously, and every derived figure on the site is computed from it. A generated file keeps the shop static, fast, and working when Shopify is slow. |
| **Cart & checkout** | Runtime — Storefront Cart API → Shopify's hosted checkout | Inventory and totals must be current, and the checkout URL is issued per cart. |
| **Accounts & orders** | Runtime — Storefront Customer API | Sign-in, registration, reset and order history become real. |

Nothing is required all at once. With no store configured the site runs on the
local catalogue exactly as it does today, and every seam stays in demo mode.

---

## 1. Create the Storefront API credentials

Shopify admin → **Settings → Apps and sales channels → Develop apps →
Create an app → Configure Storefront API scopes**.

Tick:

```
unauthenticated_read_product_listings
unauthenticated_read_product_inventory
unauthenticated_write_checkouts
unauthenticated_read_checkouts
unauthenticated_write_customers
unauthenticated_read_customers
```

Install the app, then copy the **Storefront API access token**.

> The Storefront token is public by design — it is meant to ship in a browser
> and is scoped so it cannot read orders, customers or anything
> administrative. Do not confuse it with the **Admin API token**, which is a
> secret and must never appear in this directory or in git.

Put the domain and token in `assets/js/integrations/shopify-config.js`. Use the
`*.myshopify.com` domain, not your custom one.

---

## 2. Create the metafield definitions

The site publishes far more per piece than Shopify models natively — cloth
weight, mill and hours, fit advice, cost structure. Those live in metafields.

Shopify admin → **Settings → Custom data → Products → Add definition**.
Namespace `vola` for all of them.

| Key | Type | Example | Drives |
|---|---|---|---|
| `denim_oz` | Decimal | `14` | Cloth spec, weight filter, homepage weight routes |
| `denim_hand` | Single line text | `rigid` \| `gives` \| `soft` | Cloth spec |
| `denim_fade` | Single line text | `high` \| `low` \| `none` | Cloth spec, raw-denim care regimen |
| `denim_note` | Multi-line text | *"Unsanforised and unwashed…"* | Cloth spec, Fit Studio, Care |
| `mill` | Single line text | `Kaihara` | Provenance, mill record, homepage counts |
| `mill_city` | Single line text | `Hiroshima` | Provenance |
| `mill_country` | Single line text | `Japan` | Mill record |
| `mill_since` | Integer | `1893` | Mill record, "oldest mill" |
| `atelier_hours` | Integer | `11` | Provenance, traceability totals, care page |
| `atelier_hands` | Integer | `3` | Provenance |
| `edition` | Single line text | `Numbered edition of 60` | Provenance, made-to-order |
| `atelier_note` | Multi-line text | *"Cut and finished in Florence…"* | Product accordion |
| `fit_cut` | Single line text | *"High-rise, moulded through the hip"* | Fit & sizing, Fit Studio table |
| `fit_advice` | Single line text | `up` \| `true` \| `down` | **Size recommendation everywhere** |
| `fit_model` | Single line text | *"Model is 178cm and wears a 26"* | Fit & sizing |
| `build` | Single line text | `core` \| `atelier` \| `accessory` \| `footwear` | Price breakdown profile |
| `composition` | Single line text | `100% Japanese cotton selvedge, 14oz` | Accordion, care regimens |
| `care` | List of single line text | `["Cold wash inside out", …]` | Care page |
| `flag` | Single line text | `Signature` | The badge on cards |
| `colour_hex` | JSON | `{"Raw Indigo":"#243352"}` | Colour swatches |

**A piece with none of these still imports.** It loses the cloth spec, the
provenance block and the fit guidance, and the sync tells you which pieces and
what they lost. Start with `fit_advice`, `denim_oz` and `mill` — those three
carry the most.

### What Shopify already provides

| Site field | From |
|---|---|
| `id` | product handle |
| `name` | title |
| `category` | **product type**, lowercased — must match a slug in `CATEGORIES` |
| `price` | first variant price, rounded |
| `blurb` | first line of the description |
| `sizes` / `soldOut` | variant option "Size" (or "Waist") + real inventory |
| `colours` | variant option "Colour" |
| `images` | product images |
| `tag` | tags — `atelier`/`made-to-order` → atelier, `new` → new, else core |

Name your variant options **Size** and **Colour** (or Color/Waist — the sync
matches loosely). Set **product type** to match your categories exactly:
`Jeans`, `Shirts`, `Corsets`, `Jackets`, `Dresses`, `Belts`, `Handbags`,
`Shoes`, `Heels`.

---

## 3. Sync the catalogue

```bash
node tools/shopify-sync.mjs --dry     # look first
node tools/shopify-sync.mjs           # write assets/js/core/data.js
```

It rewrites **only** the `PRODUCTS` array. Categories, cloth weights, cost
profiles, the size chart, care regimens, commission disciplines and reviews
are editorial that Shopify has no opinion about, and are preserved byte for
byte.

It also warns about the failure that costs the most time: a **product type
that matches no category**. Such a piece still lists in the collection but
gets no homepage tile, no category filter and no breadcrumb.

Run it whenever the catalogue changes, and in CI before deploying:

```bash
SHOPIFY_DOMAIN=… SHOPIFY_STOREFRONT_TOKEN=… node tools/shopify-sync.mjs
```

To reproduce a bug against a recorded payload — **no store or token needed**,
which is the point of it:

```bash
SHOPIFY_MOCK=tools/fixtures/products.json node tools/shopify-sync.mjs --dry --json
```

The fixture deliberately contains a product type (`scarves`) that matches no
category, so this command also demonstrates the warning described above.

> **Sync before you sell.** Checkout needs the variant IDs the sync writes.
> Until then the bag will refuse with *"This catalogue has not been synced
> from Shopify yet"* rather than pretending.

---

## 4. What turns on by itself

Once `domain` and `storefrontToken` are set, `shopify.js` replaces the demo
seams. Nothing else needs editing.

- **Checkout** — the bag builds a Shopify cart and redirects to the hosted
  checkout. The delivery-address fields are hidden automatically, because
  Shopify collects the address on the next step and asking twice is worse
  than asking once. Email and the atelier note are kept and passed through as
  cart attributes, along with saved sizes if the shopper has a fit profile.
- **Sign in / register / reset** — **depends on which generation of customer
  accounts the store is on.** See §4a; on this store it is a hand-off, not a
  form. On a *classic*-accounts store these are real Storefront API calls, and
  the privacy choices from the demo are preserved: one generic failure
  message, and an already-registered email during sign-up answered as if it
  worked rather than confirming the address exists.
- **Order history** — real orders on the tracking page for a signed-in
  customer, on a classic-accounts store. On new accounts it moves to the
  hosted account page with everything else.
- **Stale sessions** — a stored session is re-checked against Shopify on
  load, so an expired token cannot leave the header claiming somebody is
  signed in. On new accounts there is no local session at all, which is the
  same guarantee reached by a shorter route.

### 4a. Customer accounts: which generation, and why it decides the UI

Shopify runs two, and they are not a skin apart:

| | Classic | New (this store) |
|---|---|---|
| Credential | email + password | none — Shop, or a one-time email code |
| Sign-in runs | here, via Storefront API | on Shopify's own page |
| `customerAccessTokenCreate` | works | nothing to check a password against |
| Orders readable by | Storefront token | Customer Account API token |

Check with the Admin API — `shop { customerAccountsV2 { customerAccountsVersion } }`
— not by looking at the theme.

**On new accounts a password form here cannot authenticate anyone**, and
there are no Google or Apple buttons to add either: Shopify does not offer
them as separate options, and Facebook not at all. What its page offers is
*Continue with Shop* and an emailed code, and that is the whole recommended
set. Buttons for anything else would be a shopfront with nothing behind it.

So `accountUrl` in `shopify-config.js` switches account.html, register.html
and track.html to a hand-off: the options named in plain words, one button to
Shopify's page. Leave it blank and the demo forms stay, which is the honest
state for an unconfigured build.

The site keeps **no session afterwards**. The token that flow issues belongs
to the Customer Account API, which this site has no client ID for, so the
browser never learns who came back — and `isSignedIn()` stays false rather
than a header asserting something nothing can verify. Two consequences worth
knowing before you file them as bugs:

- The header never shows a signed-in dot, on purpose.
- `account.html` never reaches its signed-in view. Being signed in is a fact
  about Shopify's page, and that is where it is shown.

Three sentences elsewhere derive from the same flag, because they contradict
it otherwise: the "what an account adds" list drops *measurements on every
device* (the fit profile is `localStorage` and syncs nowhere), the help-centre
answer *Do I need an account* stops saying "there are none", and track.html's
lede stops saying there is nothing to sign in to. The `.devnote` preview
banners on `account.html` and `register.html` remove themselves.

**To get a real on-site session instead**, you need the Customer Account API
with OAuth/PKCE: a Headless channel in admin for a public client ID, and the
site's origin allowlisted as a callback. That is a different piece of work
from this one, and it buys back the on-site signed-in state and order history.

Remove the `.devnote` banners from `account.html`, `register.html` and
`track.html` when you go live — the three auth ones now remove themselves once
`accountUrl` is set, so this applies to whichever are left — they exist to stop a preview being mistaken
for the real thing.

> There is a fourth `.devnote`, on `privacy.html`. **Leave it.** It is not
> about Shopify and connecting a store does not resolve it — it marks a draft
> policy with named blanks that needs a lawyer. See its own banner.

---

## 5. The one gap: guest order lookup

The Storefront API **cannot** look up an order by number and email. That
needs the Admin API, which needs a secret, which needs a server. Signed-in
customers get real orders; guests currently get *"Sign in to see your orders,
or write to us."*

A serverless function closes it. Deploy this to Vercel / Netlify / Cloudflare
and point `VOLA.orders.lookup` at it:

```js
// api/order-lookup.js  — Vercel style
export default async function handler(req, res) {
  const { number, email } = req.body || {};
  if (!number || !email) return res.status(400).json({ error: 'not_found' });

  const r = await fetch(
    `https://${process.env.SHOPIFY_DOMAIN}/admin/api/2025-07/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN  // secret
      },
      body: JSON.stringify({
        query: `query($q: String!) {
          orders(first: 1, query: $q) { edges { node {
            name processedAt displayFulfillmentStatus statusPageUrl
            shippingAddress { country }
            currentSubtotalPriceSet { shopMoney { amount } }
            currentTotalPriceSet { shopMoney { amount } }
            fulfillments { trackingInfo { company number url } }
            lineItems(first: 20) { edges { node {
              title quantity variant { title product { handle } } } } }
          } } }
        }`,
        variables: { q: `name:${String(number).replace(/\D/g, '')} AND email:${email}` }
      })
    }
  );

  const body = await r.json();
  const order = body?.data?.orders?.edges?.[0]?.node;

  // One indistinguishable answer for every failure: a different response for
  // a real order number with the wrong email tells an attacker the number is
  // real. Rate limit this endpoint too — the pair is brute-forceable.
  if (!order) return res.status(404).json({ error: 'not_found' });
  return res.status(200).json(order);
}
```

Then in `shopify.js`, replace the guest branch of `V.orders.lookup` with a
`fetch('/api/order-lookup', …)` and map the response the same way `mapOrder`
does. The tracking page needs no changes — it renders whatever shape it is
given.

---

## 6. What Shopify does not cover

- **Reviews.** Shopify has no native review API. This site reads Judge.me,
  synced at build time by `tools/judgeme-sync.mjs` alongside the catalogue —
  see **REVIEWS.md**. Run both before deploying:

  ```bash
  node tools/shopify-sync.mjs && JUDGEME_TOKEN=… node tools/judgeme-sync.mjs
  ```

  The Judge.me token is **private** and must never reach the browser, which is
  why reviews are synced rather than fetched. `VOLA.reviews` ships empty until
  that sync runs, and the site degrades to an honest "No reviews yet"
  throughout. Note the custom questions in REVIEWS.md: without them Judge.me
  collects no fit verdict, and the true-to-size figures have nothing to count.
- **The newsletter.** Klaviyo, at runtime, via the public company ID that is
  safe to ship in a browser — see **NEWSLETTER.md**. It used to say "you are
  on the list" and send nothing. Note `doubleOptIn`: Klaviyo answers 202
  either way, so the flag has to match the list or the site is back to
  claiming a subscription that has not happened.
- **The contact and commission forms.** A Formspree endpoint — see
  **CONTACT.md**. Both used to fake an 800ms send, announce success and delete
  the saved draft. The draft is now cleared only on a confirmed response.
- **The editorial data** — categories and their intros, cloth weight bands,
  cost profiles, the size chart, care regimens, commission disciplines and
  prices, the house record in `VOLA.house` and `VOLA.terms`. These are
  judgements, not inventory. They stay in `data.js` and `app.js`.
- **Gift cards.** Shopify issues them natively; the site has no gift page yet.

---

## 7. Coming back from checkout

Checkout is hosted by Shopify, and the thank-you page after it is Shopify's
too. **It cannot be scripted.** Additional scripts on the order status page
were removed with checkout extensibility (28 Aug 2025), and a checkout UI
extension runs in a sandbox with no navigation API — it can render a link, it
cannot set `window.location`. So there is no automatic bounce off the thank-you
page, on any plan. Anything pasted into the old scripts box is inert.

What the thank-you page *does* offer is a **Continue shopping** button, and it
points at the online store root. So redirect the online store instead: the
button then lands the customer on VOLÀ, and the same edit catches anyone who
finds the bare `myshopify.com` storefront, which with a headless front end they
should never be seeing.

Online Store → Themes → ⋯ → Edit code → `layout/theme.liquid`, immediately
after `<head>`:

```liquid
{%- comment -%}
  VOLÀ is the storefront. This theme exists only so Shopify can host checkout,
  so every theme-rendered page belongs back on the real site — including the
  "Continue shopping" button on the thank-you page, which points here.

  Why here and not on the thank-you page: that page is no longer scriptable
  (see above). A redirect on the destination is the only one that still runs.

  Skipped in the theme editor, or the theme becomes uneditable, and skipped
  for the paths Shopify must keep serving. A stray match in that list fails
  safe — the visitor simply stays on Shopify.
{%- endcomment -%}
{%- unless request.design_mode -%}
  {%- assign path = request.path -%}
  {%- unless path contains '/cart' or path contains '/checkout' or path contains '/account' or path contains '/tools' or path contains '/apps' or path contains '/password' or path contains '/challenge' -%}
    <script>
      window.location.replace('https://asfoursimon1-glitch.github.io/Vola/');
    </script>
  {%- endunless -%}
{%- endunless -%}
```

Checkout itself is unaffected: it is not theme-rendered, and the cart
permalink `shopify.js` sends the shopper to is a redirect, not a theme page.

> Change the URL above if the site moves to a custom domain. It is written out
> here because a Liquid file in the Shopify admin cannot read `VOLA.house` —
> this is the one place the site's own address is restated, and it is outside
> this repo. Grep for it when the domain changes.

---

## Troubleshooting

**"Shopify returned 401"** — wrong token, or the app is not installed.

**Sign-in rejects a customer who definitely exists** — the store is on new
customer accounts and that customer has no password, so there is nothing for
`customerAccessTokenCreate` to match. It answers `UNIDENTIFIED_CUSTOMER` for
everyone, which looks like a wrong password and is not. Set `accountUrl`; §4a.

**The sign-in form has disappeared** — `accountUrl` is set, so the page hands
off instead. Clear it to get the demo forms back.

**The header never shows anyone as signed in** — correct under §4a, and not
fixable without the Customer Account API. The site cannot see that flow's
token, so it declines to claim a session it cannot verify.

**A product is missing from the shop** — its product type matches no category.
Run `--dry` and read the warning.

**Sizes look wrong** — the variant option is not named Size/Waist, or a size
shows as sold out because *every* colour in it is unavailable (which is
correct).

**Checkout says the catalogue has not been synced** — it hasn't. Run the sync.

**The thank-you page still ends on Shopify** — it always will; it is Shopify's
page and cannot redirect itself. §7 moves the *Continue shopping* button. If
that button still lands on the Shopify theme, the snippet is missing from the
**live** theme (Horizon is the published one) or the path is in its skip list.

**The theme editor shows a blank redirecting page** — the `request.design_mode`
guard is missing from the snippet.

**Prices are rounded** — deliberate. The site displays whole units throughout.
If you sell at `690.50`, change `Math.round` in `mapProduct` and `V.money` in
`app.js` together.
