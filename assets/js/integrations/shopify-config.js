/* VOLÀ — the services this site talks to.

   The only file you edit to connect them. Everything else reads from here.

     Shopify   catalogue, cart, checkout, accounts, orders   SHOPIFY.md
     Judge.me  reviews, synced at build time                 REVIEWS.md
     Klaviyo   the newsletter                                NEWSLETTER.md
     Formspree the contact and commission forms              CONTACT.md
     Plausible analytics — off unless you fill it in          ANALYTICS.md

   Each degrades to something honest when it is left blank, so the site runs
   as it does today while you set them up. None of them ever claims to have
   done something it has not.

   ┌─────────────────────────────────────────────────────────────────────┐
   │ WHERE TO GET THESE                                                  │
   │                                                                     │
   │ Shopify admin → Settings → Apps and sales channels →                │
   │   Develop apps → Create an app → Configure Storefront API scopes    │
   │                                                                     │
   │ Tick: unauthenticated_read_product_listings                         │
   │       unauthenticated_read_product_inventory                        │
   │       unauthenticated_write_checkouts                               │
   │       unauthenticated_read_checkouts                                │
   │       unauthenticated_write_customers                               │
   │       unauthenticated_read_customers                                │
   │                                                                     │
   │ Install the app, then copy the Storefront API access token.         │
   └─────────────────────────────────────────────────────────────────────┘

   The Storefront token is PUBLIC by design — it is meant to ship in a
   browser and is scoped so it cannot read orders, customers or anything
   administrative. Do not confuse it with the Admin API token, which is a
   secret and must never appear in this directory.

   Leave `domain` empty and the site runs on the local catalogue in data.js
   exactly as it does today. Nothing breaks while you are setting up. */
(function () {
  'use strict';

  window.VOLA = window.VOLA || {};

  window.VOLA.shopifyConfig = {
    /* your-store.myshopify.com — NOT your custom domain */
    domain: 'vola-fashion.myshopify.com',

    /* Storefront API public access token */
    storefrontToken: 'ca0138b1c0fe203f69c082c9db3f7eae',

    /* Storefront API version. Shopify supports each for a year; bump this
       quarterly and re-run the catalogue sync. */
    apiVersion: '2025-07',

    /* Presentment currency and country. Shopify prices in the store's
       currency unless you pass a @inContext country, which the client does. */
    country: 'IT',
    language: 'EN',

    /* The metafield namespace the catalogue sync reads. See SHOPIFY.md for
       the definitions to create — a piece with none of them still imports,
       it just loses the cloth spec, provenance and fit blocks. */
    namespace: 'vola',

    /* ───────────────────────────────────────────────── ACCOUNTS ───
       Where signing in actually happens.

       Shopify runs two generations of customer accounts, and which one a
       store is on decides what this site is allowed to build:

         Classic       email + password. The Storefront API can sign someone
                       in directly, so the form on account.html works.
         New           no password exists at all. A customer signs in with
                       Shop, or with a one-time code sent to their email,
                       on a page Shopify hosts and controls.

       This store is on the new generation, so a password form here could
       never authenticate anyone — there is no password to check. Filling
       this in replaces the sign-in and register forms with a hand-off to
       that page, which is the only place those options exist.

       Shopify admin → Settings → Customer accounts → the account URL.
       It looks like https://shopify.com/<shop-id>/account and is public.

       Leave it blank and the demo forms stay exactly as they are. Blank is
       honest here: the forms already say plainly that nothing is checked. */
    accountUrl: 'https://shopify.com/79642099850/account'
  };

  /* ─────────────────────────────────────────────────────────── Judge.me ──
     Reviews come in at build time like the catalogue, and for a harder
     reason: the Judge.me API token is PRIVATE. It must never ship in a
     browser, so it lives in the environment and only the sync tool sees it.

         JUDGEME_TOKEN=… node tools/judgeme-sync.mjs

     `shopDomain` is public and is the only part that belongs here. The
     custom-question titles below are how a review's fit verdict and size are
     recognised — see REVIEWS.md for the questions to create in Judge.me. */
  window.VOLA.judgemeConfig = {
    shopDomain: '',

    /* Judge.me custom form questions, matched case-insensitively on the
       question text. Change these to whatever you actually asked. */
    questions: {
      fit: 'How did it fit?',
      size: 'What size did you take?',
      owned: 'How long have you owned it?'
    },

    /* Answers to the fit question, mapped to the three verdicts the site
       filters and counts on. Anything unrecognised is left unanswered rather
       than guessed, which keeps the true-to-size figure honest. */
    fitAnswers: {
      small: ['ran small', 'runs small', 'too small', 'small'],
      'true': ['true to size', 'as expected', 'perfect', 'true'],
      large: ['ran large', 'runs large', 'too big', 'large']
    }
  };

  /* ──────────────────────────────────────────────────────────── Klaviyo ──
     The newsletter. Runtime, not build time — a signup is an action, not a
     catalogue — and safe to run in the browser because Klaviyo publishes a
     key for exactly this: the public company ID, which can subscribe an
     address to one named list and do nothing else. It is not the private API
     key, which reads and writes every profile on the account and must never
     appear in this directory.

         Klaviyo → Settings → API keys → Public API key / Site ID
         Klaviyo → Audience → Lists → your list → Settings → List ID

     Leave `companyId` empty and the form still validates, but it says plainly
     that nothing was sent rather than thanking someone for joining a list
     that does not exist. See NEWSLETTER.md. */
  window.VOLA.klaviyoConfig = {
    /* Public API key / Site ID — six characters, safe to publish */
    companyId: '',

    /* The list to subscribe to */
    listId: '',

    /* Klaviyo pins its API by date. Bump it deliberately, not by accident. */
    revision: '2024-10-15',

    /* Whether the list above is set to double opt-in in Klaviyo.
       ┌───────────────────────────────────────────────────────────────────┐
       │ THIS MUST MATCH THE LIST. It is not cosmetic.                     │
       │                                                                   │
       │ Klaviyo answers 202 either way — "accepted", not "subscribed". On │
       │ a double opt-in list nobody is on it until they click the link in │
       │ the confirmation email, so telling them they are on it is the     │
       │ same false claim this site removed everywhere else.               │
       │                                                                   │
       │ true  → "Check your email to confirm"                             │
       │ false → "You are on the list"                                     │
       └───────────────────────────────────────────────────────────────────┘
       Defaults to true because it is the safe wording and, in the EU this
       maison ships from, the defensible one. */
    doubleOptIn: true
  };

  /* ────────────────────────────────────────────────────────── Formspree ──
     The contact form and the commission request. Both used to assemble a
     payload, throw it away, wait 800ms and say "Message sent to the atelier".

     A form endpoint rather than an email API, because sending mail needs a
     secret and this site has no server. The endpoint ID is public by
     design — it accepts submissions and can do nothing else — which puts it
     in the same category as the Storefront token and the Klaviyo company ID.

         Formspree → New form → copy the endpoint
         https://formspree.io/f/xxxxxxxx

     Any endpoint with the same contract works: Basin, Getform, Web3Forms,
     or twenty lines of your own behind a serverless function. See
     CONTACT.md.

     Leave it empty and both forms still validate, still keep the draft, and
     say plainly that nothing was sent. */
  window.VOLA.formsConfig = {
    /* Where a submitted form is posted */
    endpoint: '',

    /* Prefixes the email subject line so the atelier's inbox is scannable
       when these arrive beside everything else. */
    subjectPrefix: 'VOLÀ'
  };

  /* ────────────────────────────────────────────────────────── Analytics ──
     ┌─────────────────────────────────────────────────────────────────────┐
     │ READ THIS BEFORE FILLING IT IN.                                     │
     │                                                                     │
     │ Left empty, this site measures nothing. No script is loaded, no     │
     │ request is made, and the privacy page says so in as many words:     │
     │ "This site does not know which pages you have visited, and nothing  │
     │ here is designed to find out."                                      │
     │                                                                     │
     │ Fill it in and that sentence disappears, replaced by a row naming   │
     │ your provider and what it receives. That is not a courtesy — it is  │
     │ the difference between a privacy policy and a lie, and it is why    │
     │ the claim is derived from this block rather than written out.       │
     └─────────────────────────────────────────────────────────────────────┘

     Plausible by default: no cookies, no personal data, no cross-site
     profile, hosted in the EU. That combination is why this site still needs
     no consent banner — under the ePrivacy Directive consent is required for
     storing or reading data on the reader's device, and cookieless analytics
     does neither. Choose a provider that phones home with a cookie and you
     have taken on a banner as well.

         Plausible → Site settings → the domain you registered
         Self-hosting → set `host` to your own instance

     Fathom and Umami expose the same shape; see ANALYTICS.md to swap. */
  window.VOLA.analyticsConfig = {
    /* The site as registered with the provider, e.g. 'vola.example'.
       Empty = no analytics at all. */
    domain: '',

    /* Where the script lives. Change it to your own instance if you
       self-host, which keeps this in the same position as the fonts. */
    host: 'https://plausible.io',

    /* Honour Do Not Track and Global Privacy Control. On by default, and
       deliberately not exposed anywhere in the UI as a thing to turn off:
       a reader who has set either has already answered the question. */
    respectDoNotTrack: true,

    /* Measure localhost and file:// too. Off, so development does not
       pollute the numbers the shop is judged on. */
    trackLocalhost: false,

    /* Whether this provider stores or reads anything on the reader's device —
       a cookie, localStorage, a fingerprint, an ID that survives the visit.
       Plausible does none of it, which is why this is false and why the site
       needs no consent banner.
       ┌───────────────────────────────────────────────────────────────────┐
       │ Set this true when you swap in a provider that does — Google      │
       │ Analytics, Matomo with cookies on, anything with a client ID.     │
       │ Then the banner appears, this script is held back until consent   │
       │ is given, and the privacy page stops saying no banner is needed.  │
       │ Leaving it false with such a provider is not a shortcut past the  │
       │ banner; it is an inaccurate privacy policy.                       │
       └───────────────────────────────────────────────────────────────────┘ */
    storesOnDevice: false
  };

  /* ──────────────────────────────────────────────────────────── Consent ──
     ┌─────────────────────────────────────────────────────────────────────┐
     │ THERE IS NO BANNER, AND THAT IS THE CORRECT BEHAVIOUR TODAY.        │
     │                                                                     │
     │ What the law actually regulates is storing or reading data on the   │
     │ reader's device (ePrivacy Art. 5(3); GDPR governs what you then do  │
     │ with it). A banner is required when a site does that for something  │
     │ other than what the reader asked for. This site does not:           │
     │                                                                     │
     │   · no cookies at all, first or third party                         │
     │   · localStorage only for things the reader asked for — their bag,  │
     │     their saved sizes, their unsent draft — which is the strictly   │
     │     necessary exemption, not a loophole                             │
     │   · analytics, if enabled, is cookieless and stores nothing         │
     │   · fonts are self-hosted, so no third party is contacted at all    │
     │                                                                     │
     │ Showing a banner anyway is not a harmless precaution. It teaches    │
     │ people to dismiss consent without reading it, it implies tracking   │
     │ that is not happening, and it is a fifth of a second of everyone's  │
     │ life on every page for nothing.                                     │
     └─────────────────────────────────────────────────────────────────────┘

     So the banner is derived rather than decided. `auto` asks the services
     below whether any of them stores anything on the device; today none do,
     so nothing renders. Connect one that does — swap Plausible for a
     cookie-based analytics, add an advertising pixel — and the banner
     appears, that service is held back until consent is given, and the
     privacy page stops claiming no banner is needed. All at once.

     See CONSENT.md. */
  window.VOLA.consentConfig = {
    /* 'auto'   — show a banner only when something actually needs consent
       'always' — show it regardless (some organisations want it; it is still
                  a banner asking permission for nothing)
       'never'  — never show it, even if a service needs consent. Only
                  correct if consent is being collected somewhere else. */
    required: 'auto',

    /* Which categories a reader can decide on. 'necessary' is not listed
       because it is not a choice — it is the bag remembering what is in it.
       A category with no service behind it is not offered. */
    categories: [
      { id: 'analytics', label: 'Measurement',
        why: 'Counting page views and a few actions, so we know which pieces ' +
             'people look at.' },
      { id: 'marketing', label: 'Advertising',
        why: 'Nothing on this site uses this. It is listed so that the day ' +
             'something does, the choice is already here.' }
    ]
  };

  /* True when there is enough here to talk to a store. */
  window.VOLA.shopifyReady = function () {
    var c = window.VOLA.shopifyConfig;
    return !!(c && c.domain && c.storefrontToken);
  };

  /* True when there is a list to subscribe anyone to. */
  window.VOLA.newsletterReady = function () {
    var c = window.VOLA.klaviyoConfig;
    return !!(c && c.companyId && c.listId);
  };

  /* True when anything is being measured at all. The privacy page reads
     this to decide whether it may still claim the site measures nothing. */
  window.VOLA.analyticsReady = function () {
    var c = window.VOLA.analyticsConfig;
    return !!(c && c.domain);
  };

  /* True when a submitted form has somewhere to go. */
  window.VOLA.formsReady = function () {
    var c = window.VOLA.formsConfig;
    return !!(c && c.endpoint);
  };
})();
