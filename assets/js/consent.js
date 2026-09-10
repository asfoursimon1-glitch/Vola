/* VOLÀ — consent.

   This file renders nothing today, and that is the finished behaviour rather
   than an unfinished one.

   What the law regulates is storing or reading data on the reader's device
   (ePrivacy Art. 5(3); the GDPR then governs what you do with what you got).
   Consent is required when a site does that for something the reader did not
   ask for. This site does not do it: no cookies at all, localStorage only for
   the bag, the saved sizes and an unsent draft — all things the reader asked
   for, which is the strictly necessary exemption rather than a loophole —
   cookieless analytics, and self-hosted fonts.

   A banner anyway is not a harmless precaution:

     · it teaches people to dismiss consent notices without reading them,
       which makes the notices that matter worthless;
     · it implies tracking that is not happening, which is its own kind of
       dishonesty on a site whose whole argument is that it does not overclaim;
     · it costs every reader a decision on every page, for nothing.

   So the banner is derived, exactly like the review counts and the processor
   table: `needs()` asks the services whether any of them stores anything on
   the device. Today none do and nothing renders. Connect one that does and
   the banner appears, that service is held back until a choice is made, and
   the privacy page stops claiming none is needed — all from the same answer.

   The machinery below is real. It is here so that the day someone adds a
   pixel, the correct thing happens by itself instead of being remembered. */
(function () {
  'use strict';

  var V = window.VOLA;
  var KEY = 'vola.consent.v1';

  /* Bumped when the categories change materially. A stored choice from an
     older version is not a choice about the current one, so it is asked
     again rather than assumed to carry over. */
  var VERSION = 1;

  function cfg() { return V.consentConfig || {}; }

  /* ══════════════════════════════════════════════ what needs consent ══ */
  /* Each entry answers one question: does this service store or read
     anything on the reader's device? Not "is it a third party" — a request to
     a third party is a data transfer worth disclosing on the privacy page,
     but it is not by itself a consent question. */
  function services() {
    var a = V.analyticsConfig || {};
    return [
      {
        id: 'analytics',
        name: 'Plausible',
        on: !!(V.analyticsReady && V.analyticsReady()),
        stores: a.storesOnDevice === true
      }
      /* Add a pixel here and give it stores: true. Shopify, Judge.me,
         Klaviyo and Formspree are absent deliberately: none of them stores
         anything on this domain. Shopify's hosted checkout sets its own
         cookies, but that happens on Shopify's domain under Shopify's notice,
         after the reader has chosen to go there. */
    ];
  }

  /* The categories a reader is actually asked about: those with a service
     behind them that is switched on and does store something. An empty list
     is the answer "nothing to ask", not "ask about everything". */
  function liveCategories() {
    var need = {};
    services().forEach(function (s) { if (s.on && s.stores) need[s.id] = true; });
    return (cfg().categories || []).filter(function (c) { return need[c.id]; });
  }

  function needs() {
    var mode = cfg().required || 'auto';
    if (mode === 'never') return false;
    if (mode === 'always') return true;
    return liveCategories().length > 0;
  }

  /* ═══════════════════════════════════════════════════════ the choice ══ */
  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      /* A choice about a different set of categories is not a choice about
         this one. Silently honouring it would be consent by assumption. */
      if (!v || v.version !== VERSION) return null;
      return v;
    } catch (e) { return null; }
  }

  function write(granted) {
    var rec = {
      version: VERSION,
      granted: granted,
      at: new Date().toISOString()
    };
    try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* non-fatal */ }
    /* Storing the record itself needs no consent: it is the reader's own
       decision, kept so they are not asked again. Refusing to remember a
       refusal is how banners come back on every page. */
    document.dispatchEvent(new CustomEvent('vola:consent', { detail: rec }));
    return rec;
  }

  function granted(category) {
    /* Nothing needs consent → everything that is running is running
       lawfully, so the answer is yes rather than "unset". A caller asking
       "may I?" when there is nothing to ask about should not be blocked. */
    if (!needs()) return true;
    var rec = read();
    if (!rec) return false;
    return rec.granted.indexOf(category) > -1;
  }

  function state() {
    if (!needs()) return 'not-required';
    return read() ? 'decided' : 'unset';
  }

  /* ══════════════════════════════════════════════════════════ the UI ══ */
  var host = null;

  function categoryRow(c, checked) {
    var id = 'consent-' + c.id;
    return '<div class="consent__opt">' +
      '<label class="checkline" for="' + id + '">' +
        '<input type="checkbox" id="' + id + '" value="' + V.esc(c.id) + '"' +
          (checked ? ' checked' : '') + '>' +
        '<span><b>' + V.esc(c.label) + '</b><br>' + V.esc(c.why) + '</span>' +
      '</label>' +
    '</div>';
  }

  /* `mode` is 'banner' for the first ask, 'preferences' for a reader coming
     back to change their mind from the privacy page. */
  function open(mode) {
    close();
    var cats = liveCategories();
    var rec = read();
    var pre = rec ? rec.granted : [];

    host = document.createElement('section');
    host.className = 'consent' + (mode === 'preferences' ? ' consent--prefs' : '');
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-labelledby', 'consent-h');
    host.setAttribute('aria-describedby', 'consent-body');
    host.tabIndex = -1;

    host.innerHTML =
      '<div class="consent__inner">' +
        '<h2 class="consent__title" id="consent-h">' +
          (mode === 'preferences' ? 'Your choices' : 'Before you go on') + '</h2>' +
        '<p class="consent__body" id="consent-body">' +
          'This site keeps your bag, your saved sizes and any unsent message in your ' +
          'own browser. That needs no permission — it is what you asked it to do. ' +
          'These do:' +
        '</p>' +
        '<div class="consent__opts">' +
          cats.map(function (c) {
            return categoryRow(c, pre.indexOf(c.id) > -1);
          }).join('') +
        '</div>' +
        '<div class="consent__actions">' +
          /* Refusing is exactly as easy as accepting, in the same place, at
             the same size, in the same style. A "reject" hidden behind a
             second screen is not a free choice, and the regulators that
             matter have said so repeatedly. */
          '<button class="btn btn--primary" type="button" data-consent="all">Accept all</button>' +
          '<button class="btn btn--primary" type="button" data-consent="none">Reject all</button>' +
          (cats.length > 1
            ? '<button class="btn btn--ghost" type="button" data-consent="selected">Save my choice</button>'
            : '') +
        '</div>' +
        '<p class="consent__foot"><a href="privacy.html">What we collect and why</a></p>' +
      '</div>';

    document.body.appendChild(host);
    host.addEventListener('click', onClick);

    /* Focus moves to the dialog so it is not missed, but it is not trapped:
       a reader who would rather read the page first must be able to. The
       choice is remembered whenever they make it. */
    host.focus();
  }

  function close() {
    if (host) { host.remove(); host = null; }
  }

  function onClick(e) {
    var btn = e.target.closest('[data-consent]');
    if (!btn) return;
    var what = btn.getAttribute('data-consent');
    var cats = liveCategories().map(function (c) { return c.id; });

    var chosen;
    if (what === 'all') chosen = cats;
    else if (what === 'none') chosen = [];
    else {
      chosen = Array.prototype.map.call(
        host.querySelectorAll('input[type=checkbox]:checked'),
        function (i) { return i.value; });
    }

    write(chosen);
    close();
    V.toast(chosen.length ? 'Saved. You can change this on the privacy page.'
                          : 'Saved — nothing optional will run.');
  }

  /* ═════════════════════════════════════════════════════════ public ══ */
  V.consent = {
    needs: needs,
    state: state,
    granted: granted,
    categories: liveCategories,
    /* Reopened from the privacy page. Returns false when there is nothing to
       decide, so the caller can say so rather than opening an empty dialog. */
    open: function () {
      if (!needs()) return false;
      open('preferences');
      return true;
    },
    withdraw: function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      document.dispatchEvent(new CustomEvent('vola:consent', { detail: null }));
    },
    onChange: function (fn) { document.addEventListener('vola:consent', fn); }
  };

  /* boot ---------------------------------------------------------------- */
  /* This file loads before app.js, because analytics.js asks it for
     permission at its own boot and must not run first. So the API above is
     ready immediately — it is arithmetic over config and storage, and needs
     nothing — while the banner waits for a document to render into and for
     V.esc and V.toast to exist. Asking permission is urgent; drawing the box
     is not. */
  function boot() { if (state() === 'unset') open('banner'); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
