# Reviews — Judge.me

Every rating, every star and every true-to-size figure on this site is counted
from `VOLA.reviews` in `assets/js/data.js`. Nothing is asserted. The score on a
product **is** the average of the reviews printed underneath it; the
true-to-size percentage **is** the share of those reviewers who said so.

That array is now filled from Judge.me at build time, by
`tools/judgeme-sync.mjs`. Until you run it, the array is empty and the site
says so — "No reviews yet" on the product page, on the reviews page and in the
Fit Studio. Nothing is broken; there is simply nothing to report yet.

> The thirty-five reviews that used to live in `data.js` were written by hand
> so the review pages could be designed against realistic data. They are gone.
> Publishing invented reviews as genuine is illegal in most of the markets this
> site ships to.

---

## 1. Get a token

Judge.me admin → **Settings → Integrations → API tokens** → copy the private
API token.

**This token is private.** It can read and write every review on the shop. It
must never appear in this repository, in `shopify-config.js`, or in anything
that ships to a browser. It lives in your shell or in your CI secret store, and
only `tools/judgeme-sync.mjs` ever sees it.

That constraint is the reason reviews are synced at build time rather than
fetched in the page — see the header of `tools/judgeme-sync.mjs` for the full
argument.

## 2. Set the shop domain

In `assets/js/shopify-config.js`:

```js
window.VOLA.judgemeConfig = {
  shopDomain: 'your-store.myshopify.com',
  …
};
```

The domain is public. It is the only part of the Judge.me setup that belongs
in this file.

## 3. Add the custom questions — this is the important step

Judge.me collects a title, a body and a score. It does **not** ask how the
piece fitted unless you tell it to, and the fit verdict is the single most
useful thing this site knows about a garment. Without it:

- the true-to-size figure on every product page reads "No fit feedback yet";
- the "How it runs" column in the Fit Studio reads the same;
- the **How it fitted** filter on the reviews page disappears entirely;
- the size filter disappears too.

The reviews still publish and still count towards the average. They just carry
no sizing information, which on a denim site is most of the value.

In Judge.me: **Settings → Review form → Custom questions**. Create three, with
these titles and these answers:

| Question | Type | Answers |
| --- | --- | --- |
| `How did it fit?` | Single choice | `Ran small` · `True to size` · `Ran large` |
| `What size did you take?` | Single choice | your size run — `XS`–`XL`, or `24`–`32`, or `35`–`42` |
| `How long have you owned it?` | Single choice | `Less than a month` · `6 months` · `1 year` · `2 years` |

If you would rather word them differently, change the titles in
`judgemeConfig.questions` to match — the sync matches on the question text,
case-insensitively, and falls back to a substring match. The fit answers are
matched against `judgemeConfig.fitAnswers`, which you can extend with whatever
wording you actually use.

An answer the sync does not recognise is left **unanswered** rather than
guessed, and the sync prints a warning naming the answer. That is deliberate:
`reviewStats` divides the true-to-size share by the reviews that answered the
question, so an unrecognised answer costs one data point, whereas a guessed one
costs the truth.

The size question feeds the size filter and the "Size 27 · True to size" line
under each review. The ownership question feeds the "Longest owned" sort and
the "After a year" line — a sort option that disappears if nobody was asked.

Judge.me has no location field. If you want the city under a review, add a
custom question titled `Where are you?` — or any question whose title contains
`city` — and it will be picked up.

## 4. Run it

```bash
JUDGEME_TOKEN=… node tools/judgeme-sync.mjs
```

```bash
JUDGEME_TOKEN=… node tools/judgeme-sync.mjs --dry
```

`--dry` summarises and writes nothing. `--json` prints the mapped reviews.

The sync rewrites **only** the `REVIEWS` array in `data.js` — the catalogue,
the categories, the cost profiles, the size chart and the care regimens are
preserved byte for byte, exactly as `shopify-sync.mjs` leaves the reviews
alone. Run both before deploying:

```bash
node tools/shopify-sync.mjs && JUDGEME_TOKEN=… node tools/judgeme-sync.mjs
```

Order matters a little: the review sync matches reviews to pieces by handle
against whatever is in `data.js`, so sync the catalogue first and a new product
picks up its reviews on the same run.

## 5. Test the mapping without a shop

```bash
JUDGEME_MOCK=tools/fixtures/judgeme.json node tools/judgeme-sync.mjs --dry
```

`tools/fixtures/judgeme.json` is a recorded payload, deliberately messy: a
review in the older `question.title` shape, a fit answer that matches nothing,
a review with no custom answers at all, an unverified one, a spam one, an
unpublished one, and one for a product this catalogue does not sell. Expected
output is 5 usable reviews from 8, with 2 warnings.

Use the same flag to reproduce a mapping bug from a real export.

---

## What gets published, and what does not

A review reaches the site only if Judge.me says it is `published`, not
`hidden`, and not curated as spam or rejected. Moderation stays in Judge.me;
this sync never overrides it. A review with an empty body is skipped, as is one
whose product matches nothing in the catalogue — the sync names it in a warning
rather than writing a review nobody can click through to.

Matching is by Shopify handle first (the catalogue sync writes the handle as
the product id, which is what Judge.me sends), then by Shopify product id, then
by exact title, then by a word match that must resolve to exactly one piece.
Two candidates is a coin toss, not a near miss, so it is skipped and warned.

**"Verified purchase"** prints only where Judge.me marked the review verified
against a real order. It used to be hard-coded on every review, which is
exactly the kind of claim this site exists not to make.

## Fields

| Field | Source | Missing means |
| --- | --- | --- |
| `product` | handle → id → title match | review skipped, warned |
| `rating` | Judge.me score | review skipped |
| `title`, `body` | Judge.me | no body → skipped |
| `author` | reviewer name | "Anonymous" |
| `date` | `created_at` | — |
| `verified` | Judge.me verified flag | no badge |
| `size` | custom question | size line omitted, size filter shorter |
| `fit` | custom question, mapped | fit filter and true-to-size figures have nothing to count |
| `months` | custom question, parsed | "Longest owned" sort disappears |
| `place` | optional custom question | line omitted |

## Switching platforms

Nothing outside `tools/judgeme-sync.mjs` and the `judgemeConfig` block knows
Judge.me exists. Okendo, Loox, Yotpo and Stamped all expose the same shape —
a score, a body, a product reference and custom form answers. Write the
equivalent sync, emit the same fields into the same array, and the whole site
follows.
