/* VOLÀ — care and repairs.

   "Repairs for life, no time limit, no charge" is a serious commercial
   commitment that was sitting as one card among three near the bottom of the
   atelier page. It does two jobs: before purchase it justifies the price,
   and after purchase it is the strongest reason for anyone to come back.

   The care rules come from VOLA.careGroups, which are predicates over the
   catalogue rather than a hand-written list — so each rule names the pieces
   it actually applies to, and a rule with nothing behind it is not printed. */
(function () {
  'use strict';

  var V = window.VOLA, esc = V.esc;

  /* ------------------------------------------------------------- totals */
  function renderTotals() {
    var host = document.getElementById('care-totals');
    if (!host) return;

    var hours = V.products.reduce(function (n, p) {
      return n + ((p.prov && p.prov.hours) || 0);
    }, 0);

    function cell(label, value) {
      return '<span class="floor"><span class="floor__label">' + esc(label) + '</span>' +
        '<span class="floor__price num">' + esc(value) + '</span></span>';
    }

    host.innerHTML =
      cell('Pieces covered', 'All ' + V.products.length) +
      cell('Time limit', 'None') +
      cell('Cost to you', 'Postage, one way') +
      cell('Hand work protected', hours + ' hours');
  }

  /* --------------------------------------------------------- the process */
  /* Written as a sequence with the party responsible named at each step,
     because "who does what and who pays" is the whole question. */
  var STEPS = [
    { who: 'You', title: 'Tell us what happened',
      body: 'A photograph and a sentence. No order number needed — if we made it, we can identify it.' },
    { who: 'Us', title: 'We say what we can do',
      body: 'Within one working day: what we would repair, how, and roughly how long it will take. If it is beyond mending we will say that too.' },
    { who: 'You', title: 'Send it to Florence',
      body: 'You cover postage one way. Any carrier, no special packaging, and no need to insure it beyond what you are comfortable with.' },
    { who: 'Us', title: 'We mend it and send it back',
      body: 'Free, on our postage, by the same hands that made it. Numbered pieces are recorded against their original maker.' }
  ];

  function renderSteps() {
    var host = document.getElementById('repair-steps');
    if (!host) return;
    host.innerHTML = STEPS.map(function (s) {
      return '<li class="step">' +
        '<p class="step__week">' + esc(s.who) + '</p>' +
        '<h3 class="step__title">' + esc(s.title) + '</h3>' +
        '<p class="step__body">' + esc(s.body) + '</p>' +
      '</li>';
    }).join('');
    V.stagger(host.querySelectorAll('.step'));
  }

  /* ------------------------------------------------------------ coverage */
  function renderCoverage() {
    var yes = document.getElementById('covered');
    var no = document.getElementById('not-covered');
    if (!yes || !no) return;

    var covered = [
      'Blown and split seams, anywhere on the piece',
      'Worn crotches and inner thighs on denim',
      'Replaced buttons, rivets, eyelets and buckles',
      'Re-tipped and rebuilt heels',
      'Re-set boning and re-laced corsetry',
      'Zip and hardware replacement',
      'Rehemming after an alteration elsewhere'
    ];
    var not = [
      'Damage from a repair someone else attempted first',
      'Loss, theft, or anything we cannot physically get back',
      'Fading, patina and creasing — those are the cloth working',
      'Deliberate alteration to a different size or shape (that is a commission)'
    ];

    yes.innerHTML = covered.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    no.innerHTML = not.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
  }

  /* ------------------------------------------------------------ raw denim */
  function renderRaw() {
    var host = document.getElementById('raw-list');
    if (!host) return;
    var raw = V.products.filter(function (p) { return p.denim && p.denim.fade === 'high'; });

    if (!raw.length) {
      host.innerHTML = '<p class="lede" style="font-size:1rem">Nothing in the collection is ' +
        'currently sold raw — every piece is washed and settled before it reaches you.</p>';
      return;
    }

    host.innerHTML = raw.map(function (p, i) {
      var band = V.weightBand(p);
      return '<div class="value" data-reveal style="--reveal-delay:' + (i * 60) + 'ms">' +
        '<span class="value__icon">' + V.icon('leaf') + '</span>' +
        '<h3><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a></h3>' +
        '<p>' + esc(p.denim.note) + '</p>' +
        /* the piece's own care lines, which are the specific instance of the
           general raw regimen below */
        '<ul class="value__care">' + p.care.map(function (c) {
          return '<li>' + esc(c) + '</li>';
        }).join('') + '</ul>' +
        '<p class="value__fact num">' + p.denim.oz + 'oz · ' +
          (band ? esc(band.name.toLowerCase()) : '') + ' · unwashed</p>' +
      '</div>';
    }).join('');
    V.stagger(host.querySelectorAll('.value'));
  }

  /* -------------------------------------------------------- care by cloth */
  function renderGroups() {
    var host = document.getElementById('care-groups');
    if (!host) return;

    host.innerHTML = V.careGroups.map(function (g, i) {
      var pieces = g.pieces.map(function (p) {
        return '<a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a>';
      }).join(', ');

      return '<article class="carerule" data-reveal style="--reveal-delay:' +
          (Math.min(i, 6) * 50) + 'ms">' +
        '<div class="carerule__head">' +
          '<h3 class="carerule__name">' + esc(g.label) + '</h3>' +
          '<span class="carerule__n num">' + g.pieces.length +
            (g.pieces.length === 1 ? ' piece' : ' pieces') + '</span>' +
        '</div>' +
        '<p class="carerule__rule">' + esc(g.rule) + '</p>' +
        '<p class="carerule__detail">' + esc(g.detail) + '</p>' +
        '<p class="carerule__pieces">' + pieces + '</p>' +
      '</article>';
    }).join('');
    V.stagger(host.querySelectorAll('.carerule'));
  }

  renderTotals();
  renderSteps();
  renderCoverage();
  renderRaw();
  renderGroups();
})();
