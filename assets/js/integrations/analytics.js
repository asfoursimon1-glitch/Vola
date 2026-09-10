/* VOLÀ — analytics.

   This site had none, and its privacy page said so: "This site does not know
   which pages you have visited, and nothing here is designed to find out."

   That sentence was worth something, so the shape of this module is decided by
   the requirement to keep it true whenever it is on display. Nothing loads
   unless `analyticsConfig.domain` is filled in — no script tag, no request, no
   beacon — and the privacy page reads the same config to decide whether it may
   still make the claim. Turn analytics on and the claim disappears by itself.
   You cannot end up with both.

   Plausible by default, for reasons that are not preference:

     · no cookies, and nothing written to the reader's device, which is what
       the ePrivacy Directive actually regulates — so no consent banner
     · no personal data and no IP retention, so no lawful-basis argument to
       have and nothing to hand over in a subject access request
     · no cross-site profile, so nobody is followed off this domain
     · hosted in the EU, so no transfer question either
     · ~1KB, versus about 45KB for the usual alternative

   The moment you swap it for something that sets a cookie, this site needs a
   consent banner and this comment becomes wrong. Read ANALYTICS.md first.

   What is never sent, under any circumstances: an email address, a name, a
   message, an order number, a fit profile, a measurement. There is a guard at
   the bottom of this file that drops them, because the seams that call
   `track()` are edited by people who did not read this paragraph. */
(function () {
  'use strict';

  var V = window.VOLA;

  function cfg() { return V.analyticsConfig || {}; }
  function ready() { return V.analyticsReady && V.analyticsReady(); }

  /* ───────────────────────────────────────────────────────── objections ── */
  /* Reasons not to measure, checked before anything loads. Each returns the
     reason as a string so the console can say which one applied — a silent
     no-op is indistinguishable from a broken integration. */
  function objection() {
    if (!ready()) return 'not configured';

    if (cfg().respectDoNotTrack !== false) {
      /* Global Privacy Control is the one with legal force behind it in some
         jurisdictions; Do Not Track has none anywhere and is honoured here
         anyway. Somebody who set either has answered the question already,
         and asking again in a nicer font is not consent. */
      if (navigator.globalPrivacyControl === true) return 'Global Privacy Control';
      var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
      if (dnt === '1' || dnt === 'yes') return 'Do Not Track';
    }

    if (cfg().trackLocalhost !== true) {
      if (location.protocol === 'file:') return 'local file';
      if (/^(localhost|127\.0\.0\.1|\[::1\]|.*\.local)$/i.test(location.hostname)) {
        return 'localhost';
      }
    }

    /* Consent, last, because it is the only objection that can be lifted
       while the page is open. `granted` answers true when nothing needs
       consent at all — with a cookieless provider there is nothing to ask
       about, so nothing is held back. Set analyticsConfig.storesOnDevice and
       this becomes a real gate: no script until a choice is made. */
    if (V.consent && !V.consent.granted('analytics')) {
      return V.consent.state() === 'unset' ? 'awaiting consent' : 'consent refused';
    }
    return null;
  }

  /* ────────────────────────────────────────────────────────────── loading ── */
  var loaded = false;

  function load() {
    if (loaded) return;
    loaded = true;

    /* The stub goes in before the tag, so a call made in the same tick as the
       first event is queued by Plausible rather than dropped on the floor. */
    window.plausible = window.plausible || function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };

    var s = document.createElement('script');
    s.defer = true;
    s.setAttribute('data-domain', cfg().domain);
    /* the manual + custom-events build: the site sends its own pageviews, so
       a filtered collection URL does not read as a separate page */
    s.src = (cfg().host || 'https://plausible.io').replace(/\/+$/, '') +
      '/js/script.manual.tagged-events.js';
    s.onerror = function () {
      /* Blocked by an extension, or the instance is down. Neither is a problem
         the reader needs to hear about, and neither may break the page. The
         queued calls stay queued and go nowhere, which is the correct
         outcome — a blocked tracker is a preference, not a fault. */
      window.plausible.q = [];
    };
    document.head.appendChild(s);
  }

  /* ──────────────────────────────────────────────────────────── the guard ── */
  /* Keys that must never reach a third party, and values that look like a
     person however they were labelled. The seams calling track() are spread
     across seven files and will be edited by people who have not read the
     header of this one, so the rule is enforced here rather than trusted. */
  var FORBIDDEN_KEY = new RegExp([
    'email', 'name', 'address', 'phone', 'message', 'password', 'token', 'order',
    'height', 'weight', 'waist', 'chest', 'hip', 'bust', 'measure', 'profile'
  ].join('|'), 'i');
  var LOOKS_PERSONAL = [
    /[^\s@]+@[^\s@]+\.[^\s@]+/,          /* an email address */
    /\+?\d[\d\s().-]{7,}\d/              /* a phone number */
  ];

  function clean(props) {
    if (!props) return null;
    var out = {}, kept = 0;
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === '') return;
      if (FORBIDDEN_KEY.test(k)) return warn(k, 'the key names personal data');
      v = String(v);
      if (v.length > 120) return warn(k, 'the value is too long to be a category');
      for (var i = 0; i < LOOKS_PERSONAL.length; i++) {
        if (LOOKS_PERSONAL[i].test(v)) return warn(k, 'the value looks like personal data');
      }
      out[k] = v; kept++;
    });
    return kept ? out : null;
  }

  function warn(key, why) {
    console.warn('[VOLÀ] analytics: dropped "' + key + '" — ' + why +
      '. Nothing identifying is ever sent. See assets/js/integrations/analytics.js.');
  }

  /* ────────────────────────────────────────────────────────────── sending ── */
  var why = null;

  function send(name, props) {
    if (why) return;
    load();
    window.plausible(name, { props: clean(props) || undefined });
  }

  /* A pageview, sent by hand. Query strings are dropped: `?id=obi-belt` is
     useful, but `?email=…` in a link somebody pasted is not, and there is no
     way to tell them apart reliably enough to risk it. The product page sends
     its piece as a property instead, which is the part worth counting. */
  function pageview() {
    if (why) return;
    load();
    window.plausible('pageview', {
      u: location.protocol + '//' + location.host + location.pathname
    });
  }

  /* ─────────────────────────────────────────────────────────────── public ── */
  /* Every call site uses this, and every call site is safe if analytics is
     off: it returns immediately and nothing is loaded. */
  V.track = function (name, props) {
    try { send(name, props); } catch (e) { /* measuring must never break a page */ }
  };
  V.analytics = {
    enabled: function () { return !why; },
    reason: function () { return why; },
    pageview: pageview
  };

  /* A choice made after the page loaded has to take effect on that page, not
     the next one. Someone who accepts and then leaves would otherwise be
     counted as never having visited — and someone who withdraws would go on
     being measured until they navigated, which is worse. */
  function reconsider() {
    var was = why;
    why = objection();
    if (was && !why) pageview();       /* just granted: start, from here */
    if (!was && why) loaded = true;    /* just withdrawn: send nothing more */
  }

  /* boot ---------------------------------------------------------------- */
  why = objection();

  if (V.consent && V.consent.onChange) V.consent.onChange(reconsider);

  if (why) {
    /* Say it once, to the console, for whoever is wondering why the dashboard
       is empty. Never to the reader — they did not ask. */
    if (why !== 'not configured') {
      console.info('[VOLÀ] analytics off: ' + why + '. Nothing is loaded or sent.');
    }
    return;
  }

  pageview();
})();
