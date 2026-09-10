# Cookie banner — there isn't one, and that is the finished behaviour

`assets/js/consent.js` renders nothing on this site today. Not because it is
unfinished — because nothing here needs consent, and the file works that out
for itself rather than being told.

## Why there is no banner

What the law regulates is **storing or reading data on the reader's device**
(ePrivacy Art. 5(3); the GDPR then governs what you do with what you got).
Consent is required when a site does that for something the reader did not ask
for. This site does not:

| | |
| --- | --- |
| Cookies | **None at all**, first or third party |
| localStorage | The bag, saved sizes, an unsent draft, a sign-in — all things the reader asked for, which is the *strictly necessary* exemption rather than a loophole |
| Analytics | Cookieless, stores nothing, and off by default anyway |
| Fonts | Self-hosted, so no third party is contacted |
| Advertising | None |

## Why adding one anyway would be a regression

A banner asking permission for nothing is not a harmless precaution.

- **It teaches people to dismiss consent notices without reading them**, which
  is what makes the notices that matter worthless. This is the real cost and it
  is paid by every site, not just this one.
- **It implies tracking that is not happening** — on a site whose entire
  argument is that it does not overclaim, that is its own kind of dishonesty.
- **It costs every reader a decision on every page**, for nothing.
- It would contradict the privacy page in four places, which now derive the
  opposite from the same config.

If your organisation requires a banner regardless, `consentConfig.required:
'always'` gives you one. It will still be a banner asking permission for
nothing, and the privacy page will follow it rather than argue.

---

## What is actually built

The machinery is real and dormant. The day someone adds a pixel, the correct
thing happens by itself instead of having to be remembered.

### How it decides

`services()` in `consent.js` asks each integration one question: **does this
store or read anything on the reader's device?** Not "is it a third party" — a
request to a third party is a transfer worth disclosing on the privacy page,
but it is not by itself a consent question.

```js
window.VOLA.analyticsConfig = {
  …
  storesOnDevice: false   // Plausible. Set true for GA, Matomo-with-cookies, a pixel.
};
```

Flip that flag **on a service that is actually running** and, together, from
the same fact:

1. The **banner appears** on every page until a choice is made.
2. **Analytics is held back** — no script tag, `window.plausible` never
   defined, `V.track()` a genuine no-op.
3. The privacy page's **"no cookies at all"** becomes a description of what is
   stored and why you were asked.
4. Its **"this is why there is no cookie banner"** clause is replaced.
5. Its **"without cookies and without storing anything on your device"** in the
   analytics section is replaced.
6. The **"Why you were not asked"** panel becomes **"Your choices"**, with a
   control to change them.

All six verified by flipping the flag and watching them move, then flipping it
back.

> **Testing this.** `services()` asks two questions, not one: *is this service
> on?* and *does it store on the device?* Analytics ships with `domain: ''`, so
> it is off, so it stores nothing, so setting `storesOnDevice: true` **on its
> own changes nothing** — correctly, since no script is loaded to store
> anything. To see the banner you need both:
>
> ```js
> domain: 'vola.example',   // the service is actually running
> storesOnDevice: true      // …and it writes to the device
> ```
>
> A service that is off is not a service that needs consent. If you flip only
> the flag and see no banner, the layer is working, not broken.

### Config

```js
window.VOLA.consentConfig = {
  required: 'auto',    // 'auto' | 'always' | 'never'
  categories: [ … ]
};
```

`auto` derives it. `always` shows it regardless. `never` suppresses it even
when something needs consent — only correct if consent is collected elsewhere,
and wrong otherwise.

A category with no service behind it is **not offered**. `marketing` is
declared and never shown, because nothing uses it. An empty list is the answer
"nothing to ask", not "ask about everything".

### The rules it follows

- **Reject is exactly as easy as accept** — same element, same size, same
  style, same place, one click. A reject hidden behind a second screen is not a
  free choice, and every regulator that has looked at it has said so.
- **Nothing is pre-ticked** on a first ask. Returning to preferences shows what
  you actually chose.
- **No consent, no script.** The gate is before the tag, not after it. Refusal
  means the third party is never contacted at all.
- **A choice takes effect on the page it was made on.** Accept and analytics
  starts from that moment; withdraw and it stops immediately. Otherwise someone
  who accepts and then leaves is counted as never having visited, and someone
  who withdraws goes on being measured until they navigate — which is worse.
- **The choice is remembered**, in `vola.consent.v1`. Storing that needs no
  permission of its own: refusing to remember a refusal is how banners come
  back on every page. It is listed in the privacy page's storage table like
  everything else, and erasing it there withdraws consent properly.
- **A stored choice about different categories is not honoured.** `VERSION`
  is bumped when the categories change materially, and an older record is
  discarded rather than assumed to carry over.
- **It is a dialog, not a wall.** Focus moves to it so it is not missed, but is
  not trapped — a reader who would rather read the page first can. Bottom-left
  on desktop so it does not cover what they came for; full width on a phone,
  where 420px does not fit beside anything.

### Adding a service that needs consent

Add it to `services()` with `stores: true` and a category id, and gate its
loading:

```js
if (V.consent.granted('marketing')) loadThePixel();
V.consent.onChange(function () {
  if (V.consent.granted('marketing')) loadThePixel();
});
```

`granted()` returns **true** when nothing needs consent at all — a caller
asking "may I?" when there is nothing to ask about should not be blocked.

---

> ⚠ Same standing caveat as the rest of the privacy work: the reasoning above
> is sound and the behaviour is verified, but none of it has been read by a
> lawyer. See the draft banner on `privacy.html`.
