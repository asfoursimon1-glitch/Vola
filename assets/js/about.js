/* VOLÀ — the atelier page.

   Two blocks here are written and two are counted. The mill prose and the
   sizing notes are brand copy and stay in the HTML; the founding dates, the
   piece counts and the size chart are derived from the catalogue, because a
   house that sells traceability and fit should be able to count both. */
(function () {
  'use strict';

  var V = window.VOLA;
  var esc = V.esc;

  /* ------------------------------------------------------------- the mills */
  (function mills() {
    var cards = document.querySelectorAll('[data-mill]');
    if (!cards.length) return;

    var byName = {};
    V.mills().forEach(function (m) { byName[m.name] = m; });

    Array.prototype.forEach.call(cards, function (card) {
      var m = byName[card.getAttribute('data-mill')];
      /* A card naming a mill the catalogue no longer buys from is worse than
         no card: leave it visibly unclaimed rather than printing "0 pieces". */
      if (!m) return;
      var line = document.createElement('p');
      line.className = 'value__fact num';
      line.textContent = 'Since ' + m.since + ' · ' + m.n +
        (m.n === 1 ? ' piece' : ' pieces') + ' this season';
      card.appendChild(line);
    });
  })();

  /* --------------------------------------------------- client services */
  /* Repairs for life, free shipping over a threshold, wash it rarely — three
     promises anyone can print. The line under each one says how much of this
     collection it actually touches, counted now rather than asserted once. */
  (function services() {
    var cards = document.querySelectorAll('[data-service]');
    if (!cards.length) return;

    var t = V.terms;
    var total = V.products.length;
    var atelier = V.products.filter(function (p) { return p.tag === 'atelier'; });
    /* the pieces that genuinely want six months before a first wash: raw,
       unwashed cloth that has all its indigo still to lose */
    var raw = V.products.filter(function (p) { return p.denim && p.denim.fade === 'high'; });
    var cheapest = V.products.reduce(function (m, p) { return Math.min(m, p.price); }, Infinity);

    var LINES = {
      repairs: 'All ' + total + ' pieces · no time limit',
      shipping: 'Free over ' + V.money(t.freeShipOver) + ' · ' + V.money(t.flatShipping) +
                ' below · ' + t.returnsDays + ' days to return',
      washing: raw.length + ' raw ' + (raw.length === 1 ? 'piece' : 'pieces') +
               ' this season · six months before the first wash'
    };

    Array.prototype.forEach.call(cards, function (card) {
      var text = LINES[card.getAttribute('data-service')];
      if (!text) return;
      var line = document.createElement('p');
      line.className = 'value__fact num';
      line.textContent = text;
      /* the headline figure sits above any written qualification of it;
         insertBefore(…, null) appends, so cards without a note still work */
      card.insertBefore(line, card.querySelector('.value__note'));
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-atelier-count]'), function (el) {
      el.textContent = V.numberWord(atelier.length);
    });

    /* Every piece in the collection clears the shipping threshold on its own,
       or it does not — worth saying which, because "free over $500" reads very
       differently when the cheapest thing in the shop is $260.
       (Named ship-coverage, not ship-note: the bag page already uses that id
       for the how-far-from-free-shipping line, and one id meaning two
       different things across the site is a trap for whoever reads it next.) */
    var note = document.getElementById('ship-coverage');
    if (note) {
      var under = V.products.filter(function (p) { return p.price < t.freeShipOver; }).length;
      note.textContent = under === 0
        ? 'Every piece in the collection ships free on its own.'
        : under + ' of the ' + total + ' pieces sit below the threshold on their own — ' +
          'the least expensive is ' + V.money(cheapest) + '.';
    }
  })();
})();
