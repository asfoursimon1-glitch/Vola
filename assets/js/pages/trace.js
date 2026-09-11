/* VOLÀ — traceability.

   The house already published more checkable data than almost any denim
   maison — five mills with founding dates, atelier hours per piece, a full
   cost breakdown, made-to-order production — and it was scattered across
   three pages, never adding up to a claim.

   Everything on this page is counted from the same catalogue the shop runs
   on. That is the point: an error here would be an error in the shop, which
   is what makes the figures worth reading. The only hand-written section is
   the last one, and it is the one that says what we cannot count. */
(function () {
  'use strict';

  var V = window.VOLA, esc = V.esc;

  var mills = V.mills();

  /* ------------------------------------------------------------ totals */
  function renderTotals() {
    var host = document.getElementById('trace-totals');
    if (!host) return;

    var hours = V.products.reduce(function (n, p) {
      return n + ((p.prov && p.prov.hours) || 0);
    }, 0);
    var traceable = V.products.filter(function (p) { return p.prov && p.prov.mill; }).length;

    function cell(label, value) {
      return '<span class="floor"><span class="floor__label">' + esc(label) + '</span>' +
        '<span class="floor__price num">' + esc(value) + '</span></span>';
    }

    host.innerHTML =
      cell('Mills', String(mills.length)) +
      cell('Pieces traceable to a loom', traceable + ' of ' + V.products.length) +
      cell('Hours of hand work', String(hours)) +
      cell('Oldest mill', String(mills[0] ? mills[0].since : '—'));
  }

  /* ------------------------------------------------------- the mill record */
  /* The atelier page shows the mills as cards with written prose. This is the
     same five as a record: everything we hold about them, in one table, with
     nothing written by hand. */
  function renderMills() {
    var host = document.getElementById('mill-table');
    if (!host) return;

    var year = new Date().getFullYear();

    var rows = mills.map(function (m) {
      var weights = m.weights.length
        ? (m.weights.length === 1
            ? m.weights[0] + 'oz'
            : m.weights[0] + '–' + m.weights[m.weights.length - 1] + 'oz')
        : '—';
      /* naming the pieces is the part that makes the row checkable: you can
         click through and read the same mill on the product page */
      var pieces = m.pieces.map(function (p) {
        return '<a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a>';
      }).join(', ');

      return '<tr>' +
        '<th scope="row">' + esc(m.name) +
          '<span class="mill__where">' + esc(m.city) + ', ' + esc(m.country) + '</span></th>' +
        '<td>' + m.since + '<span class="mill__age">' + (year - m.since) + ' years</span></td>' +
        '<td>' + esc(weights) + '</td>' +
        '<td>' + m.hours + '</td>' +
        '<td class="mill__pieces">' + m.n + '<span>' + pieces + '</span></td>' +
      '</tr>';
    }).join('');

    host.innerHTML =
      '<table class="sizetable milltable">' +
        '<caption class="sr-only">Every mill VOLÀ buys from, with its founding year, the ' +
          'cloth weights it supplies, the hours of atelier work on the pieces it wove, and ' +
          'which pieces those are.</caption>' +
        '<thead><tr>' +
          '<th scope="col">Mill</th>' +
          '<th scope="col">Weaving since</th>' +
          '<th scope="col">Weights supplied</th>' +
          '<th scope="col">Atelier hours</th>' +
          '<th scope="col">Pieces this season</th>' +
        '</tr></thead>' +
        '<tbody class="num">' + rows + '</tbody>' +
      '</table>';
  }

  /* ------------------------------------------------- what a price is made of */
  /* The four construction profiles the per-product breakdowns come from. Shown
     as shares rather than dollars, because a share is the thing that is
     actually the same across every piece built that way. */
  function renderCosts() {
    var host = document.getElementById('cost-profiles');
    if (!host) return;

    host.innerHTML = V.costProfiles.map(function (profile) {
      var max = profile.rows.reduce(function (m, r) { return Math.max(m, r.share); }, 0);
      return '<article class="costcard" data-reveal>' +
        '<h3 class="costcard__name">' + esc(profile.label) + '</h3>' +
        '<p class="costcard__n num">' +
          esc(profile.categories.map(V.catLabel).join(' · ')) +
          ' — ' + profile.pieces + (profile.pieces === 1 ? ' piece' : ' pieces') + '</p>' +
        '<ul class="costcard__rows">' +
          profile.rows.map(function (r, i) {
            var pct = Math.round(r.share * 100);
            var isMargin = i === profile.rows.length - 1;
            return '<li class="costcard__row' + (isMargin ? ' is-margin' : '') + '">' +
              '<span class="costcard__label">' + esc(r.label) + '</span>' +
              '<span class="costcard__bar" aria-hidden="true">' +
                '<i style="width:' + (r.share / max * 100).toFixed(1) + '%"></i></span>' +
              '<span class="costcard__pct num">' + pct + '%</span>' +
            '</li>';
          }).join('') +
        '</ul>' +
      '</article>';
    }).join('');

    V.stagger(host.querySelectorAll('.costcard'));
  }

  /* --------------------------------------------------------- made to order */
  function renderWaste() {
    var host = document.getElementById('waste-list');
    if (!host) return;

    var made = V.products.filter(function (p) { return p.tag === 'atelier'; });
    var total = V.products.length;
    var editions = made.filter(function (p) { return p.prov && p.prov.edition; }).length;
    var longest = V.products.reduce(function (a, p) {
      return (p.prov && p.prov.hours || 0) > (a.prov && a.prov.hours || 0) ? p : a;
    });

    /* This section is the maison's waste claim, and it is the one place on the
       site where a zero is actively damaging: "0 of 6 pieces are cut only when
       ordered" reads as a sustainability promise the catalogue disproves,
       which is worse than saying nothing. So the cut-to-order card is dropped
       when there is nothing to count, and the editions sentence with it —
       rather than printing a nought under a heading about not being wasteful.
       Both come back when a piece is tagged `atelier` in Shopify. */
    var items = [];

    if (made.length) {
      items.push({ icon: 'scissors',
        title: made.length + ' of ' + total + ' pieces are cut only when ordered',
        body: 'Nothing is held in stock for them and nothing is cut speculatively. The cloth ' +
              'stays on the bolt until somebody has actually asked for the piece — which is ' +
              'the only waste reduction we can claim without measuring anything.' });
    }

    items.push(
      { icon: 'box', title: 'We buy the bolt, so we run out',
        body: 'When a cloth is gone the piece is retired rather than re-sourced in something ' +
              'approximate. ' +
              (editions ? editions + ' of the made-to-order pieces are numbered editions. ' : '') +
              'Running out is the cost of being able to name the loom.' },
      { icon: 'leaf', title: 'Repaired free, for as long as you own it',
        body: 'The most environmentally useful thing about a garment is how long it stays out ' +
              'of a bin. ' + longest.name + ' carries ' + (longest.prov ? longest.prov.hours : 0) +
              ' hours of hand work; throwing that away over a blown seam would be the waste, ' +
              'not the cloth.' }
    );

    host.innerHTML = items.map(function (it, i) {
      return '<div class="value" data-reveal style="--reveal-delay:' + (i * 60) + 'ms">' +
        '<span class="value__icon">' + V.icon(it.icon) + '</span>' +
        '<h3>' + esc(it.title) + '</h3>' +
        '<p>' + esc(it.body) + '</p>' +
      '</div>';
    }).join('');
    V.stagger(host.querySelectorAll('.value'));
  }

  renderTotals();
  renderMills();
  renderCosts();
  renderWaste();
})();
