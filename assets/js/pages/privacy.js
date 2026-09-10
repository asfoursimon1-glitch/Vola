/* VOLÀ — the privacy policy.

   A privacy policy is the document most likely on any site to describe a
   system that no longer exists. It is written once, by someone who asked the
   developers what happens, and then the developers change what happens.

   So this one is derived like everything else here. The storage table is read
   live from the browser it is rendered in. The processor table is read from
   the same config the runtime reads, and says which services are actually
   connected rather than listing every integration the site could have. Turn
   Klaviyo off and this page stops claiming your address goes to Klaviyo.

   What cannot be derived — a company registration number, a retention period
   set by an accountant, the name of a data protection officer — is printed as
   a named blank rather than invented. A policy that makes up its own
   controller details is worse than one that admits the gap. */
(function () {
  'use strict';

  var V = window.VOLA, esc = V.esc, H = V.house;

  /* ══════════════════════════════════════════════════ 1. CONTROLLER ══ */
  function renderController() {
    var host = document.getElementById('controller');
    if (!host) return;
    host.innerHTML =
      '<address class="prose__address">' +
        '<strong>VOLÀ Maison S.r.l.</strong><br>' +
        esc(H.street) + '<br>' +
        esc(H.postcode) + ' ' + esc(H.city) + ' (' + esc(H.province) + ')<br>' +
        esc(H.country) +
      '</address>' +
      '<p>Written enquiries about anything on this page: ' +
        '<a href="mailto:' + esc(H.email) + '">' + esc(H.email) + '</a>' +
        ' · <a href="tel:' + esc(H.phoneHref) + '">' + esc(H.phone) + '</a>, ' +
        esc(H.openDays) + ', ' + esc(H.openHours) + '.</p>';
  }

  /* The blanks, named. Each one says what it is and who can supply it, so
     this reads as a task list rather than as an apology. */
  var BLANKS = [
    ['Company registration number', 'The <em>numero REA</em> and Chamber of Commerce ' +
      'registration. From the company formation documents.'],
    ['VAT number', 'The <em>partita IVA</em>. Required on an Italian commercial site ' +
      'independently of data protection law.'],
    ['Data protection officer', 'A maison this size almost certainly does not need one. ' +
      'Say so explicitly, or name them — silence reads as an omission.'],
    ['Statutory retention period', 'How long invoices and order records must be kept ' +
      'under Italian tax law. From your accountant, not from a template.'],
    ['Each processor\'s transfer mechanism', 'Which of the services below rely on the ' +
      'EU–US Data Privacy Framework and which on standard contractual clauses. From ' +
      'each provider\'s current DPA.'],
    ['A lawyer\'s reading of all of it', 'The sections describing what this site does ' +
      'are accurate because they are generated from the code. That is not the same as ' +
      'the document being legally sufficient.']
  ];

  function renderBlanks() {
    var host = document.getElementById('blanks-list');
    if (!host) return;
    host.innerHTML = BLANKS.map(function (b) {
      return '<li><strong>' + esc(b[0]) + '</strong> — ' + b[1] + '</li>';
    }).join('');
  }

  /* ═════════════════════════════════════════════ 2. LOCAL STORAGE ══ */
  /* Every key this site writes, what it is for in plain words, and what
     erasing it costs. Keys are listed whether or not they are present, so the
     table describes the site rather than only this visit — but each row says
     which it is, and the empty ones are marked. */
  var KEYS = [
    { key: 'vola.bag.v1', where: 'local', name: 'Your bag',
      what: 'The pieces you have added, their sizes and quantities.',
      cost: 'Empties the bag.' },
    { key: 'vola.fit.v1', where: 'local', name: 'Your fit profile',
      what: 'Height, weight, waist and shoe size, and how you like things to fit.',
      cost: 'Size recommendations stop until you fill it in again.' },
    { key: 'vola.session.v1', where: 'both', name: 'Your session',
      what: 'That you are signed in, and the name shown in the header. ' +
            'Kept for the browser session unless you asked to be remembered.',
      cost: 'Signs you out on this device.' },
    { key: 'vola.shopify.token.v1', where: 'both', name: 'Your account token',
      what: 'The credential that keeps you signed in to the shop.',
      cost: 'Signs you out on this device.' },
    { key: 'vola.shopify.cart.v1', where: 'local', name: 'Checkout cart',
      what: 'The identifier of a cart created at the shop, so returning to ' +
            'checkout does not start a new one.',
      cost: 'The next checkout starts a fresh cart.' },
    { key: 'vola.contact.draft', where: 'local', name: 'Contact form draft',
      what: 'What you have typed into the contact form but not yet sent.',
      cost: 'Loses an unsent message.' },
    { key: 'vola.mtm.draft', where: 'local', name: 'Commission draft',
      what: 'What you have typed into the consultation request but not yet sent.',
      cost: 'Loses an unsent request.' },
    { key: 'vola.news.v1', where: 'local', name: 'Newsletter signup',
      what: 'That you subscribed, and the address you used, so the footer stops ' +
            'asking on every page.',
      cost: 'The footer asks again. It does not unsubscribe you — use the link ' +
            'in any letter for that.' },
    { key: 'vola.signin.fails.v1', where: 'local', name: 'Failed sign-in count',
      what: 'How many times sign-in has failed recently, to slow down guessing.',
      cost: 'Resets the count.' },
    /* The record of a consent choice is itself stored, and leaving it off
       this table would be the exact failure the table exists to prevent.
       Storing it needs no permission of its own: refusing to remember a
       refusal is how banners come back on every page. */
    { key: 'vola.consent.v1', where: 'local', name: 'Your consent choice',
      what: 'What you allowed or refused when asked, and when — so you are not ' +
            'asked again on every page.',
      cost: 'You will be asked again next time something needs permission.' }
  ];

  function readKey(k) {
    var out = { local: null, session: null };
    try { out.local = window.localStorage.getItem(k); } catch (e) { /* blocked */ }
    try { out.session = window.sessionStorage.getItem(k); } catch (e) { /* blocked */ }
    return out;
  }

  function bytes(n) {
    if (n < 1024) return n + ' bytes';
    return (n / 1024).toFixed(1) + ' KB';
  }

  function renderLocal() {
    var host = document.getElementById('local-store');
    if (!host) return;

    var rows = KEYS.map(function (k) {
      var v = readKey(k.key);
      var raw = v.local || v.session;
      var present = raw != null;
      var where = v.local && v.session ? 'local and session storage'
        : v.session ? 'session storage (cleared when you close the browser)'
        : v.local ? 'local storage' : '—';

      return '<tr' + (present ? '' : ' class="is-empty"') + '>' +
        '<th scope="row">' + esc(k.name) +
          '<span class="runs__cut"><code>' + esc(k.key) + '</code></span></th>' +
        '<td>' + esc(k.what) + '</td>' +
        '<td>' + (present
          ? '<span class="store__yes">' + bytes(raw.length) + ' · ' + esc(where) + '</span>'
          : '<span class="store__no">Nothing stored</span>') + '</td>' +
        '<td>' + (present
          ? '<button class="btn btn--ghost btn--sm" type="button" data-erase="' + esc(k.key) + '">' +
              'Erase<span class="sr-only"> ' + esc(k.name) + ' — ' + esc(k.cost) + '</span></button>'
          : '') + '</td>' +
      '</tr>';
    }).join('');

    var any = KEYS.some(function (k) { var v = readKey(k.key); return v.local || v.session; });

    host.innerHTML =
      '<div class="tablewrap"><table class="sizetable store">' +
        '<caption class="sr-only">Everything this site has stored in this browser, ' +
          'what it is for, and a control to erase each one.</caption>' +
        '<thead><tr>' +
          '<th scope="col">What</th><th scope="col">Why</th>' +
          '<th scope="col">In this browser</th><th scope="col"><span class="sr-only">Erase</span></th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>' +
      '<p class="store__all">' +
        (any
          ? '<button class="btn btn--ghost" type="button" id="erase-all">Erase all of it</button>'
          : '<span class="store__no">This site has nothing stored in this browser.</span>') +
      '</p>' +
      '<p class="store__live" role="status" aria-live="polite" hidden></p>';

    host.addEventListener('click', onErase);
  }

  /* Some of these keys have an owner in memory as well as a value on disk.
     Deleting the bag from under the cart module would leave the header
     counting items that no longer exist, so where a module owns a key it is
     asked to let go rather than robbed. Everything else is a plain removal. */
  var OWNERS = {
    'vola.bag.v1': function () { if (V.cart) V.cart.clear(); },
    'vola.session.v1': function () { if (V.auth) V.auth.signOut(); },
    'vola.shopify.token.v1': function () { if (V.auth) V.auth.signOut(); },
    'vola.news.v1': function () { if (V.newsletter) V.newsletter.forget(); },
    'vola.consent.v1': function () { if (V.consent) V.consent.withdraw(); },
    'vola.fit.v1': function () {
      if (V.fit && V.fit.clear) V.fit.clear();
      document.dispatchEvent(new CustomEvent('vola:fit'));
    }
  };

  function eraseKey(k) {
    /* The owner first, then the raw removal regardless — a module that is not
       loaded on this page must not be able to leave the key behind. */
    try { if (OWNERS[k]) OWNERS[k](); } catch (e) { /* fall through to the removal */ }
    try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ }
    try { window.sessionStorage.removeItem(k); } catch (e) { /* ignore */ }
  }

  function onErase(e) {
    var one = e.target.closest('[data-erase]');
    var all = e.target.closest('#erase-all');
    if (!one && !all) return;

    (one ? [one.getAttribute('data-erase')] : KEYS.map(function (k) { return k.key; }))
      .forEach(eraseKey);

    /* Repaint from storage, so the table proves the erase rather than
       asserting it — the same rule as everything else on this site. */
    renderLocal();
    var live = document.querySelector('.store__live');
    if (live) {
      live.textContent = one
        ? 'Erased. It is gone from this browser.'
        : 'Everything this site stored in this browser has been erased.';
      live.hidden = false;
    }
    V.toast(one ? 'Erased from this browser' : 'All local data erased');
  }

  /* ═══════════════════════════════════════════════ 3. PROCESSORS ══ */
  /* Read from the same config the runtime reads. A service that is not
     configured is not called, so it is listed as receiving nothing — and this
     page changes the moment the config does. */
  function processors() {
    var sc = V.shopifyConfig || {}, jm = V.judgemeConfig || {},
        kl = V.klaviyoConfig || {}, fm = V.formsConfig || {};

    return [
      {
        name: 'Shopify',
        role: 'The shop itself — catalogue, checkout, payment, accounts, orders.',
        gets: 'Your name, email, delivery and billing address, what you bought, and ' +
              'your payment details, which are handled by Shopify and never reach this site.',
        when: 'Only when you check out, sign in or create an account.',
        where: 'Canada and the United States',
        live: V.shopifyReady && V.shopifyReady(),
        policy: 'https://www.shopify.com/legal/privacy'
      },
      {
        name: 'Judge.me',
        role: 'Reviews.',
        gets: 'Whatever you put in a review, if you write one — your name as you give ' +
              'it, your score, your words. Reviews are collected by Judge.me after an ' +
              'order, not by this site.',
        when: 'Only if you write a review. Reading them sends nothing: they are ' +
              'built into this site, not fetched from Judge.me while you browse.',
        where: 'The United States',
        live: !!jm.shopDomain,
        policy: 'https://judge.me/privacy'
      },
      {
        name: 'Klaviyo',
        role: 'The newsletter.',
        gets: 'Your email address, and which page you subscribed from.',
        when: 'Only when you submit the footer signup.',
        where: 'The United States',
        live: V.newsletterReady && V.newsletterReady(),
        policy: 'https://www.klaviyo.com/legal/privacy-notice'
      },
      {
        name: 'Formspree',
        role: 'Delivering the contact and commission forms to the atelier.',
        gets: 'Your name, email, what you wrote, and your saved sizes if you ticked ' +
              'the box to include them.',
        when: 'Only when you send one of those two forms.',
        where: 'The United States',
        live: V.formsReady && V.formsReady(),
        policy: 'https://formspree.io/legal/privacy-policy'
      },
      {
        name: 'Plausible',
        role: 'Counting page views and a few actions.',
        gets: 'The page you are on, the page you came from, your country, and your ' +
              'browser and device type — plus the name of an action where one ' +
              'happened. No cookie, nothing stored on your device, no identifier ' +
              'that persists between visits, and never your name, address, message ' +
              'or measurements.',
        when: 'Every page load, unless your browser sends Do Not Track or Global ' +
              'Privacy Control, in which case the script is never even fetched.',
        where: 'The European Union',
        live: V.analyticsReady && V.analyticsReady(),
        policy: 'https://plausible.io/privacy'
      },
      {
        name: 'Google Fonts',
        role: 'The two typefaces this site is set in.',
        /* This one used to be the reason the table existed: it happened to
           everybody, on every page, unasked. The fonts are served from this
           domain now — but the row stays, deriving its own status from the
           page it is rendered on, so putting the Google link back into a
           <head> puts the disclosure back with it. */
        gets: 'Your IP address and browser details — sent automatically, on every ' +
              'page, before you do anything at all.',
        when: 'Every page load. This is the only entry here that happens without ' +
              'you choosing anything.',
        where: 'The United States',
        live: usesGoogleFonts(),
        avoidable: true,
        selfHosted: !usesGoogleFonts(),
        policy: 'https://policies.google.com/privacy'
      }
    ];
  }

  /* Read from the document rather than from a note-to-self. Any stylesheet,
     preconnect or preload pointing at Google's font hosts counts. */
  function usesGoogleFonts() {
    return Array.prototype.some.call(document.querySelectorAll('link[href]'), function (l) {
      return /fonts\.(googleapis|gstatic)\.com/.test(l.getAttribute('href') || '');
    });
  }

  function renderProcessors() {
    var host = document.getElementById('processors');
    if (!host) return;
    var list = processors();

    host.innerHTML =
      '<div class="tablewrap"><table class="sizetable proc">' +
        '<caption class="sr-only">Every service this site can send data to, whether it ' +
          'is currently connected, what it receives and when.</caption>' +
        '<thead><tr>' +
          '<th scope="col">Service</th><th scope="col">What it receives</th>' +
          '<th scope="col">When</th><th scope="col">Status</th>' +
        '</tr></thead>' +
        '<tbody>' + list.map(function (p) {
          return '<tr' + (p.live ? '' : ' class="is-empty"') + '>' +
            '<th scope="row"><a href="' + esc(p.policy) + '" rel="noopener noreferrer nofollow" ' +
              'target="_blank">' + esc(p.name) + '</a>' +
              '<span class="runs__cut">' + esc(p.role) + ' · ' + esc(p.where) + '</span></th>' +
            '<td>' + (p.live ? esc(p.gets) : '<span class="store__no">Nothing — not connected.</span>') + '</td>' +
            '<td>' + (p.live ? esc(p.when) : '—') + '</td>' +
            '<td>' + (p.live
              ? '<span class="proc__on">Connected</span>'
              : '<span class="proc__off">Not connected</span>') + '</td>' +
          '</tr>';
        }).join('') + '</tbody>' +
      '</table></div>';

    /* The fonts get their own paragraph either way. Loaded from Google they
       are the one transfer nobody chose, and that has to be said plainly.
       Served from here they are the answer to it — and worth saying too,
       because "we do not do that" is the part of a privacy policy a reader has
       no way to check for themselves. */
    var fonts = list.filter(function (p) { return p.avoidable; })[0];
    if (fonts && fonts.live) {
      host.insertAdjacentHTML('beforeend',
        '<div class="callout">' +
          '<h3>The one you did not choose</h3>' +
          '<p>Every other row above happens because you did something — bought, wrote, ' +
            'subscribed. <strong>Google Fonts is different.</strong> The stylesheet is ' +
            'requested from Google on every page load, which sends your IP address to a ' +
            'company you have no relationship with, before you have clicked anything. ' +
            'German courts have held this to be unlawful without consent.</p>' +
          '<p>It is entirely avoidable: self-host the two font files and the request ' +
            'never leaves this domain. Until that is done, honesty is the least we owe ' +
            'you, so it is listed here rather than omitted for being inconvenient.</p>' +
        '</div>');
    } else if (fonts) {
      host.insertAdjacentHTML('beforeend',
        '<div class="callout">' +
          '<h3>The fonts are ours</h3>' +
          '<p>This site used to load its two typefaces from Google, which sent your IP ' +
            'address to Google before the first paint of every page, whether or not you ' +
            'went on to do anything here. German courts have held that unlawful without ' +
            'consent, and it was the only transfer on this site that nobody chose.</p>' +
          '<p><strong>The files are held here now.</strong> Nothing on this page is ' +
            'requested from another domain — not a font, not a script, not a pixel. ' +
            'You can check: open your browser\'s network panel and reload. Every request ' +
            'should be to this domain and no other.</p>' +
        '</div>');
    }
  }

  /* ═════════════════════════════════════════════════ 4. PURPOSES ══ */
  function renderPurposes() {
    var host = document.getElementById('purposes');
    if (!host) return;

    var items = [
      { icon: 'bag', title: 'When you buy something',
        body: 'Your name, email, delivery and billing address, and what you ordered. ' +
              'We need all of it to make and send the piece and to handle a return ' +
              'within ' + V.terms.returnsDays + ' days. Payment details go straight to ' +
              'Shopify and its payment providers — they never touch this site, and we ' +
              'never see a card number.' },
      { icon: 'scissors', title: 'When you write to us',
        body: 'Your name, your email and whatever you put in the message. If you ticked ' +
              'the box, your saved sizes. We keep the correspondence so that the next ' +
              'person you speak to does not make you explain it all again.' },
      { icon: 'ruler', title: 'When you save a fit profile',
        body: 'Nothing reaches us. It is written to your own browser and read there. ' +
              'See the section below.' },
      { icon: 'check', title: 'When you subscribe',
        body: 'Your email address and which page you subscribed from. Nothing else.' }
    ];

    /* ─────────────────────────────────────────────────────────────────────
       The two versions of this section, and why it is not written by hand.

       The site shipped with no analytics, and this page said so: "nothing
       here is designed to find out". That sentence was worth something, and
       it was one config line away from being false. Anyone turning analytics
       on would have had no reason to think of it — which is precisely how
       privacy policies come to describe a site that no longer exists.

       So the claim reads the same config the measuring does. Fill in
       analyticsConfig.domain and the promise below is replaced by a
       description. There is no way to have both.
       ───────────────────────────────────────────────────────────────────── */
    if (V.analyticsReady && V.analyticsReady()) {
      var a = V.analyticsConfig || {};
      /* Whether it stores anything on the device is the fact the whole
         section turns on, and it is the one that would otherwise be left
         behind: a provider swap changes it, and nobody would think to come
         and edit a sentence here. So it is read, not written. */
      var stores = a.storesOnDevice === true;
      items.push({ icon: 'ruler', title: 'While you read',
        body: 'We count page views and a handful of actions — a piece added to the ' +
              'bag, a checkout started, a filter combination that returned nothing. ' +
              (stores
                ? 'Doing it stores something on your device, which is why you were ' +
                  'asked before any of it ran, and why you can change that answer ' +
                  'at any time.'
                : 'It is done without cookies and without storing anything on your ' +
                  'device, which is why this site still has no consent banner to ' +
                  'click through.') +
              ' No profile of you is built and nothing follows you off this ' +
              'domain. Your name, your address, your message and your measurements ' +
              'are never included' +
              (a.respectDoNotTrack !== false
                ? ', and if your browser sends Do Not Track or Global Privacy ' +
                  'Control, none of it runs at all.'
                : '.') });
    } else {
      items.push({ icon: 'alert', title: 'What we do not do',
        body: 'No analytics. No advertising pixels. No tracking cookies. No selling or ' +
              'sharing your details with anyone who is not listed in the table above. ' +
              'This site does not know which pages you have visited, and nothing here ' +
              'is designed to find out.' });
    }

    host.innerHTML = items.map(function (it, i) {
      return '<div class="value" data-reveal style="--reveal-delay:' + (i * 60) + 'ms">' +
        '<span class="value__icon">' + V.icon(it.icon) + '</span>' +
        '<h3>' + esc(it.title) + '</h3>' +
        '<p>' + esc(it.body) + '</p>' +
      '</div>';
    }).join('');
    V.stagger(host.querySelectorAll('.value'));
  }

  /* ═════════════════════════════════════════════ 2b. CONSENT CLAIMS ══ */
  /* The site made four separate claims about cookies and banners, all of
     them written by hand, all of them true only for as long as nobody added
     a pixel. They are the same claim, so they now come from the same place:
     VOLA.consent, which asks the services whether any of them stores
     anything on the reader's device.

     Add something that does, and this page says so, the banner appears, and
     analytics waits for an answer — together, from one fact. */
  function needsConsent() {
    return !!(V.consent && V.consent.needs());
  }

  function renderConsentClaims() {
    var cookie = document.getElementById('cookie-claim');
    if (cookie) {
      cookie.innerHTML = needsConsent()
        ? 'Some of what this site loads stores data on your device, which is why ' +
          'you were asked. Your answer is recorded below and you can change it at ' +
          'any time. Everything else here is kept in your own browser\'s storage, ' +
          'on your own device — never sent to us, not readable by anyone else, and ' +
          'erasable here, now, without asking us.'
        : 'This site sets <strong>no cookies at all</strong> — not for analytics, ' +
          'not for advertising, not for anything. What it does keep is a small ' +
          'amount of data in your own browser\'s storage, on your own device. It is ' +
          'never sent to us, it is not readable by anyone else, and you can erase ' +
          'any of it here, now, without asking us.';
    }

    var banner = document.getElementById('banner-claim');
    if (banner) {
      banner.innerHTML = needsConsent()
        ? 'The bag, your sizes and an unsent draft are kept on this basis and are ' +
          'not part of what you were asked about — you asked for them by using the ' +
          'site. The consent question covers only what does something else.'
        : 'This is also why there is no cookie banner: nothing here is used to ' +
          'track you, so nothing here needs your permission. ' +
          '<a href="#consent-control">What that means</a>.';
    }
  }

  /* The control, and — when there is nothing to decide — the explanation of
     why there isn't. A privacy page that simply omits the subject leaves the
     reader unable to tell a site with nothing to ask from one that forgot to
     ask, and those are very different sites. */
  function renderConsentControl() {
    var host = document.getElementById('consent-control');
    if (!host) return;

    if (!needsConsent()) {
      host.innerHTML =
        '<h3>Why you were not asked</h3>' +
        '<p>Consent is required for storing or reading things on your device that ' +
          'you did not ask for. This site does not do that. It keeps your bag, your ' +
          'saved sizes and any unsent message in your own browser because those are ' +
          'the things you asked it to remember, it sets no cookies, its measurement ' +
          '— when it is switched on at all — stores nothing, and its typefaces are ' +
          'served from here rather than fetched from Google.</p>' +
        '<p>So there is nothing to consent to, and a banner asking you to would be ' +
          'theatre. Worse than theatre: it would teach you to dismiss consent ' +
          'notices without reading them, which is what makes the ones that matter ' +
          'worthless. The machinery is built and dormant — the day something here ' +
          'does need your permission, you will be asked, and this section will ' +
          'become the place you change your mind.</p>';
      return;
    }

    var rec = V.consent.state();
    var chosen = V.consent.categories().filter(function (c) {
      return V.consent.granted(c.id);
    }).map(function (c) { return c.label; });

    host.innerHTML =
      '<h3>Your choices</h3>' +
      '<p>' + (rec === 'unset'
        ? 'You have not answered yet.'
        : chosen.length
          ? 'You have allowed: <strong>' + esc(chosen.join(', ')) + '</strong>.'
          : 'You have refused everything optional. Nothing beyond what the site ' +
            'needs to work is running.') + '</p>' +
      '<p><button class="btn btn--ghost" type="button" id="consent-change">' +
        'Change my choices</button></p>';

    var btn = document.getElementById('consent-change');
    if (btn) btn.addEventListener('click', function () { V.consent.open(); });
  }

  /* ═══════════════════════════════════════════════ 4b. LEGAL BASIS ══ */
  /* The static rows in the markup describe things this site always does.
     Measuring is conditional, so its row is too — a basis listed for
     processing that is switched off is a different kind of inaccuracy, but
     still an inaccuracy. */
  function renderBasis() {
    var host = document.getElementById('basis-rows');
    if (!host || !(V.analyticsReady && V.analyticsReady())) return;
    host.insertAdjacentHTML('beforeend',
      '<tr><th scope="row">Counting visits</th><td>Legitimate interest</td>' +
        '<td>Knowing which pieces people look at is how a small shop decides what ' +
          'to cut next. It is done without cookies and without identifying anyone, ' +
          'which is what keeps the interest legitimate — and what keeps the row ' +
          'above about consent banners true.</td></tr>');
  }

  /* ════════════════════════════════════════════════ 5. RETENTION ══ */
  function renderRetention() {
    var host = document.getElementById('retention');
    if (!host) return;

    var analytics = V.analyticsReady && V.analyticsReady()
      ? '<tr><th scope="row">Counts of visits and actions</th>' +
          '<td>Indefinitely, as totals. There is nothing in them that is about ' +
            'you — no identifier, no session, nothing that could be picked back ' +
            'out — so there is nothing to delete on request and nothing a request ' +
            'could be matched against.</td></tr>'
      : '';

    host.innerHTML =
      '<div class="tablewrap"><table class="sizetable">' +
        '<caption class="sr-only">How long each kind of data is kept</caption>' +
        '<thead><tr><th scope="col">What</th><th scope="col">How long</th></tr></thead>' +
        '<tbody>' +
          '<tr><th scope="row">Anything in your browser</th>' +
            '<td>Until you erase it, above. We cannot delete it for you and we cannot ' +
              'read it either.</td></tr>' +
          '<tr><th scope="row">An order and its invoice</th>' +
            '<td><em class="blank">[statutory period — from your accountant]</em>. ' +
              'This is the one thing on this list we cannot delete on request: tax law ' +
              'requires us to keep it.</td></tr>' +
          '<tr><th scope="row">Correspondence with the atelier</th>' +
            '<td>Two years from the last message, so a repair or an alteration years ' +
              'later has its history. Ask and we will delete it sooner.</td></tr>' +
          '<tr><th scope="row">A commission record and your pattern</th>' +
            '<td>Kept while you own the piece, because the repair promise and any later ' +
              'alteration depend on it. Ask and we will destroy the pattern.</td></tr>' +
          '<tr><th scope="row">Your newsletter subscription</th>' +
            '<td>Until you unsubscribe, and the record that you unsubscribed after that — ' +
              'that record is how we make sure we do not write to you again.</td></tr>' +
          analytics +
          '<tr><th scope="row">Your account</th>' +
            '<td>Until you close it. Closing it does not delete the orders above.</td></tr>' +
        '</tbody>' +
      '</table></div>';
  }

  /* ═══════════════════════════════════════════════════ 6. RIGHTS ══ */
  var RIGHTS = [
    ['See what we hold', 'A copy of everything, in a readable form.'],
    ['Correct it', 'An address, a name, a spelling.'],
    ['Have it deleted', 'Everything except what tax law obliges us to keep — which we ' +
      'will tell you plainly rather than refusing without a reason.'],
    ['Take it elsewhere', 'Your data in a machine-readable file, or sent directly to ' +
      'someone else.'],
    ['Object', 'To anything we do on the basis of legitimate interest.'],
    ['Restrict', 'Ask us to hold it but stop using it while something is in dispute.'],
    ['Withdraw consent', 'For the newsletter and for saved sizes, at any time, without ' +
      'affecting what was lawful before you withdrew it.'],
    ['Complain', 'To your data protection authority, without going through us first.']
  ];

  function renderRights() {
    var host = document.getElementById('rights-list');
    if (host) {
      host.innerHTML = '<dl class="rights">' + RIGHTS.map(function (r) {
        return '<div class="rights__row"><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>';
      }).join('') + '</dl>';
    }

    var route = document.getElementById('rights-route');
    if (route) {
      route.innerHTML = 'Write to <a href="mailto:' + esc(H.email) +
        '?subject=' + encodeURIComponent('Data request') + '">' + esc(H.email) + '</a> ' +
        'or to the address at the top of this page. We answer within one month, and we ' +
        'answer within ' + esc(H.replyWithin) + ' to say we have it. ' +
        'Anything stored in your own browser you can erase yourself, above, without ' +
        'asking us at all.';
    }
  }

  /* ═════════════════════════════════════════════════ 7. CONTENTS ══ */
  /* Built from the sections that exist, so a section added or removed cannot
     leave the contents list describing a page that is not there. */
  function renderToc() {
    var host = document.getElementById('toc');
    if (!host) return;
    var secs = document.querySelectorAll('#privacy-body > section[id]');
    host.innerHTML = Array.prototype.map.call(secs, function (s) {
      var h = s.querySelector('h2');
      return '<li><a href="#' + s.id + '">' + esc(h ? h.textContent : s.id) + '</a></li>';
    }).join('');
  }

  /* boot ---------------------------------------------------------------- */
  renderController();
  renderBlanks();
  renderLocal();
  renderProcessors();
  renderPurposes();
  renderConsentClaims();
  renderConsentControl();
  renderBasis();
  renderRetention();
  renderRights();
  renderToc();
})();
