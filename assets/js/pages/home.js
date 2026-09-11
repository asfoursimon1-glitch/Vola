/* VOLÀ — home.

   The homepage has one job: route people into the collection without
   flattening the brand on the way. Everything below is rendered from
   data.js rather than typed into the HTML, so a count, a mill or a category
   can never drift out of step with the catalogue behind it — a homepage that
   says "nine disciplines" over six tiles is the cheapest possible way to look
   careless. */
(function () {
  'use strict';

  var V = window.VOLA;
  var esc = V.esc;

  function fill(id, list) {
    var host = document.getElementById(id);
    if (!host) return;
    host.innerHTML = list.map(V.card).join('');
    V.stagger(host.querySelectorAll('.card'));
  }

  function inCategory(slug) {
    return V.products.filter(function (p) { return p.category === slug; });
  }

  /* ------------------------------------------------ nine disciplines */
  /* All nine, in catalogue order, each fronted by its own first piece. Add a
     tenth category to data.js and it appears here without touching markup. */
  function renderTiles() {
    var host = document.getElementById('tiles');
    if (!host) return;
    host.innerHTML = V.categories.map(function (c) {
      var items = inCategory(c.slug);
      if (!items.length) return '';
      var lead = items[0];
      return '<a class="tile" href="shop.html?c=' + c.slug + '">' +
        '<img src="' + lead.image + '" alt="" width="800" height="1000" loading="lazy" decoding="async">' +
        '<span class="tile__label">' + esc(c.label) +
          '<span class="tile__count">' + items.length +
            (items.length === 1 ? ' piece' : ' pieces') + '</span>' +
        '</span>' +
      '</a>';
    }).join('');
  }

  /* ------------------------------------------------------- your size */
  /* With a profile saved this is a shelf of pieces that actually come in your
     size; without one it is a quiet invitation, not a wall. Same slot either
     way, so the page does not jump around between visits. */
  var SYSTEM_WORDS = { apparel: 'in apparel', waist: 'in denim', foot: 'in shoes' };

  function sizeSummary() {
    var p = V.fit.profile || {};
    var parts = [];
    /* Report the size the profile resolves to, not the raw measurement —
       "waist 27" is an input, "you take a 27" is the answer. baseSize, not
       recommend: this is your size in general, before any one cut's habit of
       running small gets involved. */
    ['apparel', 'waist', 'foot'].forEach(function (sys) {
      var size = V.fit.baseSize(sys);
      if (!size) return;
      parts.push('<span><b>' + esc(size) + '</b>' + SYSTEM_WORDS[sys] + '</span>');
    });
    var prefer = (V.fit.prefers.filter(function (o) { return o.id === (p.prefer || 'true'); })[0] || {}).label;
    if (prefer) parts.push('<span>worn ' + esc(prefer.toLowerCase()) + '</span>');
    return parts.join('');
  }

  function renderForYou() {
    var root = document.getElementById('foryou-root');
    if (!root) return;

    if (!V.fit.has()) {
      root.innerHTML =
        '<section class="section section--tight" aria-labelledby="fit-h">' +
          '<div class="wrap">' +
            '<div class="fitband">' +
              '<div class="fitband__copy">' +
                '<p class="eyebrow">Sizing</p>' +
                '<h2 class="display display--lg" id="fit-h">Four measurements, once</h2>' +
                '<p class="lede" style="font-size:1rem">Height, weight, waist and shoe. Every piece then ' +
                  'tells you whether it comes in your size and which one to take — including when a cut ' +
                  'runs small. Kept in this browser, never sent anywhere, no account.</p>' +
              '</div>' +
              '<div class="fitband__form">' + V.fit.formMarkup('home') + '</div>' +
            '</div>' +
          '</div>' +
        '</section>';
    } else {
      var mine = V.products.filter(function (p) {
        return V.fit.canSize(p) && V.fit.fitsProfile(p);
      });
      var summary = sizeSummary();
      root.innerHTML =
        '<section class="section section--tight" aria-labelledby="you-h">' +
          '<div class="wrap">' +
            '<div class="sec-head">' +
              '<div class="sec-head__title">' +
                '<p class="eyebrow">Your fit profile</p>' +
                '<h2 class="display display--xl" id="you-h">In your size</h2>' +
              '</div>' +
              (mine.length > 4
                ? '<a class="link-u" href="shop.html?fit=1">See all ' + mine.length + ' pieces</a>'
                : '<a class="link-u" href="shop.html">View the collection</a>') +
            '</div>' +
            (summary ? '<p class="sizesum">' + summary +
              '<button class="link-u" type="button" data-fit-toggle>Edit</button></p>' : '') +
            '<div class="fitpanel" id="home-fit-panel" hidden>' + V.fit.formMarkup('home') + '</div>' +
            (mine.length
              ? '<div class="grid-products" id="for-you"></div>'
              : '<p class="lede" style="font-size:1rem">Nothing in the collection comes in your size ' +
                'at the moment. <a class="link-u" href="contact.html#appointment">Book a fitting</a> and ' +
                'we will cut to your measurements.</p>') +
          '</div>' +
        '</section>';
      if (mine.length) fill('for-you', mine.slice(0, 4));
    }

    var panel = document.getElementById('home-fit-panel') ||
                root.querySelector('.fitband__form');
    if (panel) V.fit.bindForm(panel, 'home', function () {
      renderForYou();
      renderWeights();
    });
  }

  /* ------------------------------------------------ shop by the cloth */
  /* Weight is how denim is actually chosen and almost nobody merchandises by
     it. Three routes, each saying what that cloth is for rather than just
     what it weighs. */
  function renderWeights() {
    var host = document.getElementById('weights');
    if (!host) return;
    /* the same three bands the collection page filters on — defined once, in
       data.js, so "mid-weight" cannot mean one thing here and another there */
    host.innerHTML = V.clothWeights.map(function (w) {
      var items = V.products.filter(w.test);
      var mine = V.fit.has()
        ? items.filter(function (p) { return V.fit.canSize(p) && V.fit.fitsProfile(p); }).length
        : null;
      return '<a class="weightcard" href="shop.html?w=' + w.id + '">' +
        '<span class="weightcard__range num">' + esc(w.range) + '</span>' +
        '<h3 class="weightcard__name">' + esc(w.name) + '</h3>' +
        '<p class="weightcard__copy">' + esc(w.copy) + '</p>' +
        '<span class="weightcard__n num">' + items.length + (items.length === 1 ? ' piece' : ' pieces') +
          (mine ? ' · ' + mine + ' in your size' : '') + '</span>' +
      '</a>';
    }).join('');
    V.stagger(host.querySelectorAll('.weightcard'));
  }

  /* ------------------------------------------------------- the mills */
  /* The house claims a short list of mills and full traceability. This is that claim
     written as a record instead of a sentence: who, where, since when, and
     how much of this season came off their looms. */
  function renderMills() {
    var host = document.getElementById('mills');
    if (!host) return;
    var mills = V.mills();

    host.innerHTML = mills.map(function (m) {
      return '<div class="mill">' +
        '<p class="mill__since num">' + m.since + '</p>' +
        '<h3 class="mill__name">' + esc(m.name) + '</h3>' +
        '<p class="mill__where">' + esc(m.city) + ', ' + esc(m.country) + '</p>' +
        '<p class="mill__n num">' + m.n + (m.n === 1 ? ' piece' : ' pieces') + ' this season</p>' +
      '</div>';
    }).join('');

    var lead = document.getElementById('mills-lead');
    if (lead) {
      lead.textContent = mills.length + ' mills, ' + V.products.length +
        ' pieces, and every metre traceable to the bolt it was woven in.';
    }
    V.stagger(host.querySelectorAll('.mill'));
  }

  /* ------------------------------------------------- checkable claims */
  /* The house values are only worth printing if they can be checked, so the
     figures under them are counted off the catalogue rather than written by
     hand — they cannot fall out of date. */
  function renderFacts() {
    var hours = V.products.map(function (p) { return p.prov ? p.prov.hours : 0; });
    var longest = Math.max.apply(null, hours);
    var longestPiece = V.products.filter(function (p) { return p.prov && p.prov.hours === longest; })[0];
    /* the merchandising line, not the build key, so this agrees with the
       "Atelier — made to order" filter on the collection page */
    var atelierCount = V.products.filter(function (p) { return p.tag === 'atelier'; }).length;
    var mills = V.mills();

    var facts = {
      'fact-stand': longest + ' hours on the longest piece' +
                    (longestPiece ? ' — the ' + longestPiece.name : ''),
      'fact-mills': mills.length + ' mills · ' + V.products.length + ' pieces traceable',
      'fact-numbered': V.numberWord(atelierCount, true) +
                       ' made-to-order pieces · editions of 60 or fewer',
      /* the three others are claims about the whole collection and survive
         any catalogue; this one is only about the atelier pieces */
      'fact-repairs': 'No time limit, no charge, no receipt needed'
    };
    Object.keys(facts).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = facts[id];
    });

    /* "Numbered, not mass-made" is a claim about atelier pieces, and its card
       asserts editions of sixty or fewer above the count. With none in the
       catalogue the card does not become a smaller claim, it becomes a false
       one — so the whole card goes, not just its number. It returns the
       moment a piece is tagged `atelier` in Shopify. */
    if (!atelierCount) {
      var numbered = document.getElementById('fact-numbered');
      var card = numbered && numbered.closest ? numbered.closest('.value') : null;
      if (card) card.hidden = true;
    }

    /* The names as well as the count — adding a mill to the catalogue should
       never leave this list quietly lying about who wove the season.
       (The spelled-out counts in [data-mills-word] are painted site-wide by
       app.js, so they are not repeated here.) */
    var names = document.getElementById('mill-names');
    if (names) {
      names.textContent = mills.map(function (m) { return m.name; }).join(', ') +
        '. Long relationships, whole bolts, and full traceability on every metre.';
    }
  }

  /* --------------------------------------------------- the two shelves */
  var SIGNATURES = ['sculpt-raw-jean', 'cinch-corset', 'deconstructed-trucker', 'monolith-dress'];

  function renderShelves() {
    fill('featured', V.products.filter(function (p) { return SIGNATURES.indexOf(p.id) > -1; }));
    fill('new-in', V.products.filter(function (p) { return p.tag === 'new'; }).slice(0, 4));
  }

  /* -------------------------------------------------------------- boot */
  renderTiles();
  renderShelves();
  renderForYou();
  renderWeights();
  renderMills();
  renderFacts();

  /* a profile saved on another page, or in another tab */
  document.addEventListener('vola:fit', function () { renderForYou(); renderWeights(); });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-fit-toggle]')) return;
    var panel = document.getElementById('home-fit-panel');
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      var first = panel.querySelector('input');
      if (first) first.focus();
    }
  });
})();
