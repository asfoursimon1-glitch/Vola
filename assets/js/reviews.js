/* VOLÀ — client reviews.

   The site displayed scores from 4.4 to 5.0 and review counts up to 156 with
   not one readable review anywhere. That is the largest trust gap on a $690
   pair of jeans, and it is the reason every rating on the site is now counted
   from this list rather than asserted beside it.

   The filters are borrowed from the collection page for a reason: the rail
   pattern is the right one for reading a body of reviews, and "how did it fit
   the person writing" is the single most useful facet in apparel. */
(function () {
  'use strict';

  var V = window.VOLA, esc = V.esc;

  var list = document.getElementById('review-list');
  var count = document.getElementById('count');
  var chips = document.getElementById('chips');
  var sortEl = document.getElementById('sort');
  var form = document.getElementById('filters');
  var panel = document.getElementById('filters-panel');

  var FITS = [
    { id: 'small', label: 'Ran small' },
    { id: 'true', label: 'True to size' },
    { id: 'large', label: 'Ran large' }
  ];
  var SCORES = [
    { id: '5', label: '5 stars' },
    { id: '4', label: '4 stars' },
    { id: '3', label: '3 and below' }
  ];

  var SORTS = [
    { id: 'recent', label: 'Most recent',
      fn: function (a, b) { return a.date < b.date ? 1 : -1; } },
    /* A review that never said how long it had been owned sorts last rather
       than as zero — silence is not "bought yesterday". */
    { id: 'worn', label: 'Longest owned',
      fn: function (a, b) {
        var am = a.months == null ? -1 : a.months, bm = b.months == null ? -1 : b.months;
        return bm - am || (a.date < b.date ? 1 : -1);
      } },
    { id: 'low', label: 'Lowest score first',
      fn: function (a, b) { return a.rating - b.rating || (a.date < b.date ? 1 : -1); } },
    { id: 'high', label: 'Highest score first',
      fn: function (a, b) { return b.rating - a.rating || (a.date < b.date ? 1 : -1); } }
  ];

  var state = { fits: [], sizes: [], scores: [], pieces: [], sort: 'recent' };

  /* ------------------------------------------------------------ state */
  function readURL() {
    var u = new URLSearchParams(location.search);
    state.fits   = (u.get('fit') || '').split(',').filter(Boolean);
    state.sizes  = (u.get('size') || '').split(',').filter(Boolean);
    state.scores = (u.get('score') || '').split(',').filter(Boolean);
    state.pieces = (u.get('id') || '').split(',').filter(Boolean);
    state.sort   = u.get('sort') || 'recent';
  }

  function writeURL() {
    var u = new URLSearchParams();
    if (state.fits.length)   u.set('fit', state.fits.join(','));
    if (state.sizes.length)  u.set('size', state.sizes.join(','));
    if (state.scores.length) u.set('score', state.scores.join(','));
    if (state.pieces.length) u.set('id', state.pieces.join(','));
    if (state.sort !== 'recent') u.set('sort', state.sort);
    var qs = u.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  /* --------------------------------------------------------- filtering */
  var TESTS = {
    fits:   function (r, s) { return !s.fits.length || s.fits.indexOf(r.fit) > -1; },
    sizes:  function (r, s) { return !s.sizes.length || s.sizes.indexOf(r.size) > -1; },
    pieces: function (r, s) { return !s.pieces.length || s.pieces.indexOf(r.product) > -1; },
    scores: function (r, s) {
      if (!s.scores.length) return true;
      return s.scores.some(function (id) {
        return id === '3' ? r.rating <= 3 : r.rating === parseInt(id, 10);
      });
    }
  };
  var GROUPS = ['fits', 'sizes', 'scores', 'pieces'];

  function matches(r, s, except) {
    return GROUPS.every(function (g) { return g === except || TESTS[g](r, s || state); });
  }

  /* counts that respect everything except their own group, so a facet never
     promises results a click then fails to deliver */
  function countFor(group, predicate) {
    return V.reviews.filter(function (r) {
      return matches(r, state, group) && predicate(r);
    }).length;
  }

  function sorter(id) {
    var s = SORTS.filter(function (x) { return x.id === id; })[0];
    return (s || SORTS[0]).fn;
  }

  /* ------------------------------------------------------------ totals */
  function renderTotals() {
    var host = document.getElementById('review-totals');
    if (!host) return;
    var t = V.reviewTotals();
    if (!t.count) { host.innerHTML = ''; return; }
    host.innerHTML =
      '<span class="floor"><span class="floor__label">Average</span>' +
        '<span class="floor__price num">' + t.average.toFixed(1) + ' / 5</span></span>' +
      '<span class="floor"><span class="floor__label">Reviews</span>' +
        '<span class="floor__price num">' + t.count + '</span></span>' +
      '<span class="floor"><span class="floor__label">Pieces reviewed</span>' +
        '<span class="floor__price num">' + t.products + ' of ' + V.products.length + '</span></span>';
  }

  /* ------------------------------------------------------------ the list */
  var FIT_LABEL = { small: 'Ran small', 'true': 'True to size', large: 'Ran large' };

  function stars(n) {
    /* the number is the signal; the marks are there to be scanned, and they
       carry no information the figure beside them does not */
    return '<span class="stars" role="img" aria-label="' + n + ' out of 5">' +
      '<span class="stars__on" style="width:' + (n / 5 * 100) + '%"></span></span>';
  }

  function monthsLabel(m) {
    if (m < 1) return 'New';
    if (m === 1) return 'After a month';
    if (m < 12) return 'After ' + m + ' months';
    var y = Math.floor(m / 12);
    return 'After ' + (y === 1 ? 'a year' : y + ' years') + (m % 12 ? '+' : '');
  }

  function render() {
    var rows = V.reviews.filter(function (r) { return matches(r); })
      .slice().sort(sorter(state.sort));

    count.textContent = rows.length === 0
      ? 'No reviews match these filters'
      : rows.length + (rows.length === 1 ? ' review' : ' reviews');

    if (!rows.length) {
      list.innerHTML =
        '<div class="empty">' +
          '<span class="empty__icon">' + V.icon('search') + '</span>' +
          '<p class="display display--lg">Nothing matches</p>' +
          '<p class="lede" style="font-size:1rem;max-width:44ch">No review fits that ' +
            'combination. Try removing a filter.</p>' +
          '<button class="btn btn--ghost" type="button" data-clear>Clear all filters</button>' +
        '</div>';
    } else {
      list.innerHTML = rows.map(reviewMarkup).join('');
      V.stagger(list.querySelectorAll('.review'));
    }

    renderChips();
    buildFilters();
    syncInputs();
    writeURL();
    paintSummaryCount();
  }

  /* Every line below the body is an optional answer to an optional question,
     so each one is printed only if it was given. The badge in particular:
     "Verified purchase" was hard-coded on every review when the corpus was
     written by hand, which is exactly the kind of claim this site exists not
     to make. Judge.me marks a review verified only when it matches an order,
     and that flag is what prints it now. */
  function reviewMarkup(r) {
    var p = V.byId(r.product);
    var bits = [];
    if (r.size && r.fit) {
      bits.push('<span class="review__fit' + (r.fit === 'true' ? '' : ' is-off') + '">' +
        'Size ' + esc(r.size) + ' · ' + esc(FIT_LABEL[r.fit]) + '</span>');
    } else if (r.size) {
      bits.push('<span class="review__fit">Size ' + esc(r.size) + '</span>');
    } else if (r.fit) {
      bits.push('<span class="review__fit' + (r.fit === 'true' ? '' : ' is-off') + '">' +
        esc(FIT_LABEL[r.fit]) + '</span>');
    }
    if (r.months != null) {
      bits.push('<span class="review__worn">' + esc(monthsLabel(r.months)) + '</span>');
    }

    return '<article class="review">' +
      '<div class="review__head">' +
        stars(r.rating) +
        '<span class="review__score num">' + r.rating + '</span>' +
        (p ? '<a class="review__piece" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
              esc(p.name) + '</a>' : '') +
        (r.verified
          ? '<span class="review__verified">' + V.icon('check') + 'Verified purchase</span>'
          : '') +
      '</div>' +
      (r.title ? '<h3 class="review__title">' + esc(r.title) + '</h3>' : '') +
      '<p class="review__body">' + esc(r.body) + '</p>' +
      '<p class="review__meta">' +
        '<span>' + esc(r.author) + '</span>' +
        (r.place ? '<span>' + esc(r.place) + '</span>' : '') +
        bits.join('') +
      '</p>' +
    '</article>';
  }

  /* ------------------------------------------------------------- chips */
  function renderChips() {
    var out = [];
    state.pieces.forEach(function (id) {
      var p = V.byId(id);
      out.push(chip('pieces', id, p ? p.name : id));
    });
    state.fits.forEach(function (f) {
      var o = FITS.filter(function (x) { return x.id === f; })[0];
      if (o) out.push(chip('fits', f, o.label));
    });
    state.sizes.forEach(function (s) { out.push(chip('sizes', s, 'Size ' + s)); });
    state.scores.forEach(function (s) {
      var o = SCORES.filter(function (x) { return x.id === s; })[0];
      if (o) out.push(chip('scores', s, o.label));
    });
    chips.innerHTML = out.join('');
  }

  function chip(kind, value, label) {
    return '<button class="chip" type="button" data-chip="' + kind + '" data-value="' + esc(value) + '">' +
      esc(label) + V.icon('close') + '<span class="sr-only">Remove this filter</span></button>';
  }

  /* ------------------------------------------------------- the filter rail */
  function opt(group, value, label, n) {
    var id = 'r-' + group + '-' + String(value).replace(/\W+/g, '-');
    return '<label class="filter-opt' + (n === 0 ? ' is-empty' : '') + '" for="' + id + '">' +
      '<input type="checkbox" id="' + id + '" data-group="' + group + '" value="' + esc(value) + '"' +
        (n === 0 && state[group].indexOf(value) === -1 ? ' disabled' : '') + '>' +
      '<span>' + esc(label) + '</span>' +
      '<span class="filter-opt__count num" aria-hidden="true">' + n + '</span>' +
      '<span class="sr-only">, ' + n + (n === 1 ? ' review' : ' reviews') + '</span>' +
    '</label>';
  }

  /* sizes come off the reviews themselves, in the order the house cuts them,
     so the rail can never offer a size nobody has reviewed */
  function reviewedSizes() {
    var order = V.sizeSets.apparel.concat(V.sizeSets.waist, V.sizeSets.foot, V.sizeSets.one);
    var seen = {};
    V.reviews.forEach(function (r) { if (r.size) seen[r.size] = 1; });
    return Object.keys(seen).sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }

  /* A facet nobody has answered is not a filter, it is three dead rows. The
     fit verdict and the size are optional questions on the review form, so a
     shop that has not configured them — or has, but nobody has answered yet —
     gets a shorter rail rather than a broken one. */
  function showGroup(host, has) {
    var fs = host.closest('fieldset');
    if (fs) fs.hidden = !has;
    return has;
  }

  function buildFilters() {
    var fitHost = document.getElementById('fit-filters');
    var anyFit = V.reviews.some(function (r) { return !!r.fit; });
    if (showGroup(fitHost, anyFit)) {
      fitHost.innerHTML = FITS.map(function (f) {
        return opt('fits', f.id, f.label,
          countFor('fits', function (r) { return r.fit === f.id; }));
      }).join('');
    } else fitHost.innerHTML = '';

    var sizeHost = document.getElementById('size-filters');
    var sizes = reviewedSizes();
    if (showGroup(sizeHost, sizes.length)) {
      sizeHost.innerHTML = sizes.map(function (s) {
        return opt('sizes', s, 'Size ' + s,
          countFor('sizes', function (r) { return r.size === s; }));
      }).join('');
    } else sizeHost.innerHTML = '';

    document.getElementById('score-filters').innerHTML = SCORES.map(function (s) {
      return opt('scores', s.id, s.label, countFor('scores', function (r) {
        return s.id === '3' ? r.rating <= 3 : r.rating === parseInt(s.id, 10);
      }));
    }).join('');

    /* only pieces that have been reviewed — an empty row per unreviewed
       product would be nineteen dead options */
    var reviewed = V.products.filter(function (p) { return V.reviewsFor(p.id).length; });
    document.getElementById('piece-filters').innerHTML = reviewed.map(function (p) {
      return opt('pieces', p.id, p.name,
        countFor('pieces', function (r) { return r.product === p.id; }));
    }).join('');
  }

  function syncInputs() {
    Array.prototype.forEach.call(form.querySelectorAll('input[type=checkbox][data-group]'), function (cb) {
      cb.checked = state[cb.getAttribute('data-group')].indexOf(cb.value) > -1;
    });
    sortEl.value = state.sort;
  }

  function buildSorts() {
    /* "Longest owned" only exists if reviewers were asked how long they had
       owned the piece — see judgemeConfig.questions in shopify-config.js. */
    var anyWorn = V.reviews.some(function (r) { return r.months != null; });
    sortEl.innerHTML = SORTS.filter(function (s) { return s.id !== 'worn' || anyWorn; })
      .map(function (s) {
        return '<option value="' + s.id + '">' + esc(s.label) + '</option>';
      }).join('');
    if (!anyWorn && state.sort === 'worn') state.sort = 'recent';
  }

  /* ------------------------------------------------------------ events */
  form.addEventListener('change', function (e) {
    var cb = e.target.closest('input[type=checkbox][data-group]');
    if (!cb) return;
    var g = cb.getAttribute('data-group');
    var i = state[g].indexOf(cb.value);
    if (cb.checked && i === -1) state[g].push(cb.value);
    if (!cb.checked && i > -1) state[g].splice(i, 1);
    render();
    var again = document.getElementById(cb.id);
    if (again) again.focus();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  sortEl.addEventListener('change', function () { state.sort = sortEl.value; render(); });

  chips.addEventListener('click', function (e) {
    var c = e.target.closest('[data-chip]');
    if (!c) return;
    var kind = c.getAttribute('data-chip');
    var i = state[kind].indexOf(c.getAttribute('data-value'));
    if (i > -1) state[kind].splice(i, 1);
    render();
    (chips.querySelector('.chip') || sortEl).focus();
  });

  function clearAll() {
    state.fits = []; state.sizes = []; state.scores = []; state.pieces = [];
    render();
  }
  document.getElementById('clear-all').addEventListener('click', clearAll);
  list.addEventListener('click', function (e) {
    if (e.target.closest('[data-clear]')) clearAll();
  });

  /* one sidebar at >=1024px, a collapsed disclosure below — same rule the
     collection page uses, for the same reason */
  var wide = window.matchMedia('(min-width: 1024px)');
  function syncPanel(e) {
    if (e.matches) panel.open = true;
    else if (!panel.dataset.touched) panel.open = false;
  }
  panel.addEventListener('toggle', function () { if (!wide.matches) panel.dataset.touched = '1'; });
  if (wide.addEventListener) wide.addEventListener('change', syncPanel);
  else wide.addListener(syncPanel);
  syncPanel(wide);

  function paintSummaryCount() {
    var n = state.fits.length + state.sizes.length + state.scores.length + state.pieces.length;
    var s = panel.querySelector('summary');
    s.firstChild.nodeValue = n ? 'Filter (' + n + ')' : 'Filter';
  }

  /* ----------------------------------------------------- nothing to show */
  /* Two different emptinesses, and conflating them would be a lie in one
     direction or the other. "Nothing matches" means the filters are too
     narrow. This means the shop has no published reviews at all — a new shop,
     or a review sync that has not run. It says so plainly instead of showing
     a filter rail with four empty facets and a count of zero. */
  function renderEmptyCorpus() {
    panel.hidden = true;
    /* the rail is one column of a two-column grid — hiding it without
       collapsing the track would leave the page indented against nothing */
    var layout = document.querySelector('.shop-layout');
    if (layout) layout.style.gridTemplateColumns = '1fr';
    count.textContent = 'No reviews yet';
    var bar = document.querySelector('.shop-bar');
    if (bar) bar.hidden = true;
    chips.innerHTML = '';
    list.innerHTML =
      '<div class="empty">' +
        '<span class="empty__icon">' + V.icon('scissors') + '</span>' +
        '<p class="display display--lg">No reviews yet</p>' +
        '<p class="lede" style="font-size:1rem;max-width:48ch">Nobody has written about ' +
          'the collection yet. When they do, every review appears here in full — ' +
          'the scores, the fit verdicts and the ones we would rather not print.</p>' +
        '<a class="btn btn--ghost" href="shop.html">See the collection</a>' +
      '</div>';
  }

  /* boot ---------------------------------------------------------------- */
  renderTotals();
  if (!V.reviews.length) {
    renderEmptyCorpus();
  } else {
    readURL();
    buildSorts();
    render();
  }
})();
