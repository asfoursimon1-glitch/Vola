# Analytics — Plausible

**This site ships with analytics off, and it stays off until you fill in one
line.** Nothing loads, no request is made, and the privacy page says so:

> No analytics. No advertising pixels. No tracking cookies. This site does not
> know which pages you have visited, and nothing here is designed to find out.

That sentence was true, and it was one config line away from being false.

So it is not written down anywhere. The privacy page reads the same config the
measuring does, and swaps that paragraph for a description of what is being
collected the moment `analyticsConfig.domain` is filled in. **There is no way
to end up with analytics running and a page promising you have none.** That is
the whole point of this file.

---

## 1. Set it up

[Plausible](https://plausible.io) → add your site → copy the domain exactly as
you registered it.

```js
window.VOLA.analyticsConfig = {
  domain: 'vola.example',
  host: 'https://plausible.io',
  respectDoNotTrack: true,
  trackLocalhost: false,
  storesOnDevice: false   // true for any provider that writes to the device
};
```

`storesOnDevice` is the one that reaches outside this file: it is what
`consent.js` asks, and setting it `true` raises the consent banner and holds
this script back until permission is given. Plausible writes nothing, so it is
`false` — see **CONSENT.md**.

Self-hosting? Point `host` at your own instance. That puts analytics in the
same position as the fonts — nothing leaves your domain at all — and it is the
strongest version of this setup.

## 2. Why Plausible, and what changes if you swap it

Not preference. Each property does work:

| Property | What it buys |
| --- | --- |
| No cookies, nothing written to the device | **No consent banner.** ePrivacy regulates storing or reading data on the reader's device. Cookieless analytics does neither. |
| No personal data, no IP retention | No lawful-basis argument to have, and nothing to produce for a subject access request. |
| No cross-site profile | Nobody is followed off this domain. |
| EU-hosted | No international transfer question. |
| ~1 KB | Against roughly 45 KB for the usual alternative. |

**Swap it for something that sets a cookie and this site needs a consent
banner.** It does not have one, the privacy page states in two places that it
does not need one, and the legal-bases table explains why. Those three things
become wrong together. Fathom and Umami keep the properties above; Google
Analytics does not.

## 3. What is measured

A page view, and seven events — two of which have a negative twin, so there are
nine event names in all. Every one is a fact about the catalogue or about what
happened — never about who.

| Event | Properties | Why it is worth having |
| --- | --- | --- |
| `pageview` | — | The path only; the query string is dropped |
| `Product viewed` | piece, category | Which pieces get looked at |
| `Product not found` | **none at all** | A dead `?id=` is a broken link somewhere and nobody reports those — but the id itself is deliberately not sent, because a pasted link can carry anything |
| `Add to bag` | piece, size | The size breakdown is a cutting decision |
| `Begin checkout` | number of lines | Counted on the attempt, so a checkout that fails to start is visible |
| `No results` | which filter groups, whether a search was involved | What the collection is missing |
| `Newsletter signup` | which page, pending or confirmed | Where signups actually come from |
| `Enquiry sent` | the subject dropdown value | What people write in about |
| `Fit profile saved` | **none at all** | That it happened, never what is in it |
| `Fit profile cleared` | **none at all** | The same, for the other direction |

### What is never sent

An email address, a name, a message, an order number, a fit profile, a
measurement.

That is enforced, not trusted. `clean()` in
[`assets/js/analytics.js`](assets/js/analytics.js) drops any property whose
**key** names personal data (`email`, `name`, `address`, `phone`, `message`,
`order`, `height`, `weight`, `waist`, `measure`, …), any **value** shaped like
an email address or a phone number, and any value over 120 characters — which
is not a category, it is prose. Each drop logs a console warning naming the
key.

The guard exists because the seams calling `track()` are spread across seven
files (`app`, `cart`, `fit`, `forms`, `newsletter`, `product`, `shop`) and will
be edited by people who have not read the header of that one.
Tested by passing it a deliberately careless payload: of eight properties, six
were dropped and only `piece` and `size` survived.

### Raw search terms are deliberately not sent

Knowing what people search for and do not find is genuinely valuable, and it is
the one thing here I left on the table. A search box is free text: somebody
types their own name into it eventually. `No results` reports the *filter
groups* and whether a search was involved, not the words.

If you want the terms, the place to reconsider is `clean()` — not the call
site. Decide it once, in the guard, where the reasoning lives.

## 4. Do Not Track and Global Privacy Control

Honoured by default, and honoured properly: when either signal is present the
script is **never fetched**. No tag is inserted, `window.plausible` is never
defined, and `VOLA.track()` becomes a silent no-op. Most implementations load
the tracker and then suppress events; this loads nothing.

Somebody who has set either has already answered the question, and asking again
in a nicer font is not consent.

`respectDoNotTrack: false` turns that off. It is deliberately not exposed
anywhere in the interface as a thing to toggle.

## 5. Development

`trackLocalhost` is false, so `localhost`, `127.0.0.1`, `*.local` and
`file://` are all ignored and your own clicking never reaches the numbers the
shop is judged on. The reason is logged once to the console so an empty
dashboard is never a mystery.

---

## What the privacy page does with all this

Filling in `domain` changes five things on `privacy.html`, all derived, none of
them written by hand:

1. **"What we do not do"** becomes **"While you read"**, describing what is
   counted, that there are no cookies, and that DNT/GPC stops it entirely.
2. A **Plausible row** appears in the processor table — what it receives, when,
   and where it is hosted — marked *Connected*.
3. A **legal basis row** is added: legitimate interest, with the reasoning.
4. A **retention row** is added, saying the counts are aggregate totals with
   nothing in them that is about you, so there is nothing to delete on request
   and nothing a request could be matched against.
5. The claim that the site sets **no cookies** stays, because with Plausible it
   is still true. Swap providers and check this one by hand.

Verified by turning it on and watching all five flip together, then off again.

## Adding an event

```js
if (V.track) V.track('Repair requested', { discipline: 'corsetry' });
```

Guard with `if (V.track)` — a page that does not load `analytics.js` should not
throw. Send a category, never a person. If you find yourself wanting to send an
identifier so you can join two events together, you are no longer doing the
thing this file describes, and the privacy page will need rewriting by a human.
