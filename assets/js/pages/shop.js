/* VOLÀ — collection page: filtering, sorting, search, URL state.

   The filter rail is where the work happens on a collection page, so it gets
   the detail: facets for the things people actually choose between (colour,
   cloth weight, size), counts that recompute against the current selection
   rather than the whole catalogue, and a "my size" switch driven by the saved
   fit profile. Counts that ignore the other filters are worse than no counts
   at all — they promise results that a click then fails to deliver. */
(function () {
  'use strict';

  var V = window.VOLA;
  var esc = V.esc;

  var grid   = document.getElementById('grid');
  var count  = document.getElementById('count');
  var chips  = document.getElementById('chips');
  var sortEl = document.getElementById('sort');
  var qEl    = document.getElementById('q');
  var form   = document.getElementById('filters');

  /* Bands, lines and cloth weights all come from data.js. This page used to
     define its own, which meant "mid-weight" was described here and again on
     the homepage, and a price label was typed next to the predicate it was
     supposed to describe. */
  var PRICE_BANDS = V.priceBands;
  var LINES = V.lines;
  var WEIGHTS = V.clothWeights.map(function (w) {
    return { id: w.id, label: w.name + ' — ' + w.range.toLowerCase(), test: w.test };
  });

  /* Colours are read off the catalogue rather than hard-coded, so a new
     colourway in data.js appears in the rail without touching this file. */
  var COLOURS = (function () {
    var seen = {}, out = [];
    V.products.forEach(function (p) {
      (p.colours.length ? p.colours : [{ name: p.colour, hex: '#8A8A8A' }]).forEach(function (c) {
        if (seen[c.name]) return;
        seen[c.name] = true;
        out.push({ id: c.name, label: c.name, hex: c.hex });
      });
    });
    return out.sort(function (a, b) { return a.label.localeCompare(b.label); });
  })();

  function productColours(p) {
    return p.colours.length ? p.colours.map(function (c) { return c.name; }) : [p.colour];
  }

  /* state ---------------------------------------------------------------- */
  var state = {
    cats: [], prices: [], tags: [], cols: [], weights: [],
    q: '', mysize: false, sort: 'featured',
    /* which groups are active, in the order they were applied */
    order: []
  };

  function readURL() {
    var u = new URLSearchParams(location.search);
    state.cats    = (u.get('c') || '').split(',').filter(Boolean);
    state.prices  = (u.get('p') || '').split(',').filter(Boolean);
    state.tags    = (u.get('tag') || '').split(',').filter(Boolean);
    state.cols    = (u.get('col') || '').split(',').filter(Boolean);
    state.weights = (u.get('w') || '').split(',').filter(Boolean);
    state.q       = u.get('q') || '';
    state.mysize  = u.get('fit') === '1';
    state.sort    = u.get('sort') || 'featured';
    /* arriving by link, there is no history — seed the order from the rail's
       own ordering so the empty state still has something sensible to offer */
    state.order = GROUPS.filter(isActive);
  }

  function writeURL() {
    var u = new URLSearchParams();
    if (state.cats.length)    u.set('c', state.cats.join(','));
    if (state.prices.length)  u.set('p', state.prices.join(','));
    if (state.tags.length)    u.set('tag', state.tags.join(','));
    if (state.cols.length)    u.set('col', state.cols.join(','));
    if (state.weights.length) u.set('w', state.weights.join(','));
    if (state.q)              u.set('q', state.q);
    if (state.mysize)         u.set('fit', '1');
    if (state.sort !== 'featured') u.set('sort', state.sort);
    var qs = u.toString();
    /* replaceState keeps the back button pointing at the previous page,
       not at every filter tick */
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  /* filtering ------------------------------------------------------------ */
  /* One predicate per group, so the count logic below can leave exactly one
     group out without duplicating any of these rules. */
  var TESTS = {
    cats: function (p, s) { return !s.cats.length || s.cats.indexOf(p.category) > -1; },
    tags: function (p, s) { return !s.tags.length || s.tags.indexOf(p.tag) > -1; },
    prices: function (p, s) {
      return !s.prices.length || PRICE_BANDS.some(function (b) {
        return s.prices.indexOf(b.id) > -1 && b.test(p);
      });
    },
    weights: function (p, s) {
      return !s.weights.length || WEIGHTS.some(function (w) {
        return s.weights.indexOf(w.id) > -1 && w.test(p);
      });
    },
    cols: function (p, s) {
      if (!s.cols.length) return true;
      var mine = productColours(p);
      return s.cols.some(function (c) { return mine.indexOf(c) > -1; });
    },
    mysize: function (p, s) { return !s.mysize || V.fit.fitsProfile(p); },
    q: function (p, s) {
      if (!s.q) return true;
      var hay = [p.name, p.blurb, p.colour, p.composition, V.catLabel(p.category), p.fabric,
                 p.prov && p.prov.mill, p.denim && p.denim.oz + 'oz'].join(' ').toLowerCase();
      return s.q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; });
    }
  };

  var GROUPS = ['cats', 'tags', 'prices', 'weights', 'cols', 'mysize', 'q'];

  function matches(p, s, except) {
    return GROUPS.every(function (g) { return g === except || TESTS[g](p, s || state); });
  }

  /* How many results would this option produce given everything else already
     chosen? Its own group is excluded, which is what makes multi-select
     within a group behave the way people expect. */
  function countFor(group, predicate) {
    var probe = {};
    GROUPS.forEach(function (g) { probe[g] = state[g]; });
    return V.products.filter(function (p) {
      return matches(p, probe, group) && predicate(p);
    }).length;
  }

  /* The <select> is built from this list, so an option can never name an
     order the page does not implement — or quietly go missing when one is
     added here. */
  var SORTS = [
    { id: 'featured', label: 'Featured',
      fn: function (a, b) { return rank(a) - rank(b) || a.name.localeCompare(b.name); } },
    { id: 'new', label: 'Newest',
      /* ties broken by the review average, which is now counted rather than
         asserted — an unreviewed piece sorts last rather than as a zero */
      fn: function (a, b) {
        return (b.tag === 'new') - (a.tag === 'new') ||
          (V.reviewStats(b.id).average || 0) - (V.reviewStats(a.id).average || 0);
      } },
    { id: 'price-asc', label: 'Price, low to high',
      fn: function (a, b) { return a.price - b.price; } },
    { id: 'price-desc', label: 'Price, high to low',
      fn: function (a, b) { return b.price - a.price; } },
    { id: 'name', label: 'A – Z',
      fn: function (a, b) { return a.name.localeCompare(b.name); } }
  ];
  function sorter(id) {
    var s = SORTS.filter(function (x) { return x.id === id; })[0];
    return (s || SORTS[0]).fn;
  }
  function rank(p) { return p.flag === 'Signature' ? 0 : p.tag === 'new' ? 1 : p.flag === 'Atelier' ? 2 : 3; }

  function buildSorts() {
    sortEl.innerHTML = SORTS.map(function (s) {
      return '<option value="' + s.id + '">' + esc(s.label) + '</option>';
    }).join('');
  }

  /* rendering ------------------------------------------------------------ */
  function render() {
    var list = V.products.filter(function (p) { return matches(p); }).sort(sorter(state.sort));

    /* "N pieces in your size" would overclaim: a saved waist says nothing
       about a shoe. Report what the switch actually removed instead. */
    var hidden = state.mysize
      ? V.products.filter(function (p) { return matches(p, null, 'mysize') && !TESTS.mysize(p, state); }).length
      : 0;

    count.textContent = list.length === 0
      ? 'No pieces match these filters'
      : list.length + (list.length === 1 ? ' piece' : ' pieces') +
        (hidden ? ' · ' + hidden + ' hidden that do not come in your size' : '');

    if (!list.length) {
      grid.style.display = 'block';
      grid.innerHTML = emptyMarkup();
      /* Which filters emptied the collection — a merchandising signal worth
         having. Not the search text: that is a free-text field somebody can
         type their own name into, and no aggregate is worth that risk. */
      if (V.track) {
        V.track('No results', {
          filters: state.order.join(' + ') || 'search only',
          searched: state.q ? 'yes' : 'no'
        });
      }
    } else {
      grid.style.display = '';
      grid.innerHTML = list.map(V.cardWithFit).join('');
      V.stagger(grid.querySelectorAll('.card'));
    }
    grid.setAttribute('aria-busy', 'false');

    renderChips();
    buildFilters();
    syncInputs();
    writeURL();
    paintHeading();
    paintSummaryCount();
  }

  /* --------------------------------------------------------- empty state */
  /* "Nothing matches, try removing a filter" leaves the shopper to work out
     which one. We already have everything needed to answer that: drop each
     active group in turn and see which one alone is doing the excluding. */
  var GROUP_LABELS = {
    cats: 'the category filter',
    cols: 'the colour filter',
    weights: 'the cloth weight filter',
    prices: 'the price filter',
    tags: 'the line filter',
    mysize: 'the “only my size” switch',
    q: 'the search'
  };

  function isActive(g) {
    if (g === 'mysize') return state.mysize;
    if (g === 'q') return !!state.q;
    return state[g].length > 0;
  }

  /* Which active filter, on its own, is excluding everything. Ordered by what
     was changed most recently: someone who browsed to Jeans and then ticked a
     colour in the rail meant the category and was experimenting with the
     colour, so offering to drop the colour respects what they came for.
     Falls back to whichever drop returns most. */
  function culprits() {
    return GROUPS.filter(isActive).map(function (g) {
      return {
        group: g,
        n: V.products.filter(function (p) { return matches(p, null, g); }).length,
        recency: state.order.indexOf(g)
      };
    }).filter(function (c) { return c.n > 0; })
      .sort(function (a, b) { return b.recency - a.recency || b.n - a.n; });
  }

  /* Called after any change to a group, so `order` is the sequence in which
     filters were actually applied rather than the order they appear in the
     rail. Not carried in the URL — a shared link has no history to remember. */
  function touch(g) {
    var i = state.order.indexOf(g);
    if (i > -1) state.order.splice(i, 1);
    if (isActive(g)) state.order.push(g);
  }

  function emptyMarkup() {
    var found = culprits();
    var lead = found.length
      ? 'Nothing matches all of those at once.'
      : 'Nothing in the collection fits that combination.';
    var offer = found.length
      ? '<p class="lede" style="font-size:1rem;max-width:46ch">Dropping ' +
          esc(GROUP_LABELS[found[0].group]) + ' would show ' + found[0].n +
          (found[0].n === 1 ? ' piece' : ' pieces') + '.</p>' +
        '<button class="btn btn--primary" type="button" data-drop="' + found[0].group + '">' +
          'Drop ' + esc(GROUP_LABELS[found[0].group]) + '</button>'
      : '';
    return '<div class="empty">' +
      '<span class="empty__icon">' + V.icon('search') + '</span>' +
      '<p class="display display--lg">No pieces match</p>' +
      '<p class="lede" style="font-size:1rem;max-width:44ch">' + lead + '</p>' +
      offer +
      '<button class="btn btn--ghost" type="button" data-clear>Clear all filters</button>' +
    '</div>';
  }

  function clearGroup(g) {
    if (g === 'mysize') state.mysize = false;
    else if (g === 'q') state.q = '';
    else state[g] = [];
    touch(g);
  }

  function renderChips() {
    var out = [];
    if (state.mysize) out.push(chip('mysize', '1', 'My size'));
    state.cats.forEach(function (c) { out.push(chip('cats', c, V.catLabel(c))); });
    state.cols.forEach(function (c) { out.push(chip('cols', c, c)); });
    state.weights.forEach(function (w) {
      var b = WEIGHTS.filter(function (x) { return x.id === w; })[0];
      if (b) out.push(chip('weights', w, b.label));
    });
    state.prices.forEach(function (p) {
      var b = PRICE_BANDS.filter(function (x) { return x.id === p; })[0];
      if (b) out.push(chip('prices', p, b.label));
    });
    state.tags.forEach(function (t) {
      var l = LINES.filter(function (x) { return x.id === t; })[0];
      if (l) out.push(chip('tags', t, l.label));
    });
    if (state.q) out.push(chip('q', state.q, '“' + state.q + '”'));
    chips.innerHTML = out.join('');
  }

  function chip(kind, value, label) {
    return '<button class="chip" type="button" data-chip="' + kind + '" data-value="' + esc(value) + '">' +
      esc(label) + V.icon('close') +
      '<span class="sr-only">Remove this filter</span></button>';
  }

  function paintHeading() {
    var h = document.getElementById('shop-title');
    var intro = document.getElementById('shop-intro');
    var crumb = document.getElementById('crumb-current');
    if (state.cats.length === 1) {
      var cat = V.categories.filter(function (c) { return c.slug === state.cats[0]; })[0];
      var label = V.catLabel(state.cats[0]);
      h.textContent = label;
      crumb.textContent = label;
      document.title = label + ' — VOLÀ';
      intro.textContent = (cat && cat.intro) || 'Cut from selvedge denim in our Florence atelier.';
    } else {
      h.textContent = 'The Collection';
      crumb.textContent = 'Collection';
      document.title = 'The Collection — VOLÀ';
      intro.textContent = 'Every piece cut from selvedge denim in our Florence atelier.';
    }
  }

  /* filter UI ------------------------------------------------------------ */
  function opt(group, value, label, n, swatch) {
    var id = 'f-' + group + '-' + value.replace(/\W+/g, '-');
    return '<label class="filter-opt' + (n === 0 ? ' is-empty' : '') + '" for="' + id + '">' +
      '<input type="checkbox" id="' + id + '" data-group="' + group + '" value="' + esc(value) + '"' +
        (n === 0 && state[group].indexOf(value) === -1 ? ' disabled' : '') + '>' +
      (swatch ? '<span class="filter-opt__swatch" style="background:' + swatch + '" aria-hidden="true"></span>' : '') +
      '<span>' + esc(label) + '</span>' +
      '<span class="filter-opt__count num" aria-hidden="true">' + n + '</span>' +
      '<span class="sr-only">, ' + n + (n === 1 ? ' piece' : ' pieces') + '</span>' +
    '</label>';
  }

  function buildFilters() {
    document.getElementById('cat-filters').innerHTML = V.categories.map(function (c) {
      return opt('cats', c.slug, c.label,
        countFor('cats', function (p) { return p.category === c.slug; }));
    }).join('');

    document.getElementById('colour-filters').innerHTML = COLOURS.map(function (c) {
      return opt('cols', c.id, c.label,
        countFor('cols', function (p) { return productColours(p).indexOf(c.id) > -1; }), c.hex);
    }).join('');

    document.getElementById('weight-filters').innerHTML = WEIGHTS.map(function (w) {
      return opt('weights', w.id, w.label, countFor('weights', w.test));
    }).join('');

    document.getElementById('price-filters').innerHTML = PRICE_BANDS.map(function (b) {
      return opt('prices', b.id, b.label, countFor('prices', b.test));
    }).join('');

    document.getElementById('tag-filters').innerHTML = LINES.map(function (l) {
      return opt('tags', l.id, l.label,
        countFor('tags', function (p) { return p.tag === l.id; }));
    }).join('');

    paintFitBlock();
  }

  function syncInputs() {
    Array.prototype.forEach.call(form.querySelectorAll('input[type=checkbox][data-group]'), function (cb) {
      cb.checked = state[cb.getAttribute('data-group')].indexOf(cb.value) > -1;
    });
    if (qEl.value !== state.q) qEl.value = state.q;
    sortEl.value = state.sort;
  }

  /* --------------------------------------------------------- fit in the rail */
  var fitBlock = document.getElementById('fit-filter');

  function paintFitBlock() {
    if (!fitBlock) return;
    /* render() runs on every filter tick, and rebuilding this block would
       throw away half-typed measurements. While the form is open it owns
       itself; it repaints on save, or on the next render after it closes. */
    var open = document.getElementById('shop-fit-panel');
    if (open && !open.hidden) return;
    if (V.fit.has()) {
      var n = V.products.filter(function (p) { return V.fit.fitsProfile(p); }).length;
      fitBlock.innerHTML =
        '<label class="filter-opt filter-opt--switch" for="f-mysize">' +
          '<input type="checkbox" id="f-mysize" data-mysize' + (state.mysize ? ' checked' : '') + '>' +
          '<span>Only my size</span>' +
          '<span class="filter-opt__count num" aria-hidden="true">' + n + '</span>' +
          '<span class="sr-only">, ' + n + ' pieces</span>' +
        '</label>' +
        '<button class="link-u" type="button" data-fit-toggle>Edit my measurements</button>' +
        '<div class="fitpanel" id="shop-fit-panel" hidden>' + V.fit.formMarkup('shop') + '</div>';
    } else {
      fitBlock.innerHTML =
        '<p class="filter-group__note">Save four measurements once and every piece will ' +
          'show whether it comes in your size.</p>' +
        '<button class="btn btn--ghost btn--sm" type="button" data-fit-toggle>Find my size</button>' +
        '<div class="fitpanel" id="shop-fit-panel" hidden>' + V.fit.formMarkup('shop') + '</div>';
    }
    var panel = document.getElementById('shop-fit-panel');
    if (panel) V.fit.bindForm(panel, 'shop', function () {
      panel.hidden = true;
      render();
    });
  }

  /* events --------------------------------------------------------------- */
  form.addEventListener('change', function (e) {
    var ms = e.target.closest('[data-mysize]');
    if (ms) { state.mysize = ms.checked; touch('mysize'); render(); return; }

    var cb = e.target.closest('input[type=checkbox][data-group]');
    if (!cb) return;
    var g = cb.getAttribute('data-group');
    var i = state[g].indexOf(cb.value);
    if (cb.checked && i === -1) state[g].push(cb.value);
    if (!cb.checked && i > -1) state[g].splice(i, 1);
    touch(g);
    render();
    /* buildFilters() replaced the node this event came from, so put focus
       back on its equivalent rather than dropping the keyboard user at the
       top of the document */
    var again = document.getElementById(cb.id);
    if (again) again.focus();
  });

  form.addEventListener('click', function (e) {
    if (!e.target.closest('[data-fit-toggle]')) return;
    var panel = document.getElementById('shop-fit-panel');
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      var first = panel.querySelector('input');
      if (first) first.focus();
    }
  });

  form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* debounced so typing does not re-render on every keystroke */
  var t;
  qEl.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () { state.q = qEl.value.trim(); touch('q'); render(); }, 220);
  });

  sortEl.addEventListener('change', function () { state.sort = sortEl.value; render(); });

  chips.addEventListener('click', function (e) {
    var c = e.target.closest('[data-chip]');
    if (!c) return;
    var kind = c.getAttribute('data-chip');
    if (kind === 'q') { state.q = ''; }
    else if (kind === 'mysize') { state.mysize = false; }
    else {
      var i = state[kind].indexOf(c.getAttribute('data-value'));
      if (i > -1) state[kind].splice(i, 1);
    }
    touch(kind);
    render();
    /* keyboard users land somewhere sensible after the chip disappears */
    (chips.querySelector('.chip') || qEl).focus();
  });

  function clearAll() {
    state.cats = []; state.prices = []; state.tags = [];
    state.cols = []; state.weights = []; state.q = ''; state.mysize = false;
    state.order = [];
    render();
  }
  document.getElementById('clear-all').addEventListener('click', clearAll);
  grid.addEventListener('click', function (e) {
    if (e.target.closest('[data-clear]')) { clearAll(); qEl.focus(); return; }
    var drop = e.target.closest('[data-drop]');
    if (drop) {
      clearGroup(drop.getAttribute('data-drop'));
      render();
      /* the button that was clicked no longer exists; put the reader at the
         top of the results they just asked for */
      count.setAttribute('tabindex', '-1');
      count.focus();
    }
  });

  var searchBtn = document.querySelector('[data-search-focus]');
  if (searchBtn) searchBtn.addEventListener('click', function () {
    qEl.focus();
    qEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  /* a profile saved in another tab should change this grid too */
  document.addEventListener('vola:fit', function () { render(); });

  /* ------------------------------------------------- filters disclosure */
  /* One sidebar at >=1024px, a collapsed disclosure below it. <details> can
     only be opened via the attribute, so the breakpoint is driven here. */
  var panel = document.getElementById('filters-panel');
  var wide = window.matchMedia('(min-width: 1024px)');

  function syncPanel(e) {
    if (e.matches) { panel.open = true; }
    else if (!panel.dataset.touched) { panel.open = false; }
  }
  panel.addEventListener('toggle', function () {
    if (!wide.matches) panel.dataset.touched = '1';
  });
  if (wide.addEventListener) wide.addEventListener('change', syncPanel);
  else wide.addListener(syncPanel);           /* older Safari */
  syncPanel(wide);

  function paintSummaryCount() {
    var n = state.cats.length + state.prices.length + state.tags.length +
            state.cols.length + state.weights.length + (state.q ? 1 : 0) + (state.mysize ? 1 : 0);
    var s = panel.querySelector('summary');
    s.firstChild.nodeValue = n ? 'Filter (' + n + ')' : 'Filter';
  }

  /* boot ----------------------------------------------------------------- */
  readURL();
  buildSorts();
  render();
})();
