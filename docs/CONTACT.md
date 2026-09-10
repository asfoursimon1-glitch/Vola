# Contact and commission forms — Formspree

Two forms on this site send a message to the atelier: `contact.html` and the
commission request on `made-to-measure.html`. They shared a hand-off seam, and
they shared its defect:

```js
void payload;
setTimeout(function () {
  form.reset();
  localStorage.removeItem(DRAFT);
  sent.hidden = false;
  V.toast('Message sent to the atelier');
}, 800);
```

Nothing was sent. The 800ms was a fake latency, which made the lie more
convincing rather than less.

This was the worst of the three placeholder integrations, because it destroyed
something. The invented reviews misled a reader; the newsletter lost an email
address. This cleared the field **and deleted the saved draft** before
announcing success — so someone who spent ten minutes describing a repair lost
the text and was told the atelier had it. The failure mode is a person waiting
for a reply that cannot come, to a message that no longer exists.

---

## 1. Get an endpoint

[Formspree](https://formspree.io) → **New form** → copy the endpoint:

```
https://formspree.io/f/xxxxxxxx
```

Point it at the address in `VOLA.house.email`, or wherever the atelier
actually reads mail.

A form endpoint rather than an email API (Resend, Postmark, SES) because
sending mail needs a secret key and this site has no server. The endpoint ID is
public by design — it accepts submissions and can do nothing else — which puts
it in the same category as the Shopify Storefront token and the Klaviyo company
ID, and in the opposite category to the Judge.me token.

## 2. Fill it in

In `assets/js/integrations/shopify-config.js`:

```js
window.VOLA.formsConfig = {
  endpoint: 'https://formspree.io/f/xxxxxxxx',
  subjectPrefix: 'VOLÀ'
};
```

`subjectPrefix` prefixes the email subject line so these are scannable in an
inbox beside everything else:

```
VOLÀ — Repairs or alterations
VOLÀ — Commission, Corsetry
```

## 3. Test it

Send one of each and check they arrive. Formspree holds the first submission
for confirmation before it will forward anything.

---

## What the atelier receives

The payload keys are written for the inbox that reads them, not for this
codebase — Formspree turns them into the labels in the email:

```
Name:        Ines K.
Email:       ines@example.com
About:       Repairs or alterations
Piece:       Sculpt Raw Selvedge Jean
Message:     The crotch has blown after two years. Can you mend it?
Saved sizes: M in apparel, 28 in denim, 38 in shoes
```

The piece is sent **by name, not by handle** — `Sculpt Raw Selvedge Jean` is
answerable, `sculpt-raw-jean` needs looking up. Empty optional fields are
dropped rather than sent blank.

**Saved sizes appear only if the box was ticked.** It is off by default, it
names exactly what would be sent, and it is only offered at all when a fit
profile exists. Someone's measurements are theirs to send.

## What happens when it fails

This is the part that matters, and the reason the transport lives in
`assets/js/core/forms.js` rather than in each page.

**The draft is deleted only after a confirmed success.** On any failure the
text is exactly where they left it, the saved draft is untouched, and the
success note never appears. Nothing is reset in the failure path — deliberately
and permanently.

**Every failure hands them a way through**: the message, already written into
a mail client addressed to `VOLA.house.email`. A failed send is the moment
someone is most likely to give up, and the atelier's address is on the page
anyway. Very long briefs are trimmed at 1600 characters in the `mailto:`, with
a note saying the rest is still in the form, because some mail clients cap the
URL near 2000.

| Cause | What they see |
| --- | --- |
| Not configured | "This form is not connected yet, so nothing was sent. Your message has been kept — copy it somewhere safe." |
| Refused (400/422) | "The form was refused: …" with Formspree's own reason where it gives one, or "…check the address you entered" where it does not |
| Rate limited (429) | "Too many messages have been sent from here just now. Wait a minute and send it again — nothing has been lost." |
| Bad endpoint (403/404) | "This form is misconfigured and nothing was sent. Your message has been kept." |
| Any other non-2xx | "The message could not be sent. Nothing has been lost — try again." |
| Network, offline, blocked | "Could not reach the atelier. Check your connection and try again — your message has been kept." |

Note what every one of them says or implies: **nothing has been lost.** That is
not reassurance, it is a description of what the code does — rule 2 above.

The misconfiguration cases also `console.warn` a developer-facing hint naming
this file. Visitors get the plain sentence; whoever deploys it gets the
diagnosis.

## Spam

A **honeypot** field, not a CAPTCHA. Bots fill every field they find; a person
never meets this one. It is positioned off-screen rather than
`display: none` — some bots skip what is not rendered — and kept out of both
the tab order and the accessibility tree by `tabindex="-1"` and an
`aria-hidden` wrapper. Formspree reads it as `_gotcha` and drops the
submission.

CAPTCHAs are declined on purpose here: they tax exactly the people least able
to pay the tax, and a honeypot plus the endpoint's own filtering handles the
volume a maison of this size will see. If it ever stops being enough, Formspree
has reCAPTCHA as a setting on their side — turn it on there rather than
building it in here.

## Accessibility

- Both notes take focus when they appear. "Sent" and "not sent" are the answer
  to the thing the person just did, not a polite aside they might scroll past.
  `tabindex="-1"` makes them focusable without adding them to the tab order.
- The failure note carries `role="alert"`, so it is announced even if focus
  moves elsewhere first.
- Field validation is unchanged and still runs first: a linked error summary,
  `aria-invalid` on each bad field, focus into the summary. Nothing is sent
  until the fields pass.
- The submit button disables in flight and re-enables in every path, success
  or failure.

## Switching platforms

Nothing outside `assets/js/core/forms.js` and the `formsConfig` block knows
Formspree exists. Basin, Getform, Web3Forms and a serverless function of your
own all take a JSON POST and answer 2xx. Replace the one `fetch` in `send()`,
keep the status handling, and both forms follow — including the draft
protection, the mailto fallback and the focus behaviour.

> These forms collect a name, an email address, a free-text message and — on
> request — body measurements. That last one is the most sensitive data this
> site touches, so the sizes tick box links straight to
> [privacy.html#sizes](privacy.html#sizes), the section that covers it.
> ⚠ **That page is a draft and carries named blanks**; see its own banner.
