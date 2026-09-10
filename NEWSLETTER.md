# Newsletter — Klaviyo

The footer signup on all sixteen pages used to validate the address, clear the
field and say **"Thank you — you are on the list"**. No request was made.
Nobody was on any list. It is the same defect as the invented reviews: a claim
with nothing behind it.

It now subscribes to a Klaviyo list, and it never says more than the response
supports.

---

## 1. Get the public key

Klaviyo → **Settings → API keys** → copy the **Public API key / Site ID**. Six
characters.

This one *is* meant to ship in a browser: it can subscribe an address to a
named list and do nothing else. It is **not** the private API key, which reads
and writes every profile on the account and must never appear in this
directory.

That is the whole reason the newsletter runs at runtime while reviews are
synced by a build tool — see the note at the top of
[`assets/js/newsletter.js`](assets/js/newsletter.js).

## 2. Get the list ID

Klaviyo → **Audience → Lists & Segments** → your list → **Settings** → List ID.

## 3. Fill both in

In `assets/js/shopify-config.js`:

```js
window.VOLA.klaviyoConfig = {
  companyId: 'AbC123',
  listId:    'XyZ99',
  revision:  '2024-10-15',
  doubleOptIn: true
};
```

## 4. Set `doubleOptIn` to match the list — this is not cosmetic

Klaviyo answers **202 Accepted** either way. That means "we have your
request", not "this person is subscribed". On a double opt-in list nobody has
joined anything until they click the link in the confirmation email.

So the wording comes from this flag, not from the response:

| `doubleOptIn` | What the site says |
| --- | --- |
| `true` | "Confirmation sent to you@example.com. Click the link in it to join — nothing arrives until you do." |
| `false` | "You are on the list as you@example.com." |

Set it to `true` and leave the list single opt-in, and the site tells people to
check for an email that never arrives. Set it to `false` on a double opt-in
list and it makes exactly the claim this whole codebase exists to avoid.

Check the list in Klaviyo (**List settings → Opt-in process**) and match it.
The default here is `true`, because it is the safe wording and, in the EU this
maison ships from, the defensible one.

## 5. Where each signup came from

Every form carries a `data-newsletter` label that is sent as Klaviyo's
`custom_source`, so the list shows `Footer — product`, `Footer — cart`,
`Footer — reviews` rather than sixteen identical rows. Worth having: which
page someone was reading when they subscribed is the most useful thing you
will know about them on day one.

---

## What it does when it is not connected

It validates the address and then says plainly that nothing was sent, naming
this file, and logs a warning to the console. It does not thank anyone, does
not clear the field, and stores nothing. Same shape as the checkout guard
when the catalogue has not been synced.

## Failure states

Each one gets its own sentence, because "something went wrong" does not tell a
reader whether to retype the address or come back later:

| Cause | What the reader sees |
| --- | --- |
| Invalid address | "Please enter a valid email address." |
| Klaviyo rejects the address (400) | "That address was refused. Please check it and try again." — or "That address could not be added…" when Klaviyo's reason is not about the email |
| Rate limited (429) | "Too many attempts just now. Try again in a minute." |
| Bad key or list (401/403) | "The newsletter is misconfigured and nothing was sent." |
| Any other non-2xx | "The list could not be reached. Nothing was sent — please try again." |
| Network, offline, blocked | "Could not reach the list. Check your connection and try again." |
| Not connected at all | "The newsletter is not connected yet, so nothing was sent." |

Every message above is what the visitor sees, in full — nothing is trimmed.
Anything that names a file, a config key or an HTTP status is a `.hint` on the
error instead, and only `console.warn` ever reads it, tagged
`[VOLÀ] newsletter:` so it is easy to find. This used to leak — the 401/403
case put "Check the Klaviyo companyId and listId — see NEWSLETTER.md." into the
sentence a visitor read — and now matches the split `forms.js` already used.

On any failure the form stays where it is, with the address still in it, and
nothing is written to storage. The button is disabled in flight so a second
press cannot send a second request.

## Being remembered

A successful signup is stored in `localStorage` under `vola.news.v1` as
`{ email, state, at }`, where `state` is `pending` or `subscribed` — the same
distinction as above, so the remembered line stays as honest as the first one.
The footer then shows that line instead of an empty box on the other fifteen
pages, with **Use a different address** to clear it.

Their own address, in their own browser. It is never read back by anything
else, and clearing it is one click.

## Consent

The line under the field states what the letters are, how often they come, that
the address is not passed on, and that every letter unsubscribes in one click.
It is `aria-describedby` the input, so it is announced with the field rather
than stranded after it.

There is **no checkbox**, deliberately. Under GDPR the act of submitting a form
whose only purpose is subscribing *is* the consent, provided the purpose is
stated at the point of collection — which is what that line does. A pre-ticked
box would be invalid consent, and an unticked one next to a "Join" button is
a second, redundant action.

> Naming the purpose at the point of collection is most of what GDPR Article 13
> asks for, but not all of it: a data controller, a retention period and a
> route to erasure belong on a page of their own. That page now exists — the
> consent line links to [privacy.html](privacy.html), and so does the footer of
> every page. ⚠ **It is a draft and carries named blanks**; see its own banner.

## Switching platforms

Nothing outside `assets/js/newsletter.js` and the `klaviyoConfig` block knows
Klaviyo exists. Mailchimp, Omnisend and Attentive all expose an equivalent
browser-safe subscribe endpoint. Replace the one `fetch` in `subscribe()`,
return `{ pending: true|false }`, and the UI, the wording, the failure states
and the remembering all follow.
