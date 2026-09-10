# VOLÀ — Denim Couture

A sixteen-page e-commerce site for the VOLÀ maison. Static HTML, CSS and vanilla
JavaScript — no build step, no framework, no dependencies. Open `index.html`
in a browser, or serve the folder.

```bash
python serve.py
```

Then visit <http://localhost:8000>. (Serving over HTTP rather than opening the
file directly keeps `localStorage` and relative paths behaving normally.) Set
`PORT` to move it; `.claude/launch.json` starts the same server for the editor's
preview pane and must be kept on the same port.

`serve.py` does what `python -m http.server` does, with two development
conveniences: it sends
`Cache-Control: no-store`, because there is no build step and no hashed
filenames — so without it, editing `vola.css` and reloading shows you the old
file — and it threads, because a page pulls a stylesheet, five scripts and
twenty SVGs at once and the single-threaded handler serves them strictly one
at a time. Neither says anything about how to serve this in production.

---

## Pages

| File | What it is |
|---|---|
| `index.html` | Home — hero, nine category tiles, signature pieces, atelier story, new in, values, appointment CTA |
| `track.html` | Order tracking — lookup by number and email, stage timeline, returns eligibility |
| `account.html` | Sign in, reset password, signed-in — **the UI only; see the warning below** |
| `register.html` | Create an account — consent, strength read, and a verification step |
| `help.html` | Help centre — ordering, delivery times, returns, duties; searchable, with short answers routing to the pages that own each topic |
| `care.html` | Care & repairs — how a repair works, what is covered, the raw-denim regimen, and care by cloth |
| `traceability.html` | Traceability — the full mill record, what a price is made of, made-to-order, and what cannot be verified |
| `reviews.html` | Client reviews — every review in full, filtered by fit outcome, size, score and piece |
| `fit.html` | The Fit Studio — the profile form, the size chart, how every cut runs, and how raw denim moves |
| `made-to-measure.html` | Commissions — disciplines and prices, the six-week process, terms, and a consultation request |
| `shop.html` | The collection — search, size / category / colour / cloth-weight / price / line filters with live counts, sort, URL-shareable filter state |
| `product.html` | Product detail — driven by `?id=`, gallery, cloth spec, colour + size selection with fit recommendation, provenance, price breakdown, accordion, related pieces |
| `cart.html` | The bag — line editing, totals, final-sale and size checks per line, delivery window by country, delivery-details form |
| `about.html` | The Atelier — house story, mills, repairs, shipping (sizing now points at the Fit Studio) |
| `contact.html` | Contact and private appointments |
| `privacy.html` | Privacy — the policy, with your own browser storage listed live and erasable |

## Assets

`assets/js/` is split into three folders by role — shared infrastructure,
third-party integrations, and one script per page — rather than one flat
folder of 29 files:

```
assets/
  css/vola.css            design system — tokens, components, responsive rules, motion
  css/fonts.css           the two typefaces, served from this domain (generated)
  fonts/*.woff2           Cormorant and Montserrat, latin + latin-ext (OFL 1.1)

  js/core/                shared infrastructure, used across most or all pages
    app.js                  cart store, cart drawer, mobile menu, toasts, icons, reveal
    data.js                 the catalogue (19 products across 9 categories)
    auth.js                 session layer and the three auth seams — contains no authentication
    fit.js                  the fit profile — measurements, size recommendation, form
    forms.js                contact + commission transport — draft safety, fallbacks
    faq.js                  the answers, and the contextual help box that reuses them
    motion.js               scroll parallax, magnetic CTAs, the drifting hearts

  js/integrations/        third-party service modules
    shopify-config.js       the one file you edit to connect a store
    shopify.js               Shopify runtime — checkout, customer accounts, orders
    analytics.js             measuring — off by default, and a guard that drops anything personal
    consent.js                the consent layer — renders nothing, because nothing needs it
    newsletter.js             footer signup — Klaviyo, wording, failures, remembering

  js/pages/               one script per HTML page, page-exclusive logic only
    about.js, account.js, care.js, cart.js, contact.js, fitstudio.js, help.js,
    home.js, mtm.js, orders.js, privacy.js, product.js, register.js, reviews.js,
    shop.js, trace.js, track.js

  img/*.svg               25 files — 22 art-directed placeholder plates, the hero
                           silhouette, the favicon and the heart the motion layer drifts
  img/_generate.py        regenerates the plates and the hero
design-system/vola/MASTER.md   the design system, described from the shipped CSS
docs/                     the six integration/policy docs — SHOPIFY.md, REVIEWS.md,
                          NEWSLETTER.md, CONTACT.md, ANALYTICS.md, CONSENT.md
tools/shopify-sync.mjs         pulls the catalogue from Shopify into assets/js/core/data.js
tools/judgeme-sync.mjs         pulls reviews from Judge.me into assets/js/core/data.js
tools/fonts-fetch.mjs          downloads the typefaces and writes css/fonts.css
tools/fixtures/*.json          recorded payloads, for testing both mappings
```

## Shopify

Connected through three routes, chosen by what each actually needs: the
catalogue at **build time** (`node tools/shopify-sync.mjs` writes `data.js`,
which keeps the site static and every derived figure working), the cart and
checkout at **runtime** (Storefront Cart API → Shopify's hosted checkout), and
customer accounts and order history at **runtime** (Storefront Customer API,
which turns the auth seams into real ones).

With no store configured everything falls back to the local catalogue and the
demo seams, so the site runs exactly as it does today while you set it up.

**See [SHOPIFY.md](docs/SHOPIFY.md)** for the credentials, the metafield
definitions that carry the cloth spec / provenance / fit data, and the one gap
— guest order lookup, which needs a twenty-line serverless proxy because the
Storefront API cannot do it.

Reviews are the fourth route: Shopify has no review API, so they come from
**Judge.me**, also at build time (`node tools/judgeme-sync.mjs`) because that
token is private. **See [REVIEWS.md](docs/REVIEWS.md)** — in particular the custom
questions, without which Judge.me collects no fit verdict and the true-to-size
figures have nothing to count.

The newsletter is the fifth: **Klaviyo**, at runtime, through the public
company ID that is meant to ship in a browser. **See
[NEWSLETTER.md](docs/NEWSLETTER.md)** — in particular `doubleOptIn`, which decides
whether the site says "you are on the list" or "check your email", because
Klaviyo's 202 does not distinguish them.

The contact and commission forms are the sixth: a **Formspree** endpoint, also
public by design, because sending mail needs a secret and this site has no
server. **See [CONTACT.md](docs/CONTACT.md)**.

Analytics is the seventh, and the only one that is **off by default and stays
off** until someone fills in a domain — **Plausible**, cookieless and
EU-hosted. **See [ANALYTICS.md](docs/ANALYTICS.md)**.

And there is an eighth that is not a service at all: the **consent layer**,
which renders nothing because nothing here needs permission — and turns itself
on the moment something does. **See [CONSENT.md](docs/CONSENT.md)**.

## The newsletter

The footer signup on all sixteen pages validated the address, cleared the
field and said **"Thank you — you are on the list"**. No request was made.
Nobody was on any list. The same defect as the invented reviews, in the
furniture of every page.

It now posts to a Klaviyo list and says only what the response supports. The
distinction that matters: Klaviyo answers **202 Accepted** to both a single
and a double opt-in list, and 202 means "we have your request", not "this
person is subscribed" — on a double opt-in list nobody has joined anything
until they click a link in an email. So the wording is driven by
`klaviyoConfig.doubleOptIn`, and the default is the careful one.

Everything else follows from refusing to overclaim:

- **Unconfigured, it says so** and stores nothing, rather than thanking
  someone for joining a list that does not exist — the same guard the checkout
  uses on an unsynced catalogue.
- **Six failure states, six sentences.** A rate limit and a refused address
  need different actions from the reader; "something went wrong" tells them
  neither. On any failure the address stays in the field and nothing is
  written.
- **The button disables in flight**, because the one thing a visitor can press
  twice is the thing that would subscribe them twice.
- **A signup is remembered** in `vola.news.v1` — otherwise the footer asks
  again on the other fifteen pages — carrying `pending` or `subscribed` so
  the remembered line stays as honest as the first one. One click clears it.
- **Each form is labelled** with the page it sits on, sent as Klaviyo's
  `custom_source`, so the list records `Footer — product` rather than sixteen
  identical rows.
- **Consent is stated at the point of collection**: what the letters are, how
  often, that the address is not passed on, one-click unsubscribe —
  `aria-describedby` the input so it is announced with the field. No checkbox:
  submitting a form whose only purpose is subscribing *is* the consent once
  the purpose is stated, and a pre-ticked box would be invalid consent anyway.

## The contact and commission forms

Same defect as the newsletter, in its most damaging form. Both forms assembled
a payload, discarded it, waited 800ms and said "Message sent to the atelier".
The 800ms was a fake latency, which made the lie more convincing rather than
less — and unlike the newsletter, this one **cleared the field and deleted the
saved draft first**. Someone who spent ten minutes describing a repair lost the
text and was told the atelier had it: waiting for a reply that cannot come, to
a message that no longer exists.

Both now post to a Formspree endpoint through
[`assets/js/core/forms.js`](assets/js/core/forms.js), which exists to enforce three
things:

1. **Nothing is claimed until the endpoint says so.** No fake latency; the
   success note waits on the response.
2. **The draft is deleted only after a confirmed success.** The failure path
   resets nothing — the text is where they left it and the saved draft is
   untouched. This is the rule the module was written around.
3. **A failure hands them a way through**, not an apology: the message already
   written into a mail client addressed to `VOLA.house.email`. It is the
   moment someone is most likely to give up, and the address is on the page
   anyway.

Six failure states, each with its own sentence and its own instruction — a rate
limit and a refused address need different actions from the reader.
Misconfiguration also `console.warn`s a developer-facing hint: visitors get the
plain sentence, whoever deploys it gets the diagnosis. `newsletter.js` keeps
the same split for the same reason.

Spam is handled by a **honeypot**, not a CAPTCHA — off-screen rather than
`display: none` because some bots skip what is not rendered, and out of both
the tab order and the accessibility tree. CAPTCHAs tax exactly the people least
able to pay the tax.

Both notes now take focus when they appear, because "sent" and "not sent" are
the answer to the thing the person just did, not a polite aside. The payload
keys are written for the inbox that reads them (`Piece: Sculpt Raw Selvedge
Jean`, not `piece: sculpt-raw-jean`), and **saved sizes are sent only if the
box was ticked** — off by default, naming exactly what would go.

## Privacy

A privacy policy is the document most likely on any site to describe a system
that no longer exists. It gets written once, by someone who asked the
developers what happens, and then the developers change what happens.

So `privacy.html` is derived like everything else here.

- **The storage table is read live from the browser it is rendered in.** Every
  key this site writes, what it is for, whether it is present right now, how
  many bytes, and what erasing it would cost — with a button that erases it.
  Not an example: it is your data, in your browser, with the control next to
  it. That is Article 17 as a working mechanism rather than a paragraph
  inviting you to write in.
- **Erasure routes through the module that owns the key.** Deleting the bag
  from under the cart module would leave the header counting items that no
  longer exist, so the cart is asked to `clear()` and the header repaints;
  the raw removal follows regardless, so a module that is not loaded cannot
  leave the key behind.
- **The processor table is read from the same config the runtime reads**, and
  says which services are actually connected rather than listing every
  integration the site could have. Turn Klaviyo off and the page stops
  claiming your address goes to Klaviyo. Verified by connecting two services
  and watching the rows flip.
- **What cannot be derived is printed as a named blank.** A company
  registration number, a statutory retention period, the name of a DPO — six
  of them, each saying what it is and who can supply it. A policy that invents
  its own controller details is worse than one that admits the gap, so the
  page carries a draft banner and a task list rather than a plausible fiction.

The uncomfortable finding it surfaced was **Google Fonts** — and it has since
been fixed. See below.

The policy is linked from the footer of all sixteen pages, from the newsletter
consent line, and from the saved-sizes tick box — which points at
`privacy.html#sizes`, the section covering the most sensitive thing this site
handles.

⚠ **This is a draft, not legal advice.** The technical sections are accurate
because they are generated from the code. That is not the same as the document
being legally sufficient, and it has not been reviewed by anyone qualified to
review it.

## Analytics

The site had none, and its privacy page said so: *"nothing here is designed to
find out"*. That sentence was worth something, and it was one config line away
from being false — which is exactly how privacy policies come to describe a
site that no longer exists. Nobody turning analytics on would have thought to
go and edit it.

So the claim is not written down anywhere. **The privacy page reads the same
config the measuring does.** Fill in `analyticsConfig.domain` and five things
change together, none of them by hand: the "What we do not do" promise becomes
a "While you read" description, a Plausible row appears in the processor table,
a legal-basis row is added, a retention row is added. There is no way to end up
with analytics running and a page promising you have none. Verified by turning
it on, watching all five flip, and turning it off again.

**Off by default and it stays off** — no script, no request, no beacon, until
someone deliberately fills that line in.

The provider choice is load-bearing rather than preference. Plausible sets no
cookie and writes nothing to the device, which is what ePrivacy actually
regulates — so this site still needs no consent banner, and the privacy page
can go on saying so in two places. Swap it for something cookie-based and those
claims become wrong together.

**Do Not Track and Global Privacy Control are honoured properly**: the script
is never fetched, `window.plausible` is never defined, and `V.track()` becomes
a silent no-op. Most implementations load the tracker and then suppress events.
Somebody who set either signal has already answered the question.

A page view and nine event names — seven events, two of which have a negative
twin (`Fit profile saved` / `cleared`, `Product viewed` / `not found`). All of
them are facts about the catalogue or about what happened, never about who, and
`Fit profile saved` carries no properties at all, because the measurements are
the most personal thing here and only the *fact* is worth counting. What can
never be sent is enforced rather than trusted: a guard drops any property whose
key names personal data, any value shaped like an email or phone number, and any
value over 120 characters. It is there because the seams calling `track()` sit
in seven files and will be edited by people who have not read the header of the
one. Tested with a deliberately careless payload — six
of eight properties dropped, only `piece` and `size` survived.

One thing deliberately left on the table: **raw search terms**. Knowing what
people search for and do not find is genuinely valuable, and a search box is
also where somebody eventually types their own name. `No results` reports the
filter groups and whether a search happened, not the words. See
[ANALYTICS.md](docs/ANALYTICS.md) if you want to revisit that — in the guard, where
the reasoning lives, not at the call site.

## The cookie banner

There is not one, and that is the finished behaviour rather than an unfinished
one.

What the law regulates is storing or reading data on the reader’s device
(ePrivacy Art. 5(3)). Consent is required when a site does that for something
the reader did not ask for. This site sets **no cookies at all**; its
localStorage holds the bag, the saved sizes and an unsent draft, which are the
things the reader asked it to remember; its analytics is cookieless and off by
default; its fonts are self-hosted. There is nothing to consent to.

A banner anyway would be a regression. It teaches people to dismiss consent
notices without reading them — which is what makes the ones that matter
worthless — it implies tracking that is not happening, and it costs every
reader a decision on every page for nothing.

So, like everything else here, it is **derived rather than decided**.
`consent.js` asks each integration one question: does this store or read
anything on the reader’s device? Not “is it a third party” — that is a
transfer worth disclosing, not a consent question. Today the answer is no
everywhere, so nothing renders.

Set `analyticsConfig.storesOnDevice: true` on a provider that is actually
running — which is what swapping Plausible for Google Analytics would mean —
and six things move together, from that one fact: the banner appears; analytics
is genuinely held back (no script tag,
`window.plausible` never defined, `V.track()` a real no-op); and the privacy
page’s four hand-written claims about cookies and banners are each replaced by
their opposite. All six verified by flipping the flag and watching them move,
then flipping it back.

The machinery follows the rules that make consent meaningful rather than
decorative: **reject is exactly as easy as accept** — same element, same size,
same place — nothing is pre-ticked, the gate is *before* the script tag rather
than after it, and a choice takes effect on the page it was made on rather than
the next one. A stored choice about a different set of categories is discarded
rather than assumed to carry over.

**See [CONSENT.md](docs/CONSENT.md)**, including `consentConfig.required: 'always'`
if your organisation wants a banner regardless.

## The typefaces

Every page used to link its stylesheet from `fonts.googleapis.com`. That meant
the browser asked Google for it before rendering anything — sending the
reader's IP address and user-agent to a company they have no relationship with,
before they had clicked a thing. Every other third party here is reached
because the reader *did* something: bought, wrote, subscribed. This one
happened to everybody, on every page, unasked, and it was the one entry the
privacy page had to list as a transfer nobody chose.

German courts have held that unlawful without consent (LG München I,
3 O 17493/20). `node tools/fonts-fetch.mjs` fixes it: it reads the face list
from Google once, downloads the woff2 files, and generates
`assets/css/fonts.css` pointing at local copies.

- **14 files, 552 KB on disk**, of which a typical page fetches about 239 KB —
  the `latin-ext` subsets sit unused until something actually renders an
  extended glyph, which is `unicode-range` doing its job.
- **Only latin and latin-ext are taken.** Google offers 35 faces across
  cyrillic, cyrillic-ext and vietnamese too; keeping them would quadruple the
  weight for glyphs nothing on this site renders.
- **It is also faster.** The old chain was HTML → DNS + TLS to googleapis →
  CSS → DNS + TLS to gstatic → font: two extra connections on the critical
  path, both blocking text from painting. The files now sit beside the
  stylesheet that asks for them, and the two `preconnect` hints that existed
  only to warm those connections are gone.
- **`font-display: swap`** is kept, so text paints immediately in the fallback
  and reflows when the face arrives.
- **The licence travels with the files.** Both families are SIL Open Font
  License 1.1, which permits exactly this and requires `OFL.txt` to ship
  alongside — so the tool fetches that too.

The privacy page's Google Fonts row **derives its own status from the document
it renders in**, by looking for any link to `fonts.googleapis.com` or
`fonts.gstatic.com`. So it now reads "Not connected" and carries a callout
saying the fonts are ours — and if anyone ever pastes the Google link back into
a `<head>`, the row and the original warning come straight back with it. That
was verified by injecting the link and watching it flip.

The page also now makes a claim that can be checked in a network panel:
**nothing on it is requested from another domain.** Confirmed — zero foreign
origins across every page.

## The homepage

Everything below the hero renders from `data.js` via `assets/js/pages/home.js`
rather than being typed into `index.html`. A homepage that says "nine
disciplines" over six tiles — which this one did — is the cheapest possible
way to look careless, and deriving the copy is what stops it recurring.

- **Nine disciplines** — all nine categories, in catalogue order, each fronted
  by its own first piece and carrying a live count. Add a category to
  `data.js` and it appears here with no markup change.
- **In your size** — with a fit profile saved, a shelf of pieces that actually
  come in it, above a readout of the sizes the profile resolves to. Without
  one, the same slot holds a four-field invitation instead, so the page does
  not reshuffle between visits. The readout uses `fit.baseSize()`, not
  `fit.recommend()`: the latter folds in how a particular cut runs, which is
  right on a product page and wrong on a profile summary — otherwise the first
  shirt in the catalogue being oversized would tell someone they are an XS.
- **Weight, not season** — three routes into the collection by cloth weight,
  each saying what that denim is *for* rather than only what it weighs, with
  counts and, when a profile exists, how many of them come in your size.
- **Where the cloth is woven** — the mills as a record: name, city, founding
  year and how much of this season came off their looms, all counted off the
  catalogue.
- **Checkable claims** — the figure under each house value is derived, so it
  cannot fall out of date: the longest piece in atelier hours, the mill and
  piece counts, the number of made-to-order pieces.

## Counting the mills

The house counts its mills out loud in five places across the homepage and
the atelier page, and every one of them said "four" while the catalogue held
five — Albini in Bergamo supplies the chambray shirt and the panelled dress,
and had simply never been written into the copy.

`VOLA.mills()` in `app.js` derives the record from `data.js`: name, city,
country, founding year, and how many pieces of the current season came off
that loom, oldest first. Everything else reads from it.

- Any `[data-mills-word]` on any page is filled with the live count, spelled
  out — `data-mills-word="cap"` for the form that opens a sentence. `app.js`
  paints these on boot, so a new page gets it for free.
- The homepage mills strip and `#mill-names` render entirely from it.
- On the atelier page the written prose under each mill stays in the HTML —
  it is brand copy, and no script should be writing it. What `about.js` adds
  is the checkable line beneath: `Since 1876 · 2 pieces this season`, keyed on
  `data-mill`. A card naming a mill the catalogue no longer buys from is left
  visibly unclaimed rather than printing "0 pieces".

Adding a sixth mill to `data.js` now updates both pages' counts, the homepage
record and the atelier facts. It will not write the new mill's card — that
still needs a human, which is the right division of labour.

## Order tracking

⚠ **There are no orders.** `orders.js` has one seam — `lookup` — and behind
it a generator that builds a plausible order from the number typed, so every
state the page has to survive can be seen: in the atelier, in transit,
delivered, returnable, and final sale. It is deterministic, so the same number
always tells the same story — which is what makes it useful for testing and
what makes it obviously not a database.

Replace `lookup` with your commerce API. It must require the number **and**
the email and match both (a number alone is a guessable URL to somebody's
address), rate limit the endpoint, and return the same "not found" for a wrong
email as for a wrong number — a different response tells an attacker the
number is real.

With no accounts, this lookup **is** the entire post-purchase experience, and
post-purchase silence generates most of the customer service contact in this
category.

- **Stages, not a status word.** A made-to-order piece is cut only once
  ordered, so it gets six stages — placed, cut, assembled, hand finishing,
  shipped, delivered — against four for everything else. A tracker that says
  "processing" for a month is how somebody decides they have been forgotten.
- **Done, now and expected look different**, and the dates are real: past
  stages show when they happened, future ones say "Expected".
- **The delivery window comes from `VOLA.delivery`**, so the estimate here is
  the same promise the bag, the help centre and the atelier page make.
- **Returns are computed, not asserted**: open only once delivered, counted
  against `terms.returnsDays`, and made-to-order lines excluded by name with
  the reason. A mixed order says both things at once — "22 days left to return
  this piece" beside "one piece is made to order and cannot be returned".
- **A tracking number only exists once the carrier has it.** Before that the
  panel says so rather than showing an empty field.
- `?order=&email=` runs the lookup on arrival, so a link in a confirmation
  email answers rather than asking again. Order numbers forgive case, spaces
  and the dash, because people paste them out of emails.

## Accounts — read this first

⚠ **`account.html` does not authenticate anyone, and cannot.** A static site
has no server, and any check that runs in the browser is a check the visitor
controls. What is built is the complete *interface* to authentication — the
states, the errors, the timing — with three clearly marked seams in
`auth.js` where a real provider goes.

Specifically:

- The demo sign-in accepts any well-formed input. There is no user database.
- **No password is stored, hashed or otherwise.** The variable is dropped the
  moment the call resolves.
- The "session" is a name and an email in web storage. **It gates nothing.**
  Anyone can write one from the console. Do not use it to hide anything.
- The lockout after five failures is UI, not defence. Real rate limiting has
  to happen server-side, per IP and per account.

To make it real, replace the three `SEAM` functions with your provider
(Auth0, Clerk, Supabase, WorkOS, your own API). The session should then come
back as an httpOnly Secure SameSite=Lax cookie this file never sees, and
`VOLA.auth.user` should hydrate from a `/me` endpoint rather than storage.
Remove the `.devnote` banner at the top of the page when you do.

**A note on the recommendation.** Accounts were in the "later, not now" list
for a reason that still holds: guest checkout plus a saved fit profile plus
order lookup covers most of the value without the support burden. The page
reflects that — it says plainly that an account is never required to buy, and
"Continue as a guest" is given equal weight to signing in.

### The two pages

Signing in and creating an account are separate URLs on purpose. Registration
needs consent ticks, a strength read and a verification step that have no
business in a sign-in box, and it needs an address that can be linked from a
marketing email and measured as its own funnel step. `account.html?view=register`
redirects to `register.html` so there is one canonical URL and one
implementation — the field builder and the password reveal are shared from
`app.js`, not written twice.

`account.html` holds three states in one document, no reloads between them,
and whatever has been typed survives a switch — the commonest reason to
change view is realising you are on the wrong one.

- **Password manager compatible**: `autocomplete="username"` /
  `"current-password"` / `"new-password"`, real `<label>`s, no
  `autocomplete="off"` anywhere near the password.
- **A reveal control** with `aria-pressed` and a caret that stays where it was.
- **Caps Lock warning** — the commonest cause of a "wrong password" that is
  not wrong, and the browser will not tell anyone.
- **Generic failures.** One message for every failure mode, and the reset
  response is identical whether or not the address is registered. Different
  responses for known addresses are how account lists get harvested.
- **No composition rules.** Length only, and the strength read rewards
  passphrases — NIST dropped "one uppercase, one symbol" years ago because it
  pushes people towards `Passw0rd!`.
- **Sign-in never says the password is too short.** That leaks the rule and
  helps nobody; the password is either right or it is not.
- **`?next=` returns you where you were**, guarded against open redirect —
  anything with a scheme, a host or a leading `//` is discarded. The account
  control in the header carries the current page automatically.
- **"Stay signed in" is honest**: checked uses `localStorage`, unchecked uses
  `sessionStorage`. On a shared machine that difference is the whole point.
- **Passkeys** are feature-detected and the button says plainly that WebAuthn
  needs a server challenge, rather than pretending to sign anyone in.
- Linked error summary, focus management and `role="status"` announcements,
  matching the other forms on the site.

### Registering, specifically

- **No "confirm password" field.** A reveal control catches more typos than a
  second box to retype into and does not cost the abandonment.
- **The account is not signed in on submission.** It shows a
  check-your-email panel instead, because an unverified address is a bounced
  order confirmation and, at scale, somebody else's inbox. The resend button
  throttles for thirty seconds.
- **Two separate consent ticks, neither pre-ticked.** Bundling marketing into
  the terms checkbox is not consent under the GDPR and is the commonest dark
  pattern on a sign-up form. The payload records what was agreed and when —
  a real implementation should store the wording shown, not just a boolean.
- **No "that email is already registered".** Same enumeration leak as a
  specific sign-in error; a real implementation answers identically either
  way and emails the existing account instead.
- **It offers to bring the measurements already saved in this browser**, since
  anyone with a fit profile has done the hard part already.
- An already-signed-in visitor is told so rather than being allowed to create
  a second account by accident.

## The help centre

Shipping, returns, sizing and repairs were sections of a brand story page:
someone who urgently needed the returns window had to read about the founding
of the maison to find it.

**The rule this page follows is that it does not re-explain anything that
already has a page.** By this point sizing, care, commissions, provenance and
reviews each own their topic, and a help centre that restated all of them
would be the duplication this codebase has spent its whole life removing. So:
ordering, payment, delivery, returns and duties live here in full, because
they have no other home; sizing, care and commissions get the short answer and
a route to the page that owns them.

Answers are **functions**, not strings, wherever they depend on the catalogue.
"What does shipping cost" computes the threshold, the flat rate, and how many
pieces fall below it. "Which pieces run small" reads `fit.advice` across all
nineteen. "What is the returns window" names the four made-to-order pieces as
links. Change the shipping threshold and the answer rewrites itself.

Two details worth keeping:

- **The delivery promise is a table**, generated from `VOLA.delivery.zones` —
  which is what it always should have been rather than a sentence buried in a
  paragraph.
- **Search filters questions in place and opens what survives.** A search
  result you then have to click open is not a search result.

The accordion behaviour moved to `VOLA.bindAccordion()` in `app.js` rather
than being written a second time; `product.js` now uses it too.

### The contextual help box

Four other pages surface two or three of these answers at the moment they
matter, so the answers themselves live in `faq.js` and the help centre page is
only the page. A question in two places is a question that will eventually
disagree with itself.

| Page | Questions | Why there |
|---|---|---|
| `cart.html`, in the summary aside | duties · change an order · returns | Duties settle at delivery, and that surprises people *after* they have paid |
| `product.html`, closing the buying column | delivery time · returns | The page states a shipping line but never answers "when does it arrive where I live" |
| `contact.html`, above the form | delivery · returns · repair cost | Deflects the message before it is written — the cheapest support win there is |
| `track.html`, under the timeline | delivery time · damaged on arrival | The two questions a tracking page raises: when it should arrive, and what happens if it should not have |

Three of those mount from their page script; `track.html` mounts from a short
inline block at the foot of the document — which is why `faq.js` looks unused
there if you only search the JS folder.

The other twelve pages get nothing — `help.html` *is* the answers, and the rest
already answer their own domain. A help box on the care page would be help about
the help.

**It is deliberately not a floating widget.** No fixed position, no z-index,
no radius, no shadow — the design system is square corners and hairline rules,
and a rounded bubble in the corner reads as SaaS support rather than a maison.
A bubble also implies someone is there now, which is a worse promise than
"one working day, by email, from eleven people". On a phone it would land on
"Add to bag" and "Continue to payment", which are the two buttons the site
exists to get pressed.

It needs no breakpoint of its own: it sits in whatever column it is placed in
and the grid around it is already responsive. On a phone it costs the height
of three closed rows.

## Care and repairs

"Repairs for life, no time limit, no charge" is a serious commercial
commitment and it was one card among three near the bottom of the atelier
page. It does two jobs at once — before purchase it justifies the price, and
after purchase a repair request is a returning customer with a maintained
garment.

- **The repair process names who does what at each step.** "You / Us / You /
  Us", because who pays postage and who does the work is the entire question a
  repair promise has to answer.
- **What is covered and what is not**, as two lists of equal structure and
  deliberately unequal weight. The "not covered" list includes *fading, patina
  and creasing* — those are the cloth working, not damage.
- **The first six months** for the raw pieces, with each one's own care lines
  shown as the specific instance of the general rule.
- **Care by cloth** comes from `VOLA.careGroups` — predicates over the
  catalogue, not a hand-written list. Each regimen names the pieces it applies
  to, a piece can appear in several (a raw selvedge belt needs the raw rule and
  the brass one), and a rule with nothing behind it is not printed at all.

The atelier page's two care cards became pointers rather than being deleted or
duplicated — the same treatment the size guide got. `contact.js` also learned
to read `?subject=`, so "Request a repair" arrives at the contact form with
the subject already chosen instead of on an unanswered dropdown.

## Traceability

The house published more checkable data than almost any denim maison — five
mills with founding dates, atelier hours per piece, a full cost breakdown,
made-to-order production — and it was scattered across three pages, never
adding up to a claim. `traceability.html` is where it adds up.

- **The full mill record.** The atelier page shows the mills as cards with
  written prose; this is the same five as a table, with nothing written by
  hand: founding year, cloth weights supplied, atelier hours on the pieces
  they wove, and the pieces themselves as links — so a row can be checked
  against the product pages rather than taken on trust.
- **What a price is made of.** The four construction profiles the per-product
  breakdowns come from, as shares. They are labelled by how a thing is
  *built*, not which line it is sold on: the Atelier Top-Handle Bag is made to
  order but costed like a bag, so a "made-to-order" label here would have
  contradicted the count of made-to-order pieces further down the same page.
  Each card names the categories it covers.
- **Made to order as waste avoidance**, and repairs framed as lifespan rather
  than as a service perk.
- **What we cannot tell you yet.** Cloth traced to the mill but not cotton to
  the field; mills believed but not audited; cost figures honest but not
  precise; carbon not measured. This is the only hand-written section, and it
  is the one that makes the rest credible — a traceability page with no gaps
  is marketing.

It also fixed a link that had been broken for as long as it existed: every
product page's provenance block pointed at `about.html#atelier`, an anchor
that has never been on that page. It now goes to the mill record.

## Reviews

The site showed scores from 4.4 to 5.0 and review counts up to 156 with **not
one readable review anywhere**. A rating with nothing behind it is decoration
at best, and it was the largest credibility gap standing between a visitor and
a $690 pair of jeans.

Fixing the page meant fixing the numbers first. `rating`, `reviews` and
`fit.tts` were three free-standing assertions per product — figures nobody
could check against anything. All three are gone. `VOLA.reviewStats(id)`
counts them from `VOLA.reviews`, so:

- the score on a product **is** the average of the reviews you can read under it;
- the true-to-size figure **is** the share of those reviewers who said so;
- a product with no reviews says "No reviews yet" rather than showing a number.

Small samples are phrased as counts, not percentages: "0 of 4 clients found
this piece true to size" is honest where "0%" pretends to a precision four
reviews cannot carry. A percentage only appears once there are ten or more.

The page itself borrows the collection page's filter rail, because that
pattern is right for reading a body of reviews and because **"how did it fit
the person writing this"** is the most useful facet in apparel. Counts
recompute against the current selection, the state is URL-shareable, and the
rating line on every product deep-links to that product's reviews.

### Where they come from

`VOLA.reviews` is filled from **Judge.me** at build time by
`tools/judgeme-sync.mjs` — see **docs/REVIEWS.md**. It ships empty, and the site
says so: "No reviews yet" on the product page, on the reviews page and in the
Fit Studio, with the filter rail and the sort bar hidden rather than offered
with nothing behind them.

Build time, not runtime, for two reasons. Every page reads `VOLA.reviews`
synchronously before first paint; and the Judge.me API token is private, so it
cannot ship in the browser. Judge.me's own widget solves that with an embedded
script talking to their servers — which would put a third-party iframe in the
middle of the product page and, worse, leave the review data somewhere this
site cannot count it. The entire premise here is that the percentage is the
percentage of the reviews printed underneath it. That only holds if they are
in `data.js`.

Every field below the body — the size, the fit verdict, how long it has been
owned — is an optional answer to an optional custom question in Judge.me, so
each one prints only if it was given, and each facet disappears from the rail
when nothing carries it. **"Verified purchase"** prints only where Judge.me
matched the review to a real order; it used to be hard-coded on every review,
which is precisely the kind of claim this site exists not to make.

A fit answer the sync does not recognise is recorded as **unanswered** rather
than guessed, and `reviewStats` divides the true-to-size share by the reviews
that answered rather than by all of them — otherwise a piece with ten glowing
reviews and no fit question would advertise 0% true to size.

> The thirty-five reviews that used to live in `data.js` were written by hand
> so this page could be designed against a realistic mix, including the low
> scores. They have been removed. Publishing invented reviews as genuine is
> illegal in most of the markets this site ships to.

## The Fit Studio

Size and fit is the largest unsolved problem in apparel retail, and this house
held more of the answer than it was showing. `fit.html` is where all of it now
lives, and the profile form is the hero of the page rather than a footnote —
it is the one thing worth doing there, and everything below it works better
once it is done.

The size guide **moved** here from the atelier page rather than being copied:
a chart in two places is a chart that will disagree with itself. `about.js`
lost the code entirely, and `about.html#sizing` is now a pointer that keeps
the id so old links still land somewhere sensible.

Four sections, all derived:

- **Your profile** — the four-field form, or, once saved, the three resolved
  sizes and the single most useful number to hand someone who has just filled
  it in: how many of the sized pieces in the collection come in their size
  right now.
- **The size chart** — unchanged in substance from the atelier page, described
  below.
- **How every cut runs** — the true-to-size figure has existed on all nineteen
  pieces since the catalogue was written and was only ever readable one product
  at a time. Together it is a buying guide, ordered with the lowest scores
  first so the pieces most likely to catch someone out lead. With a profile
  saved the last column fills in with the size suggested for each cut, and a
  suggestion that is only the nearest thing in stock is marked as such.
- **Raw denim** — the three pieces that genuinely move, with what each one
  does. Saying that everything else is washed and settled is what makes the
  warning on these three worth reading.

The chart itself lives in `data.js` as `VOLA.sizeChart` — body measurements in
centimetres, plus the denim waist sizes each apparel size corresponds to. That
is the only place the two size systems are related to each other, so nothing
built on top of it can disagree about the mapping. Two things the static
version could not do:

- **The denim column is filtered against what VOLÀ actually cuts.** The chart
  proposes; `sizeSets.waist` disposes. The hand-written table promised a 31
  and a 33 — neither has ever been cut — and that class of error cannot
  recur now.
- **An "Available now" column.** How many of the sized pieces in the
  collection currently come in that size, counted live: `8 of 13` at XS,
  `13 of 13` at S and M, `7 of 13` at XL. A size guide that lists sizes nobody
  can buy is a table of intentions; this is what makes it a table of facts.
  Handbags and shoes are excluded — a bag is not a size decision.

With a profile saved, your row in the chart is marked — an accent rule and a
"You" badge, the only fill in an otherwise hairline table.

The table's inline styles moved to `.sizetable` in `vola.css` along the way;
it scrolls inside `.table-scroll` on narrow screens rather than pushing the
page sideways.

## Shipping, returns and repairs

The three numbers the house promises out loud — the free-shipping threshold,
the flat rate below it, and the returns window — were written into six
announcement bars, two blocks on every product page and the atelier copy, and
computed separately again in the bag. Nine places to change a shipping
threshold is nine chances to leave one of them advertising the old figure.

They now live once, in `VOLA.terms` at the top of `app.js`, and everything
reads from there:

- `cart.shipping()` charges from it.
- Any `[data-ship-free]`, `[data-ship-flat]` or `[data-returns-days]` on any
  page is filled by `paintTerms()` on boot. Each element keeps the current
  figure as its own fallback text, so the copy still reads correctly with
  scripts off.
- `product.js` builds both of its shipping blocks from it.

Changing `freeShipOver` to 750 moves the announcement bar on all sixteen pages,
the atelier copy, the product page's inline line and its accordion, the bag's
"X from complimentary shipping" line, and the figure the bag actually charges.

Two claims on the atelier page are counted rather than asserted, in the same
way the mills are: repairs for life reports how many pieces that covers, and
the washing advice reports how many pieces are raw enough to need it
(`denim.fade === 'high'`). The shipping card adds a note the static copy could
not carry — how many pieces fall below the free-shipping threshold on their
own, and what the least expensive one costs. "Free over $500" reads
differently when the cheapest piece in the shop is $260.

## Made to measure

The house's highest-value product used to be four lines in a sidebar on the
contact page. It now has a page, and that page states no price and no timeline
of its own — everything comes from `VOLA.disciplines` and
`VOLA.commissionSteps` in `data.js`, which is also where the contact panel
reads from, so the two cannot drift.

- **The from-prices are in the first screen.** A commission is a long
  conversation and both sides lose if it starts without the number. Each
  discipline is quoted against the ready-to-wear in the same categories, via
  the shared `VOLA.priceRange()`.
- **What is *not* commissioned gets a card too.** Belts, bags and footwear sit
  alongside the two offered disciplines with a straight answer rather than
  silence. Every category in the catalogue appears in one of the three, so the
  list of what the house does cannot quietly drift from the list of what it
  doesn't.
- **The process is marked in weeks, not steps.** "Stage 3 of 5" tells you where
  you are in a list; "Week 3" tells you when the thing will be ready.
- **The terms are stated before the form**, including the one that matters:
  a commission cannot be returned, and the collection's return window does not
  apply to it.
- **A visitor arriving from a product page brings the piece with them.** The
  product page's *Commission this, made to measure* button carries `?id=`, and
  the request form lands with the right discipline chosen and the brief opened
  with the piece named.

The made-to-measure prices moved out of `VOLA.house` and onto the disciplines,
beside the categories they are quoted against — they were being read by two
pages that each computed the ready-to-wear comparison separately.
`fit.summaryLine()` moved into `fit.js` for the same reason: two forms offer to
send the saved sizes and they must describe that identically.

## The product page

Two things on this page contradicted the rest of the site, and one thing the
catalogue knew was never shown.

- **The cloth weight had its own thresholds.** The product page called
  anything under 14oz "mid-weight"; the collection page filed 13oz and up
  under "Heavy". So the Deconstructed Trucker was mid-weight on its own page
  and heavy in the rail, and the 9oz Ecru Shirt was light on one and
  mid-weight on the other. `VOLA.weightBand()` is now the single answer.
- **The badge could go missing on a made-to-order piece.** `flag` is
  editorial ("Signature" is a judgement) and `tag` is the merchandising line,
  which is a fair distinction — but the Noir Satin-Bound Corset was tagged
  `atelier` with no flag at all, so it sat in the grid looking like ordinary
  stock beside an identical sibling badged "Atelier". A piece with no badge
  now takes one from its line; an explicit editorial flag still wins.
- **Ratings were in the data and nowhere on the page.** They now sit under the
  price — as numbers, not five small stars, because the count is the part that
  decides whether the score means anything. Both figures are counted from the
  reviews rather than asserted; see the Reviews section above.

The related-pieces grid also stopped recommending things nobody can buy: it
drops pieces with nothing left in any size, and ranks by whether the piece
comes in the visitor's size before same-category relevance. The fit badge on
those cards was a collection-page-only helper; it is now `VOLA.cardWithFit`
in `app.js` and both grids use it.

## The collection page

The filter rail was already doing the real work; this pass moved everything it
was asserting into `data.js`, so the page holds no facts of its own.

- **Bands are numeric edges, not typed labels.** A price band used to carry a
  hand-written `'$500 – $800'` beside a hand-written `price >= 500 && price <
  800`, which is two chances to be wrong about one range. `VOLA.band()` now
  generates the label *and* the predicate from one `{min, max}`. It takes a
  `pair` formatter because a currency prefix has to repeat (`$500 – $800`)
  while a trailing unit reads better said once (`9–13oz`).
- **Cloth weights are defined once.** The collection page filtered on 9oz and
  13oz edges and the homepage merchandised the same three bands with its own
  copy of them — exactly how "mid-weight" comes to mean two different things
  on two pages. Both now read `VOLA.clothWeights`.
- **Category intros moved onto the category.** Each entry in `CATEGORIES`
  carries its own one-line introduction, so adding a category brings its
  heading, its homepage tile and its intro with it.
- **The sort menu is generated from the sort functions**, so it cannot offer
  an order the page does not implement, or lose one that is added.

**The empty state names the filter that is responsible.** "Try removing a
filter" leaves the shopper to work out which — and the page already has
everything needed to answer it. It drops each active group in turn, finds the
ones that alone are excluding everything, and offers the most recently applied
of those: *"Dropping the search would show 3 pieces."* with a button that does
exactly that. Recency matters — someone who browsed to Jeans and then typed in
the search box meant the category and was experimenting with the search, so
`state.order` tracks the sequence filters were actually applied in. It is not
carried in the URL, because a shared link has no history to remember; a link
falls back to the rail's own ordering.

Worth knowing: because option counts recompute against the current selection
and zero-count options are disabled, a dead end is unreachable *through the
rail*. The empty state exists for the two routes that bypass it — a shared or
bookmarked link, and free-text search.

## The bag

The bag is the last screen before money changes hands, so it is where the
things the rest of the site already knows have to be said out loud.

- **Final sale, on the line it applies to.** A made-to-order piece carries an
  accent flag on its own bag line, and the order summary describes *this* bag
  rather than a blanket policy: "One piece here is made to order and cannot be
  returned. The other one has 30 days." All of it derives from `tag ===
  'atelier'`, the same rule the collection filter and the product page use.
- **A size check.** With a fit profile saved, a line whose size differs from
  what that piece recommends says so — *"You usually take a 28 in this cut"*,
  with a link back to the product page. It uses `fit.recommend()`, the
  piece-specific answer, so it always agrees with the number the product page
  showed. It never blocks and it says nothing when the sizes match, when there
  is no profile, or when the piece has no size to check.
- **A delivery window for the country actually chosen.** `VOLA.delivery` in
  `app.js` holds the zones; the checkout country list is built from it, so a
  country nobody can quote a delivery time for cannot appear in the dropdown,
  and the atelier page's "two to four working days in Europe, three to six
  elsewhere" sentence is generated from the same zones. Picking Japan says
  3–6 working days under the field, at the moment it matters.

Note `where` on a zone is the whole prepositional phrase — "in Europe" versus
"elsewhere" — because a template that glues its own "in" on produces "in
elsewhere".

## The contact page

`VOLA.house` in `app.js` holds the address, the hours, the email and phone, the
founding year, the reply promise and the fitting count — the same treatment as
`VOLA.terms`, for the same reason. (The made-to-measure prices used to live
here too; see Made to measure for why they moved.) Any `[data-house="street"]`
takes its text from it, and an `<a data-house="email">` or `="phone"` gets its
`href` written from the same value, so a changed number cannot leave a stale
`tel:` link behind it. These are the placeholder details the section below
says to replace before launch; that is now one edit rather than a hunt.

- The reply promise was written twice on the contact page, in the page lede
  and in the confirmation note. Two sentences, one fact, no way to keep them
  in step by hand.
- The made-to-measure block adds a line the static copy could not: what
  ready-to-wear costs in the same categories, counted from the catalogue.
  "Corsetry from $1,400" means little on its own and quite a lot next to
  "ready-to-wear corsetry runs $890 – $940".

**The form now carries context in rather than asking for it back.** A "Book a
fitting" link on a product page goes to `contact.html?id=<piece>`, and the
form arrives with the piece chosen, the subject set to a private fitting, and
the message opened with the piece named — leaving the cursor in the only field
the visitor actually has to write. The piece list itself is built from the
catalogue and grouped by category, and it is saved with the draft.

Anyone with a fit profile gets an opt-in under the message: *Include my saved
sizes — M in apparel, 27 in denim, 39 in shoes*. Off by default, and it states
exactly what would be sent, because a profile is nobody's to send but the
person it describes. Note that the opener deliberately does **not** name a
size: `fit.recommend()` (this piece) and `fit.baseSize()` (your profile)
legitimately differ whenever a cut runs small, and printing one in the message
above the other in the consent line reads as the form contradicting itself.

The inline script moved to `assets/js/pages/contact.js`; it was the last page still
carrying its behaviour in a `<script>` block.

**Final sale is now stated on the pieces it applies to.** It used to be a
blanket footnote in every product's shipping panel, including on the fifteen
pieces that are returnable — so the atelier pieces where it is true said the
same thing as everything else. Made-to-order pieces now say it in their own
panel and in the line above the add-to-bag button; everything else states the
returns window. The two had been contradicting each other on the same screen.

## Buying decisions

Four blocks on the product page exist to answer the questions that actually
decide a $690 jean, at the point they get asked rather than on a page the
shopper would have to go looking for.

- **The cloth** (`.spec`) — weight in ounces, hand, and fade behaviour, set as
  three figures above the colour swatches. Denim is bought on these three
  properties and almost nobody publishes them as anything but prose buried in
  a composition string. `denim.oz` is also a collection filter (light / mid /
  heavy), which is the part no mainstream denim retailer offers.
- **The fit** (`.fitrec` + `assets/js/core/fit.js`) — height, weight, waist and
  shoe size, saved once in `localStorage` under `vola.fit.v1`, then reused on
  every product page and in the collection rail. It pre-selects the
  recommended size, marks it in the size row, and says in one sentence *why*
  that size: the measurement it used, whether the piece runs small, and how
  you said you like things to sit. A recommendation nobody understands is a
  recommendation nobody trusts, so the reasoning is deliberately simple enough
  to state in full.

  Every field is optional. A saved waist says nothing about a shoe, so
  `fit.canSize()` gates the whole feature per size system — pieces the profile
  cannot speak to show no badge rather than a misleading one, and the
  "Only my size" switch removes only what is known not to fit.
- **Where it comes from** (`.prov`) — mill, city, founding year, hours in the
  atelier, number of hands, edition. Adjectives are free; a mill name and an
  hour count are checkable, which is the whole difference between a story and
  a proof.
- **What you are paying for** (`.costs`) — a per-piece breakdown from cloth to
  margin. Held in `data.js` as *shares* per build type rather than dollars, so
  the figures are derived from the current price and a price change can never
  leave a stale breakdown behind. The last row absorbs the rounding, so the
  column always sums to the price on the page.

All four are placeholder values on placeholder products. They are only worth
publishing if they are true — replace them with real mill records, real
returns data and real costings before launch.

## Motion

Every animation here is CSS transform/opacity or a plain scroll-position
calculation — nothing animates layout properties, and everything collapses
under `prefers-reduced-motion`.

That collapse happens in two places, because it has to: `assets/css/vola.css`'s
reduced-motion block turns off everything declarative, and `motion.js` — whose
effects are inline transforms the stylesheet cannot reach — checks the same
query itself. It does not merely skip at boot: it listens for a **live** change
to the query and tears down parallax, magnetism and the hearts mid-session,
restoring them if the reader changes their mind. Any new motion must do both.

- **Hero entrance** — the eyebrow, headline, lede, CTAs and meta list fade
  and rise in sequence on load (`[data-hero-in]`, pure CSS, no JS: each
  element's position in the sequence is its own inline `--hi` custom
  property). Not scroll-triggered — it only ever plays once, above the fold.
- **Scroll reveal** — sections fade, rise and scale in as they cross into
  view (`[data-reveal]`, `IntersectionObserver`-driven, already existed;
  this pass added the scale). The cart drawer reuses it to stagger its line
  items in on a fresh open, but never on a quantity tick while it's already
  open — re-fading the whole list on every click would read as a glitch.
- **Parallax** — `assets/js/core/motion.js` translates `[data-parallax]`
  elements a little slower than the scroll (`data-parallax="0.12"` on the
  hero background, `"0.06"` on the two large editorial images in the atelier
  sections). The offset is clamped to 5% of the element's own height on
  every frame, which is what keeps it from ever exposing the clipped
  container's edge — regardless of viewport size or breakpoint, since it's
  computed from the element's live rendered height rather than a fixed
  pixel value. The two editorial images are deliberately oversized by 12%
  in CSS to give that clamp room to work in.
- **Magnetic CTAs** — the hero buttons and any non-block accent button
  (`.btn--accent:not(.btn--block)`) pull toward the cursor on hover, capped
  to ±7px horizontally and ±5px vertically, and spring back on release with
  an overshoot easing. Full-width buttons are excluded: sideways drift on a
  block control just looks broken. Pointer-fine
  devices only (`(hover: hover) and (pointer: fine)`) — there's no cursor to
  attract on touch. No CSS transition is declared for this on `.btn` itself;
  one is only ever added inline, and only for the release, so tracking never
  lags behind the actual cursor position.
- **Micro-interactions** — a soft one-pass sheen on accent-button hover; a
  press-feedback `filter: brightness()` shared across buttons, chips,
  swatches, size selectors, cards and tiles (chosen specifically because it
  doesn't touch `transform`, so it never fights the magnetic effect above);
  a swatch/size pop on selection; the cart badge bounces on a genuine
  increase (not on removals, not on the initial paint); add-to-bag morphs
  the button to a checkmark + "Added" for 1.5s before settling back.
- **Hearts** — a small blue heart drifts up and fades wherever the visitor
  clicks, and occasionally while they scroll. Purely decorative, and built so
  it cannot be anything else: a fixed overlay with `pointer-events: none`
  throughout, `aria-hidden`, throttled to one every 120ms, each node removed
  on `animationend` with a timeout behind it in case that never fires.
- **Panel transitions** — the cart drawer and mobile menu enter with a
  deceleration curve and exit around 65% as fast, per the general guidance
  that exits should feel quicker than entrances.
- **Accordion** — panels animate open/closed via `grid-template-rows: 0fr
  → 1fr` rather than snapping on the `hidden` attribute. The one real trap
  in this technique: padding on the element CSS is animating must sit one
  wrapper level below the `overflow: hidden` grid item, or it survives even
  the fully-collapsed `0fr` state as a persistent sliver — hence the extra
  `.accordion__panel-inner` / `.accordion__panel-content` split in
  `product.js`.
- **Page transitions** — a same-origin navigation crossfades via the
  cross-document View Transitions API (`@view-transition { navigation:
  auto; }` in CSS, nothing in JS). Unsupported browsers just navigate
  normally; this rule is inert there, not a fallback to maintain.

---

## Design system

Everything visual comes from CSS custom properties at the top of
`assets/css/vola.css` — change a token there and it propagates through every
page. That `:root` block is the source of truth.

`design-system/vola/MASTER.md` describes it. The file began as a generated
brief written before the site existed, and by the time the site was finished it
disagreed with it on almost every specific — variable names, the radius scale,
six palette values, the component specs, and an animation library this project
does not use. It has been rewritten from the shipped stylesheet. If the two ever
diverge again, the CSS is right.

- **Direction** — editorial minimalism on a Swiss grid, with translucent glass
  chrome for the sticky nav and cart drawer. Square corners, no decorative
  shadows, generous whitespace.
- **Type** — Cormorant for display, Montserrat for UI. Scale is 12 / 14 / 16 /
  18 / 24 / 32 then two fluid `clamp()` steps. Wide tracking on small uppercase
  labels is the fashion-house convention and it is doing the work that ornament
  would otherwise do.

  Display tracking is optical, not fixed: `-0.028em` at hero size, `-0.018em`
  at section size, `-0.008em` at 32px. One value cannot serve both 32px and
  120px of a high-contrast serif.

  `fonts.css` is `<link>`ed from each page's `<head>` *before* `vola.css`, not
  `@import`ed from inside it — an `@import` would hide the font URLs behind a
  full parse of a 108KB stylesheet, so they would start downloading last
  instead of in parallel. Only the seven faces actually used are cut
  (Cormorant 300/400/500 and 300 italic, Montserrat 400/500/600); there are no
  synthesised italics anywhere. The `preconnect` hints this used to describe
  are gone, along with the third party they pointed at — see The typefaces.
- **Colour** — near-black `#1C1917` and bone `#FAF8F5`, with a denim indigo
  family for immersive bands and `#A16207` as the single accent. That gold is
  the tool's contrast-corrected value (4.8:1 on white); the brighter
  `#CA8A04` it replaced would have failed AA.
- **Motion** — 260ms base, 420ms for panels, `cubic-bezier(0.16, 1, 0.3, 1)`.
  Grid items stagger 60ms apart. Everything collapses under
  `prefers-reduced-motion`.

## Imagery

There is no photography yet, so `_generate.py` writes 22 plates plus the hero
silhouette: studio-lit fields of draped denim with a twill weave and a selvedge
thread, seeded per filename so each is distinct but stable across regeneration.
They are deliberately abstract — art direction rather than fake product shots.
The other two SVGs in the folder are hand-written: the favicon, and the heart
the motion layer drifts.

**To use real photography**, drop your files in at the same names and the
layout will not move: every `<img>` declares `width`/`height`, and the aspect
ratio is pinned in CSS (4:5 portrait). Re-run `python assets/img/_generate.py`
if you want to regenerate the placeholders instead.

## Accessibility

Verified in the browser on the built pages, not just intended:

- Text contrast passes AA everywhere (audited across every rendered text node).
  `.value p` is muted for a light ground, which put the mill cards on the
  atelier page's indigo band at 2.2:1 — `.band .value p` and
  `.band .value .value__fact` override it to 7.9:1 and 14.3:1. The accent
  brass has the same problem: `--c-accent` is 4.8:1 on white but 3.3:1 on
  `--c-indigo-900`, so `--c-accent-on-dark` (5.9:1) exists for band contexts
- Sequential headings, no skipped levels; every image has an `alt`
- Cart drawer and mobile menu: `aria-modal`, focus trap, Escape to close,
  focus returned to the trigger, background scroll locked
- Forms validate on blur rather than on keystroke; failed submits focus a
  linked error summary and keep inline field errors (WCAG 2.2)
- Toasts announce via `role="status"` without stealing focus, and destructive
  removals offer Undo
- Touch targets ≥44px; the whole product card is one target, not just its
  title, and it takes a single focus ring rather than two tab stops
- Quantity changes announce as a full phrase ("…, quantity 3, $2,070") instead
  of leaving a bare digit to be read out of context
- Skip link, visible focus rings, `prefers-reduced-motion` respected

## Wiring it up for real

**Most of this is done.** The seams this section used to describe — a checkout
that validated and stopped, a contact form that assembled a payload and threw
it away — have been closed, and closing them was most of the work above. What
is left is **credentials**, not code: fill in
[`assets/js/integrations/shopify-config.js`](assets/js/integrations/shopify-config.js) and the site
connects itself. Each service degrades to something honest while blank, so
nothing breaks in between.

| What | Where it goes now | Still to do |
|---|---|---|
| Catalogue | `node tools/shopify-sync.mjs` writes `data.js` | Credentials + metafields — **docs/SHOPIFY.md** |
| Cart & checkout | `cart.js` → `V.shopify.createCheckout()` → Shopify's hosted checkout | Credentials. No card fields exist on this site by design; none should be added |
| Accounts & orders | `auth.js` / `orders.js` → Storefront Customer API | Credentials, plus one gap: guest order lookup needs a small serverless proxy |
| Reviews | `node tools/judgeme-sync.mjs` writes `data.js` | A private token in the environment — **docs/REVIEWS.md** |
| Newsletter | `newsletter.js` → Klaviyo | Public company + list ID — **docs/NEWSLETTER.md** |
| Contact & commissions | `contact.js` / `mtm.js` → `V.forms.submit()` → Formspree | One endpoint — **docs/CONTACT.md** |
| Analytics | `analytics.js` → Plausible | A domain, if you want any — **docs/ANALYTICS.md** |

Two things worth knowing about the catalogue seam. Each entry in a product's
`colours` array carries its own `image`, which is what the swatch swaps the
gallery to — keep that field when you map your own data across. And the bag
hides lines whose product is no longer in the catalogue, so a retired piece
cannot inflate the badge; that filter is skipped entirely when `products` is
empty, so a failed catalogue load leaves the bag intact rather than emptying it.

### What this site stores on the device

Ten keys, and they are not a guess — `privacy.js` holds the list, prints it
live in the browser it renders in, and offers to erase each one:

`vola.bag.v1` · `vola.fit.v1` · `vola.session.v1` · `vola.shopify.token.v1` ·
`vola.shopify.cart.v1` · `vola.contact.draft` · `vola.mtm.draft` ·
`vola.news.v1` · `vola.signin.fails.v1` · `vola.consent.v1`

The bag and the fit profile sync across tabs. Every read and write is wrapped,
so private-browsing mode degrades quietly instead of breaking — a blocked store
falls back to the plain size buttons rather than erroring.

**Anything you add that stores on the device belongs in that list**, and in
`consent.js`'s `services()` if it stores for a purpose the reader did not ask
for. Skipping it does not break a test; it silently makes the privacy page
wrong, which is the one failure this architecture exists to prevent.

The fit profile never leaves the browser. If you later add accounts, that is
the seam to move it behind: `fit.get` / `fit.set` in `assets/js/core/fit.js` are the
only two functions that touch storage.

## Content to replace before launch

The copy is written as real brand voice, but the specifics are invented and
need your actual details. Most of them are now in a few objects rather than
scattered through the markup:

- `VOLA.house` in `app.js` — address, hours, email, phone, founding year,
  reply promise.
- `VOLA.terms` in `app.js` — shipping threshold, flat rate, returns window.
- `VOLA.delivery` in `app.js` — the countries you ship to and how long each
  zone takes.
- `data.js` — the 19 products, mill names and dates, cloth weights, price
  bands, category intros, merchandising lines, fit and returns data, cost
  shares, prices, the commission disciplines and their from-prices, and the
  size chart.

Still written by hand and still needing your attention: the mill descriptions
on the atelier page, the house story, the "what we cannot tell you yet" section
on the traceability page, and the placeholder social links in every footer.

Two that are not copy and will not announce themselves:

- ⚠ **`privacy.html` is a draft with six named blanks** — registration number,
  VAT number, DPO, statutory retention period, per-processor transfer
  mechanisms, and a review by someone qualified to give one. The page carries a
  draft banner listing them. The technical sections are accurate because they
  are generated; that is not the same as the document being sufficient.
- ⚠ **The provenance, cost and fit figures are placeholders on placeholder
  products.** Mill records, atelier hours, cost shares and true-to-size data
  are the site's whole credibility argument, and they are the one category of
  content here that is worse than useless if it is invented. Replace them or
  remove the blocks.

---

## For whoever works on this next

[CLAUDE.md](CLAUDE.md) is the short orientation file — the architecture rule the
whole codebase follows, the script order, the public/private credential split,
and the traps that have already cost time here. Read that before this. This
README is the reference; it is not meant to be read front to back.
