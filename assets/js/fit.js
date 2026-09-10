/* VOLÀ — the fit profile.

   Baymard's 2026 apparel research puts size and fit at the top of the
   category's unsolved problems: strong photography everywhere, almost no
   support for actually choosing a size. This is the answer at the scale a
   static site can manage — four measurements, kept locally, reused on every
   product page and in the collection filters.

   No account, no network, no personal data leaving the browser. The profile
   lives in localStorage next to the bag, every read and write is wrapped, and
   a blocked-storage browser degrades to the plain size buttons rather than
   breaking. */
(function () {
  'use strict';

  var VOLA = (window.VOLA = window.VOLA || {});
  var KEY = 'vola.fit.v1';

  var PREFERS = [
    { id: 'close', label: 'Close to the body' },
    { id: 'true',  label: 'As designed' },
    { id: 'roomy', label: 'With room' }
  ];

  /* ------------------------------------------------------------- the store */
  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var v = raw ? JSON.parse(raw) : null;
      return v && typeof v === 'object' ? v : null;
    } catch (e) { return null; }        /* private mode / blocked storage */
  }

  function write(profile) {
    try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch (e) { /* non-fatal */ }
    fit.profile = profile;
    document.dispatchEvent(new CustomEvent('vola:fit', { detail: profile }));
    /* THAT a profile was saved or cleared, never what is in it. The
       measurements are the most personal thing this site holds and they do
       not leave the browser — see privacy.html#sizes. The guard in
       analytics.js would drop them anyway; this is the belt. */
    if (VOLA.track) VOLA.track(profile ? 'Fit profile saved' : 'Fit profile cleared');
  }

  /* --------------------------------------------------------- the reasoning */
  /* Deliberately simple and deliberately legible: every recommendation has to
     be explainable in one sentence on the page, because a size suggestion
     nobody understands is a size suggestion nobody trusts. */

  function apparelIndex(profile) {
    var w = profile.weightKg, h = profile.heightCm;
    var i = w < 52 ? 0 : w < 60 ? 1 : w < 69 ? 2 : w < 79 ? 3 : 4;
    /* the same weight carried over more height wants a longer, larger cut */
    if (h >= 178 && i < 4) i += 0.5;
    else if (h <= 160 && i > 0) i -= 0.5;
    return Math.round(i);
  }

  function nearestIndex(list, value) {
    var best = 0, gap = Infinity;
    list.forEach(function (s, i) {
      var d = Math.abs(parseFloat(s) - value);
      if (d < gap) { gap = d; best = i; }
    });
    return best;
  }

  /* Walk outwards from the ideal index to the closest size still in stock, so
     a sold-out recommendation becomes a useful second choice rather than a
     dead end. */
  function toStock(product, index) {
    var n = product.sizes.length;
    index = Math.max(0, Math.min(n - 1, index));
    for (var step = 0; step < n; step++) {
      var up = index + step, down = index - step;
      if (down >= 0 && product.soldOut.indexOf(product.sizes[down]) === -1) return { i: down, exact: step === 0 };
      if (up < n && product.soldOut.indexOf(product.sizes[up]) === -1) return { i: up, exact: step === 0 };
    }
    return null;
  }

  var ADVICE_TEXT = {
    up:   'this piece runs small',
    down: 'this piece runs large',
    'true': null
  };

  function recommend(product) {
    var profile = fit.profile;
    if (!profile || product.sizeSystem === 'one') return null;

    var ideal, basis;
    if (product.sizeSystem === 'waist') {
      if (profile.waistIn == null) return null;
      ideal = nearestIndex(product.sizes, profile.waistIn);
      basis = 'a ' + profile.waistIn + '" waist';
    } else if (product.sizeSystem === 'foot') {
      if (profile.shoeEu == null) return null;
      ideal = nearestIndex(product.sizes, profile.shoeEu);
      basis = 'EU ' + profile.shoeEu;
    } else {
      if (profile.heightCm == null || profile.weightKg == null) return null;
      ideal = apparelIndex(profile);
      basis = profile.heightCm + 'cm and ' + profile.weightKg + 'kg';
    }

    var advice = (product.fit && product.fit.advice) || 'true';
    var moved = [];
    if (advice === 'up')   { ideal += 1; moved.push(ADVICE_TEXT.up); }
    if (advice === 'down') { ideal -= 1; moved.push(ADVICE_TEXT.down); }
    if (profile.prefer === 'close') { ideal -= 1; moved.push('you wear things close to the body'); }
    if (profile.prefer === 'roomy') { ideal += 1; moved.push('you wear things with room'); }

    var hit = toStock(product, ideal);
    if (!hit) return null;

    var reason = 'From ' + basis;
    if (moved.length) reason += ', and because ' + moved.join(' and ');
    reason += '.';
    if (!hit.exact) reason += ' Your closest size is out of stock, so this is the nearest we can send.';

    return { size: product.sizes[hit.i], reason: reason, exact: hit.exact };
  }

  /* The size you take in general, as opposed to the size you take in one
     particular piece. `recommend` deliberately folds in how a given cut runs;
     a profile readout must not, or the homepage ends up telling someone they
     are an XS because the first shirt in the catalogue happens to be
     oversized. Personal preference still counts — that is about the wearer,
     not the garment. */
  function baseSize(system) {
    var p = fit.profile;
    var list = VOLA.sizeSets && VOLA.sizeSets[system];
    if (!p || !list || system === 'one') return null;

    var i;
    if (system === 'waist') {
      if (p.waistIn == null) return null;
      i = nearestIndex(list, p.waistIn);
    } else if (system === 'foot') {
      if (p.shoeEu == null) return null;
      i = nearestIndex(list, p.shoeEu);
    } else {
      if (p.heightCm == null || p.weightKg == null) return null;
      i = apparelIndex(p);
    }
    if (p.prefer === 'close') i -= 1;
    if (p.prefer === 'roomy') i += 1;
    return list[Math.max(0, Math.min(list.length - 1, i))];
  }

  /* Whether the profile holds the measurement this piece's size system needs.
     A waist measurement says nothing about a shoe, and claiming otherwise —
     by badging every pair of boots "not in your size" — is worse than saying
     nothing at all. */
  function canSize(product) {
    var p = fit.profile;
    if (!p || product.sizeSystem === 'one') return false;
    if (product.sizeSystem === 'waist') return p.waistIn != null;
    if (product.sizeSystem === 'foot') return p.shoeEu != null;
    return p.heightCm != null && p.weightKg != null;
  }

  /* What "Only my size" filters on. Pieces we cannot size pass through:
     the switch is there to remove what we know will not fit, not to hide
     every category the profile happens to say nothing about. */
  function fitsProfile(product) {
    if (!canSize(product)) return true;
    var r = recommend(product);
    return !!(r && r.exact);
  }

  /* ------------------------------------------------------------- the form */
  /* One form, used on the product page and in the collection sidebar. `ns`
     namespaces the ids so both can be on the page at once without colliding. */
  function formMarkup(ns) {
    var p = fit.profile || {};
    function num(id, label, hint, value, min, max, step) {
      return '<div class="fitform__field">' +
        '<label for="' + ns + '-' + id + '">' + label +
          (hint ? ' <span class="fitform__hint">' + hint + '</span>' : '') + '</label>' +
        '<input class="input" type="number" inputmode="numeric" id="' + ns + '-' + id + '" ' +
          'data-fit="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '"' +
          (value != null ? ' value="' + value + '"' : '') + '>' +
      '</div>';
    }
    return '<div class="fitform">' +
      '<div class="fitform__grid">' +
        num('heightCm', 'Height', 'cm', p.heightCm, 130, 220, 1) +
        num('weightKg', 'Weight', 'kg', p.weightKg, 35, 200, 1) +
        num('waistIn', 'Waist', 'in', p.waistIn, 20, 46, 1) +
        num('shoeEu', 'Shoe', 'EU', p.shoeEu, 33, 48, 1) +
      '</div>' +
      '<fieldset class="fitform__prefer">' +
        '<legend>You like things to sit</legend>' +
        '<div class="fitform__prefer-opts">' +
          PREFERS.map(function (o) {
            var id = ns + '-pref-' + o.id;
            return '<label class="fitform__radio" for="' + id + '">' +
              '<input type="radio" name="' + ns + '-prefer" id="' + id + '" value="' + o.id + '"' +
                ((p.prefer || 'true') === o.id ? ' checked' : '') + '>' +
              '<span>' + o.label + '</span></label>';
          }).join('') +
        '</div>' +
      '</fieldset>' +
      '<div class="fitform__actions">' +
        '<button class="btn btn--primary btn--sm" type="button" data-fit-save>Save my fit profile</button>' +
        (fit.profile ? '<button class="link-u" type="button" data-fit-clear>Forget it</button>' : '') +
      '</div>' +
      '<p class="fitform__note">Kept in this browser only. Never sent anywhere, and no account required.</p>' +
    '</div>';
  }

  /* Reads whatever the person actually filled in — every field is optional,
     because a shoe size is no use for a jean and vice versa. */
  function bindForm(root, ns, onSave) {
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-fit-clear]')) {
        write(null);
        if (onSave) onSave(null);
        VOLA.toast('Fit profile forgotten');
        return;
      }
      if (!e.target.closest('[data-fit-save]')) return;

      var next = {};
      var any = false;
      Array.prototype.forEach.call(root.querySelectorAll('[data-fit]'), function (input) {
        var raw = input.value.trim();
        if (raw === '') { next[input.getAttribute('data-fit')] = null; return; }
        var n = parseFloat(raw);
        if (isNaN(n)) return;
        /* respect the input's own bounds rather than trusting the typed value */
        var min = parseFloat(input.min), max = parseFloat(input.max);
        next[input.getAttribute('data-fit')] = Math.max(min, Math.min(max, n));
        any = true;
      });
      var pref = root.querySelector('input[name="' + ns + '-prefer"]:checked');
      next.prefer = pref ? pref.value : 'true';

      if (!any) {
        VOLA.toast('Add at least one measurement so we can suggest a size');
        var first = root.querySelector('[data-fit]');
        if (first) first.focus();
        return;
      }
      write(next);
      if (onSave) onSave(next);
      VOLA.toast('Fit profile saved — sizes are now suggested for you');
    });
  }

  /* "M in apparel, 27 in denim, 39 in shoes" — the profile said in one line.
     Both the contact form and the commission request offer to send this, and
     they must describe it identically or the two pages disagree about what
     the same checkbox does. */
  function summaryLine() {
    if (!fit.profile) return '';
    var parts = [];
    [['apparel', 'apparel'], ['waist', 'denim'], ['foot', 'shoes']].forEach(function (pair) {
      var s = baseSize(pair[0]);
      if (s) parts.push(s + ' in ' + pair[1]);
    });
    return parts.join(', ');
  }

  var fit = VOLA.fit = {
    profile: read(),
    summaryLine: summaryLine,
    prefers: PREFERS,
    has: function () { return !!fit.profile; },
    get: read,
    set: write,
    clear: function () { write(null); },
    recommend: recommend,
    baseSize: baseSize,
    canSize: canSize,
    fitsProfile: fitsProfile,
    formMarkup: formMarkup,
    bindForm: bindForm
  };

  /* another tab changed the profile */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) {
      fit.profile = read();
      document.dispatchEvent(new CustomEvent('vola:fit', { detail: fit.profile }));
    }
  });
})();
