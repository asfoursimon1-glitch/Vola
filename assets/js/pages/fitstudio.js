/* VOLÀ — the fit studio.

   Size and fit is the largest unsolved problem in apparel retail, and this
   house holds more of the answer than it was showing: a saved profile, a
   size chart the catalogue keeps honest, and true-to-size data on every one
   of the nineteen pieces that was only ever visible one product at a time.

   This page is the destination for all of it. The size guide moved here from
   the atelier page rather than being copied — a chart in two places is a
   chart that will disagree with itself. */
(function () {
  'use strict';

  var V = window.VOLA, esc = V.esc;

  /* ═══════════════════════════════════════════════ the profile */

  var profileHost = document.getElementById('studio-profile');

  function renderProfile() {
    if (!profileHost) return;
    /* while the form is open it owns itself; repainting would throw away
       half-typed measurements */
    var open = document.getElementById('studio-fit-panel');
    if (open && !open.hidden) return;

    var apparel = V.fit.baseSize('apparel');
    var denim = V.fit.baseSize('waist');
    var foot = V.fit.baseSize('foot');
    var line = V.fit.summaryLine();

    if (!V.fit.has() || !line) {
      profileHost.innerHTML =
        '<div class="studio studio--empty">' +
          '<div class="studio__copy">' +
            '<p class="eyebrow">Start here</p>' +
            '<h2 class="display display--lg">Tell us four things</h2>' +
            '<p class="lede" style="font-size:1rem">Height, weight, waist and shoe size. ' +
              'Nothing else, no account, and it never leaves this browser — it is kept in ' +
              'local storage on this device alone.</p>' +
            '<ul class="studio__gains">' +
              '<li>Your size is pre-selected on every product page, with the reason stated</li>' +
              '<li>The collection can be filtered to what actually comes in your size</li>' +
              '<li>The bag tells you if a size in it is not the one you usually take</li>' +
            '</ul>' +
          '</div>' +
          '<div class="studio__form">' + V.fit.formMarkup('studio') + '</div>' +
        '</div>';
    } else {
      /* how much of the collection this profile can actually buy — the
         single most useful number to hand someone who has just saved one */
      var sized = V.products.filter(function (p) { return V.fit.canSize(p); });
      var fits = sized.filter(function (p) { return V.fit.fitsProfile(p); });

      profileHost.innerHTML =
        '<div class="studio">' +
          '<div class="studio__copy">' +
            '<p class="eyebrow">Your profile</p>' +
            '<h2 class="display display--lg">Saved on this device</h2>' +
            '<dl class="studio__sizes">' +
              sizeCell('Apparel', apparel) +
              sizeCell('Denim waist', denim) +
              sizeCell('Shoes', foot) +
            '</dl>' +
            '<p class="lede" style="font-size:1rem">' +
              (sized.length
                ? '<strong>' + fits.length + ' of the ' + sized.length + ' sized pieces</strong> ' +
                  'in the collection come in your size right now.'
                : '') +
            '</p>' +
            '<div class="studio__actions">' +
              '<a class="btn btn--primary" href="shop.html?fit=1">Shop everything in your size</a>' +
              '<button class="btn btn--ghost" type="button" data-fit-toggle>Change my measurements</button>' +
            '</div>' +
          '</div>' +
          '<div class="studio__form">' +
            '<div class="fitpanel" id="studio-fit-panel" hidden>' + V.fit.formMarkup('studio') + '</div>' +
          '</div>' +
        '</div>';
    }

    var panel = document.getElementById('studio-fit-panel');
    if (panel) {
      V.fit.bindForm(panel, 'studio', function () {
        panel.hidden = true;
        repaint();
      });
    } else {
      /* the empty state shows the form inline rather than behind a toggle */
      var inline = profileHost.querySelector('.fitform');
      if (inline) V.fit.bindForm(inline.parentNode, 'studio', repaint);
    }
  }

  function sizeCell(label, value) {
    return '<div class="studio__size' + (value ? '' : ' is-unset') + '">' +
      '<dt>' + label + '</dt>' +
      '<dd class="num">' + (value ? esc(value) : 'Not set') + '</dd>' +
    '</div>';
  }

  /* ═══════════════════════════════════════════ the size chart */
  /* Moved here from the atelier page. The chart proposes; the catalogue
     decides — the denim column is filtered against the sizes actually cut,
     and the availability column is counted, not typed. */

  var tableHost = document.getElementById('size-table');

  function availableIn(apparelSize, denimSizes) {
    return V.products.filter(function (p) {
      if (p.sizeSystem === 'one' || p.sizeSystem === 'foot') return false;
      var wanted = p.sizeSystem === 'waist' ? denimSizes : [apparelSize];
      return wanted.some(function (s) {
        return p.sizes.indexOf(s) > -1 && p.soldOut.indexOf(s) === -1;
      });
    }).length;
  }

  function sizedPieceCount() {
    return V.products.filter(function (p) {
      return p.sizeSystem === 'apparel' || p.sizeSystem === 'waist';
    }).length;
  }

  function realDenim(row) {
    var cut = V.sizeSets.waist;
    return row.denim.filter(function (s) { return cut.indexOf(s) > -1; });
  }

  function range(pair) { return pair[0] + ' – ' + pair[1]; }

  function renderChart() {
    if (!tableHost) return;
    var mine = V.fit.baseSize('apparel');
    var total = sizedPieceCount();

    var rows = V.sizeChart.map(function (r) {
      var denim = realDenim(r);
      var n = availableIn(r.size, denim);
      var isMine = mine === r.size;
      return '<tr' + (isMine ? ' class="sizetable__row--mine"' : '') + '>' +
        '<th scope="row">' + esc(r.size) +
          (isMine ? '<span class="sizetable__you">You</span>' : '') + '</th>' +
        '<td>' + range(r.waist) + '</td>' +
        '<td>' + range(r.hip) + '</td>' +
        '<td>' + range(r.bust) + '</td>' +
        '<td>' + (denim.length ? denim.join(' – ') : '—') + '</td>' +
        '<td class="sizetable__stock' + (n === 0 ? ' is-none' : '') + '">' +
          (n === 0 ? 'None' : n + ' of ' + total) + '</td>' +
      '</tr>';
    }).join('');

    tableHost.innerHTML =
      '<table class="sizetable">' +
        '<caption class="sr-only">VOLÀ body measurements in centimetres by size, with the ' +
          'denim waist sizes each one corresponds to and how many pieces are currently ' +
          'available in it.</caption>' +
        '<thead><tr>' +
          '<th scope="col">Size</th>' +
          '<th scope="col">Waist <span>cm</span></th>' +
          '<th scope="col">Hip <span>cm</span></th>' +
          '<th scope="col">Bust <span>cm</span></th>' +
          '<th scope="col">Denim waist</th>' +
          '<th scope="col">Available now</th>' +
        '</tr></thead>' +
        '<tbody class="num">' + rows + '</tbody>' +
      '</table>';
  }

  /* ═════════════════════════════════════════ how every cut runs */
  /* The true-to-size figure has always existed on every product and was only
     ever readable one product at a time. Together it is a buying guide. */

  var runsHost = document.getElementById('runs-table');

  var ADVICE = {
    up:     { label: 'Size up',       cls: 'is-up' },
    down:   { label: 'Size down',     cls: 'is-down' },
    'true': { label: 'Take your size', cls: '' }
  };

  var SYSTEM_LABEL = { apparel: 'XS – XL', waist: 'Waist', foot: 'EU' };

  function renderRuns() {
    if (!runsHost) return;
    var mine = V.fit.has();

    /* Ordered by how likely the piece is to surprise you: the lowest
       true-to-size scores first, because those are the ones worth reading.
       Pieces nobody has reviewed yet sort to the bottom rather than to zero —
       no feedback is not the same as bad feedback. */
    var list = V.products
      .filter(function (p) { return p.sizeSystem !== 'one'; })
      .slice()
      .sort(function (a, b) {
        var sa = V.reviewStats(a.id), sb = V.reviewStats(b.id);
        if (sa.tts == null && sb.tts == null) return a.name.localeCompare(b.name);
        if (sa.tts == null) return 1;
        if (sb.tts == null) return -1;
        return sa.tts - sb.tts;
      });

    var rows = list.map(function (p) {
      var st = V.reviewStats(p.id);
      var a = ADVICE[p.fit.advice] || ADVICE['true'];
      var tts = st.tts == null ? null : Math.round(st.tts * 100);
      var rec = mine && V.fit.canSize(p) ? V.fit.recommend(p) : null;
      var yours = rec && rec.exact
        ? '<span class="runs__yours">' + esc(rec.size) + '</span>'
        : rec ? '<span class="runs__yours is-out">' + esc(rec.size) + '</span>'
        : '<span class="runs__yours is-none">—</span>';

      return '<tr>' +
        '<th scope="row"><a href="product.html?id=' + encodeURIComponent(p.id) + '">' +
          esc(p.name) + '</a>' +
          '<span class="runs__cut">' + esc(p.fit.cut || '') + '</span></th>' +
        '<td>' + esc(SYSTEM_LABEL[p.sizeSystem] || '') + '</td>' +
        '<td class="runs__tts">' +
          /* No reviews and no fit answers are different absences: a piece can
             be well reviewed by people who never said how it fitted. */
          (tts == null
            ? '<span class="runs__yours is-none">' +
                (st.count ? 'No fit feedback yet' : 'No reviews yet') + '</span>'
            : '<span class="runs__bar" aria-hidden="true"><i style="width:' + tts + '%"></i></span>' +
              '<span class="num">' + tts + '%</span>' +
              '<span class="runs__n num">of ' + st.fitCount + '</span>') + '</td>' +
        '<td><span class="runs__advice ' + a.cls + '">' + a.label + '</span></td>' +
        '<td>' + yours + '</td>' +
      '</tr>';
    }).join('');

    runsHost.innerHTML =
      '<table class="sizetable runs">' +
        '<caption class="sr-only">Every sized piece in the collection, with the share of ' +
          'clients who found it true to size, our sizing advice, and the size we suggest for ' +
          'your saved profile.</caption>' +
        '<thead><tr>' +
          '<th scope="col">Piece</th>' +
          '<th scope="col">Sizes</th>' +
          '<th scope="col">True to size</th>' +
          '<th scope="col">Advice</th>' +
          '<th scope="col">' + (mine ? 'Yours' : 'Your size') + '</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
      (mine ? '' :
        '<p class="field__hint" style="text-transform:none;letter-spacing:0;margin-top:var(--space-3)">' +
        'Save your measurements above and this last column fills in.</p>');
  }

  /* ═══════════════════════════════════════════════ raw denim */
  /* The three pieces that genuinely move. Everything else is washed and
     settled before it reaches anyone, and saying so is what makes the
     warning on these three worth reading. */

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
        '<span class="value__icon">' + V.icon('ruler') + '</span>' +
        '<h3><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a></h3>' +
        '<p>' + esc(p.denim.note) + '</p>' +
        '<p class="value__fact num">' + p.denim.oz + 'oz · ' +
          (band ? esc(band.name.toLowerCase()) : '') + ' · unwashed</p>' +
      '</div>';
    }).join('');
    V.stagger(host.querySelectorAll('.value'));
  }

  /* ═══════════════════════════════════════════════════ boot */

  function repaint() {
    renderProfile();
    renderChart();
    renderRuns();
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-fit-toggle]')) return;
    var panel = document.getElementById('studio-fit-panel');
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      var first = panel.querySelector('input');
      if (first) first.focus();
    }
  });

  /* a profile saved on another page, or in another tab */
  document.addEventListener('vola:fit', repaint);

  repaint();
  renderRaw();
})();
