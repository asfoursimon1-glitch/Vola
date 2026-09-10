/* VOLÀ — product detail: gallery, colour/size selection, add to bag.

   The order of the right-hand column is deliberate. Name, price and cloth
   come first; then the two decisions (colour, size) with the fit help sitting
   inside the size field rather than a page away; then provenance and the
   price breakdown, because "where is this from" and "what am I paying for"
   are the questions that decide a $690 jean, and an About page cannot answer
   them at the moment they are asked. */
(function () {
  'use strict';

  var V = window.VOLA;
  var esc = V.esc;
  var root = document.getElementById('pdp-root');

  var id = new URLSearchParams(location.search).get('id');
  var product = id ? V.byId(id) : null;

  /* A separate event rather than a richer pageview, because the pageview
     deliberately drops the query string — ?id= is useful, but a link somebody
     pasted could carry anything, and the two cannot be told apart reliably. */
  if (V.track) {
    V.track(product ? 'Product viewed' : 'Product not found',
      product ? { piece: product.id, category: product.category } : null);
  }

  if (!product) {
    root.innerHTML =
      '<div class="empty" style="padding-block:var(--space-9)">' +
        '<span class="empty__icon">' + V.icon('search') + '</span>' +
        '<h1 class="display display--xl">We could not find that piece</h1>' +
        '<p class="lede" style="font-size:1rem;max-width:44ch">It may have sold out, or the link may be incomplete.</p>' +
        '<a class="btn btn--primary" href="shop.html">Browse the collection</a>' +
      '</div>';
    document.title = 'Not found — VOLÀ';
    return;
  }

  document.title = product.name + ' — VOLÀ';
  var meta = document.querySelector('meta[name=description]');
  if (meta) meta.setAttribute('content', product.blurb);

  /* selection state ------------------------------------------------------ */
  var sel = {
    colour: product.colour,
    size: null,
    image: 0
  };

  var available = product.sizes.filter(function (s) { return product.soldOut.indexOf(s) === -1; });
  var isOneSize = product.sizeSystem === 'one';
  if (isOneSize) sel.size = product.sizes[0];

  var rec = V.fit.recommend(product);
  /* a saved profile pre-selects, so the common path is: arrive, add to bag */
  if (rec && rec.exact) sel.size = rec.size;

  /* ------------------------------------------------------------- markup */
  function galleryMarkup() {
    var thumbs = product.images.length > 1
      ? '<div class="gallery__thumbs" role="group" aria-label="Product images">' +
          product.images.map(function (src, i) {
            return '<button class="gallery__thumb" type="button" data-thumb="' + i + '"' +
              (i === sel.image ? ' aria-current="true"' : '') + '>' +
              '<img src="' + src + '" alt="" width="72" height="90" loading="lazy">' +
              '<span class="sr-only">Show image ' + (i + 1) + ' of ' + product.images.length + '</span></button>';
          }).join('') +
        '</div>'
      : '';
    return '<div class="gallery">' +
      '<div class="gallery__main"><img id="hero-img" src="' + product.images[sel.image] + '" alt="' +
        esc(product.alt) + '" width="800" height="1000" fetchpriority="high" decoding="async"></div>' +
      thumbs +
    '</div>';
  }

  /* ---------------------------------------------------------- the cloth */
  /* Every denim brand prints "100% cotton, 14oz" in a composition paragraph
     and leaves the buyer to work out what that means. These three figures are
     the spec the category never publishes: what it weighs, whether it moves,
     and what it will look like in a year. */
  function denimMarkup() {
    var d = product.denim;
    if (!d) return '';
    var hand = V.denimVocab.hand[d.hand] || V.denimVocab.hand.rigid;
    var fade = V.denimVocab.fade[d.fade] || V.denimVocab.fade.low;
    function stat(value, sub, label) {
      return '<div class="spec__item">' +
        '<span class="spec__value num">' + esc(value) + '</span>' +
        '<span class="spec__sub">' + esc(sub) + '</span>' +
        '<span class="spec__label">' + esc(label) + '</span>' +
      '</div>';
    }
    /* the same band the collection page files this piece under, so the two
       pages cannot describe the same cloth in different words */
    var band = V.weightBand(product);
    return '<section class="spec" aria-label="The cloth">' +
      '<div class="spec__row">' +
        stat(d.oz + ' oz', band ? band.name.toLowerCase() : '', 'Weight') +
        stat(hand.label, hand.sub, 'Hand') +
        stat(fade.label, fade.sub, 'Over time') +
      '</div>' +
      (d.note ? '<p class="spec__note">' + esc(d.note) + '</p>' : '') +
    '</section>';
  }

  /* --------------------------------------------------------- what people say */
  /* Every piece has carried a rating and a review count since the catalogue
     was written and the page has never shown either — while giving a whole
     progress bar to true-to-size. Reviews are the trust signal shoppers
     actually look for; the count matters as much as the score, so both are
     stated plainly rather than rendered as five small stars. */
  var stats = V.reviewStats(product.id);

  function ratingMarkup() {
    /* No reviews is a fact, not an absence to paper over — and saying so is
       what makes the scores on everything else worth believing. */
    if (!stats.count) {
      return '<p class="pdp__rating pdp__rating--none">' +
        '<span>No reviews yet</span>' +
        '<a class="link-u" href="reviews.html">Read what clients say about the collection</a>' +
      '</p>';
    }
    return '<p class="pdp__rating">' +
      '<span class="pdp__rating-score num">' + stats.average.toFixed(1) + '</span>' +
      '<span class="pdp__rating-of">out of 5</span>' +
      '<a class="link-u" href="reviews.html?id=' + encodeURIComponent(product.id) + '">' +
        stats.count + (stats.count === 1 ? ' review' : ' reviews') + '</a>' +
    '</p>';
  }

  function coloursMarkup() {
    if (product.colours.length < 2) {
      return '<p class="field__hint" style="text-transform:none;letter-spacing:0">' +
             'Colour: ' + esc(product.colour) + '</p>';
    }
    return '<div class="field">' +
      '<span class="field__label" id="colour-lbl">Colour' +
        '<span class="field__hint" id="colour-val">' + esc(sel.colour) + '</span></span>' +
      '<div class="swatches" role="group" aria-labelledby="colour-lbl">' +
        product.colours.map(function (c) {
          return '<button class="swatch" type="button" data-colour="' + esc(c.name) + '"' +
            ' style="background:' + c.hex + '"' +
            ' aria-pressed="' + (c.name === sel.colour) + '">' +
            '<span class="sr-only">' + esc(c.name) + '</span></button>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  /* ------------------------------------------------------------- the fit */
  function recBannerMarkup() {
    if (isOneSize) return '';
    if (rec) {
      /* only claim it as "your size" when it actually is one — a fallback
         to the nearest thing in stock has to say so, or the next honest
         sentence on the page reads as a contradiction */
      var lead = rec.exact ? 'Your size: ' + rec.size : 'Closest in stock: ' + rec.size;
      return '<p class="fitrec' + (rec.exact ? '' : ' fitrec--near') + '" id="fit-rec">' +
        V.icon('ruler') +
        '<span><strong>' + esc(lead) + '</strong> ' + esc(rec.reason) +
        ' <button class="link-u" type="button" data-fit-toggle>Change my measurements</button></span>' +
      '</p>';
    }
    return '<p class="fitrec fitrec--empty" id="fit-rec">' +
      V.icon('ruler') +
      '<span>Not sure of your size? ' +
      '<button class="link-u" type="button" data-fit-toggle>Find my size</button>' +
      ' — four measurements, kept in this browser.</span>' +
    '</p>';
  }

  function sizesMarkup() {
    if (isOneSize) {
      return '<p class="field__hint" style="text-transform:none;letter-spacing:0">One size</p>';
    }
    return '<div class="field">' +
      '<span class="field__label" id="size-lbl">Size' +
        '<a class="field__hint" href="fit.html" style="text-decoration:underline;text-underline-offset:3px">Size guide</a>' +
      '</span>' +
      '<div class="sizes" role="group" aria-labelledby="size-lbl">' +
        product.sizes.map(function (s) {
          var out = product.soldOut.indexOf(s) > -1;
          var isRec = rec && rec.exact && rec.size === s;
          return '<button class="size' + (isRec ? ' size--rec' : '') + '" type="button" data-size="' + esc(s) + '"' +
            ' aria-pressed="' + (sel.size === s) + '"' + (out ? ' disabled' : '') + '>' + esc(s) +
            (isRec ? '<span class="sr-only">, recommended for you</span>' : '') +
            (out ? '<span class="sr-only">, sold out</span>' : '') + '</button>';
        }).join('') +
      '</div>' +
      recBannerMarkup() +
      '<div class="fitpanel" id="fit-panel" hidden>' + V.fit.formMarkup('pdp') + '</div>' +
      '<p class="field__error" id="size-error" role="alert" hidden>' +
        V.icon('alert') + '<span>Please choose a size before adding to your bag.</span></p>' +
    '</div>';
  }

  /* --------------------------------------------------------- provenance */
  /* Adjectives are free; a mill name, a founding date and an hour count are
     checkable. That is the whole difference between a story and a proof. */
  function provMarkup() {
    var pr = product.prov;
    if (!pr) return '';
    var items = [
      ['Woven at', pr.mill, pr.city + ', ' + pr.country],
      ['Mill founded', String(pr.since), (new Date().getFullYear() - pr.since) + ' years'],
      ['In the atelier', pr.hours + ' hours', pr.hands + (pr.hands === 1 ? ' pair of hands' : ' pairs of hands')]
    ];
    if (pr.edition) items.push(['Availability', pr.edition, 'Florence atelier']);
    return '<section class="prov" aria-labelledby="prov-h">' +
      '<h2 class="prov__h" id="prov-h">' + V.icon('pin') + 'Where it comes from</h2>' +
      '<dl class="prov__list">' +
        items.map(function (it) {
          return '<div class="prov__item">' +
            '<dt>' + esc(it[0]) + '</dt>' +
            '<dd>' + esc(it[1]) + '<span>' + esc(it[2]) + '</span></dd>' +
          '</div>';
        }).join('') +
      '</dl>' +
      /* was about.html#atelier, an anchor that has never existed on that page */
      '<a class="link-u" href="traceability.html#mills">The full mill record</a>' +
    '</section>';
  }

  /* ------------------------------------------------------ price breakdown */
  function costMarkup() {
    var rows = V.costs(product);
    var max = rows.reduce(function (m, r) { return Math.max(m, r.share); }, 0);
    return '<details class="costs">' +
      '<summary><span>What you are paying for</span><span class="costs__sum num">' +
        V.money(product.price) + '</span></summary>' +
      '<div class="costs__body">' +
        '<ul class="costs__list">' +
          rows.map(function (r) {
            return '<li class="costs__row">' +
              '<span class="costs__label">' + esc(r.label) + '</span>' +
              '<span class="costs__bar" aria-hidden="true">' +
                '<i style="width:' + (r.share / max * 100).toFixed(1) + '%"></i></span>' +
              '<span class="costs__amt num">' + V.money(r.amount) + '</span>' +
            '</li>';
          }).join('') +
        '</ul>' +
        '<p class="costs__note">Figures are per piece at current volumes and include duty into the ' +
          'EU. A traditional maison would price this piece at about ' +
          V.money(Math.round(product.price * 2.4 / 10) * 10) + '.</p>' +
      '</div>' +
    '</details>';
  }

  function infoMarkup() {
    /* "Only 1 size remaining" is meaningless on a piece that only ever had
       one size — scarcity has to be real to be worth saying */
    var lowStock = !isOneSize && available.length > 0 && available.length <= 2;
    return '<div class="pdp__info">' +
      '<nav aria-label="Breadcrumb"><ol class="crumbs">' +
        '<li><a href="index.html">VOLÀ</a></li>' +
        '<li><a href="shop.html?c=' + product.category + '">' + esc(V.catLabel(product.category)) + '</a></li>' +
        '<li aria-current="page">' + esc(product.name) + '</li>' +
      '</ol></nav>' +

      '<div class="stack">' +
        (product.flag ? '<p class="eyebrow" style="color:var(--c-accent)">' + esc(product.flag) + '</p>' : '') +
        '<h1 class="display display--xl">' + esc(product.name) + '</h1>' +
        '<p class="pdp__price num">' + V.money(product.price) + '</p>' +
        ratingMarkup() +
        '<p class="lede" style="font-size:1rem">' + esc(product.blurb) + '</p>' +
      '</div>' +

      denimMarkup() +
      coloursMarkup() +
      sizesMarkup() +

      (lowStock ? '<p class="field__hint" style="color:var(--c-accent);text-transform:none;letter-spacing:0">' +
        'Only ' + available.length + (available.length === 1 ? ' size' : ' sizes') + ' remaining.</p>' : '') +

      '<div class="stack">' +
        '<button class="btn btn--primary btn--block" type="button" id="add">Add to bag</button>' +
        /* carry the piece across rather than dropping someone on a blank
           form and asking them to describe what they were just looking at.
           Goes to the commission page, which can actually answer "what would
           this cost made to my measurements" — the contact form could not. */
        '<a class="btn btn--ghost btn--block" href="made-to-measure.html?id=' +
          encodeURIComponent(product.id) + '#request">Commission this, made to measure</a>' +
      '</div>' +

      /* The returns half of this line has to agree with the accordion below
         it: promising 30-day returns above a panel that says final sale is
         the kind of contradiction a shopper only notices after buying. */
      '<p class="field__hint" style="text-transform:none;letter-spacing:0;display:flex;gap:8px;align-items:center">' +
        V.icon('truck') + 'Complimentary express shipping over ' + V.money(V.terms.freeShipOver) +
        ' · ' + (product.tag === 'atelier'
          ? 'made to order, final sale'
          : V.terms.returnsDays + '-day returns') + '</p>' +

      provMarkup() +
      costMarkup() +
      accordionMarkup() +
      /* the two questions this page raises and does not answer: when it will
         arrive where the reader lives, and whether it can come back */
      '<div id="pdp-help"></div>' +
    '</div>';
  }

  function accordionMarkup() {
    var f = product.fit || {};
    var adviceLine = f.advice === 'up'
      ? 'Most clients size up in this piece.'
      : f.advice === 'down'
        ? 'Most clients size down in this piece.'
        : 'Most clients take their usual size.';

    var items = [
      { t: 'Fit &amp; sizing', h:
          (f.cut ? '<p>' + esc(f.cut) + '</p>' : '') +
          /* Counted from the reviews on this piece, and phrased for the
             sample size: "2 of 4 clients" is honest where "50%" pretends to a
             precision four reviews cannot carry. A percentage only once there
             are enough reviews for one to mean anything. */
          /* Counted from the reviews that answered the fit question — not
             from every review, which would read silence as disagreement. */
          (stats.fitCount && product.sizeSystem !== 'one'
            ? '<div class="tts"><div class="tts__bar"><i style="width:' +
                Math.round(stats.tts * 100) + '%"></i></div>' +
              '<p class="tts__text"><strong>' +
                (stats.fitCount >= 10
                  ? Math.round(stats.tts * 100) + '% of clients'
                  : stats.trueCount + ' of ' + stats.fitCount +
                    (stats.fitCount === 1 ? ' client' : ' clients')) +
              '</strong> found this piece true to size. ' + esc(adviceLine) +
              ' <a href="reviews.html?id=' + encodeURIComponent(product.id) + '">Read them</a>.' +
              '</p></div>'
            : '') +
          (f.model ? '<p class="accordion__aside">' + esc(f.model) + '</p>' : '') },
      { t: 'Composition', h: '<p>' + esc(product.composition) + '</p><p style="margin-top:8px">Woven at the ' +
           esc(product.fabric) + '.</p>' },
      { t: 'In the atelier', h: '<p>' + esc(product.atelier) + '</p>' },
      { t: 'Care', h: '<ul>' + product.care.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' },
      /* Final sale is a real restriction on a real piece, so say it on the
         piece it applies to rather than as a blanket footnote everyone
         learns to skip. */
      { t: 'Shipping &amp; returns', h: '<ul>' +
           '<li>Complimentary express shipping on orders over ' + V.money(V.terms.freeShipOver) +
             ', worldwide. ' + V.money(V.terms.flatShipping) + ' below it.</li>' +
           (product.tag === 'atelier'
             ? '<li><strong>This piece is made to order, and is final sale.</strong> ' +
               'Tell us before it is cut and we will stop; after that it exists only for you.</li>'
             : '<li>Returns accepted within ' + V.terms.returnsDays +
               ' days, unworn, with the tag attached.</li>') +
           '<li>Free repairs in Florence, for as long as you own the piece.</li></ul>' }
    ];
    return '<div class="accordion">' + items.map(function (it, i) {
      var pid = 'acc-' + i;
      return '<div class="accordion__item">' +
        '<h2><button class="accordion__btn" type="button" aria-expanded="' + (i === 0) + '" aria-controls="' + pid + '">' +
          '<span>' + it.t + '</span>' + V.icon('plus') + '</button></h2>' +
        '<div class="accordion__panel" id="' + pid + '" data-state="' + (i === 0 ? 'open' : 'closed') + '"' +
          (i === 0 ? '' : ' aria-hidden="true"') +
          '><div class="accordion__panel-inner"><div class="accordion__panel-content">' + it.h + '</div></div></div>' +
      '</div>';
    }).join('') + '</div>';
  }

  root.className = 'wrap pdp';
  root.innerHTML = galleryMarkup() + infoMarkup();

  /* -------------------------------------------------------------- events */
  var heroImg = document.getElementById('hero-img');
  var sizeError = document.getElementById('size-error');
  var fitPanel = document.getElementById('fit-panel');

  function markThumb(index) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-thumb]'), function (b) {
      if (parseInt(b.getAttribute('data-thumb'), 10) === index) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  /* Choosing black and still being shown indigo is the fastest way to lose
     trust on a PDP, so the swatch drives the image. */
  function showColourImage(name) {
    var c = product.colours.filter(function (x) { return x.name === name; })[0];
    if (!c || !c.image) return;
    heroImg.src = c.image;
    /* the default alt names the default colourway, so describe the variant
       from scratch rather than appending to a contradictory sentence */
    heroImg.alt = product.name + ' by VOLÀ, ' + name;
    var i = product.images.indexOf(c.image);
    sel.image = i > -1 ? i : -1;
    markThumb(sel.image);
  }

  /* Re-run the recommendation and repaint only the parts that depend on it:
     the highlighted size button and the sentence explaining why. Repainting
     the whole column would throw away the colour choice and the scroll
     position for the sake of one changed word. */
  function repaintFit() {
    rec = V.fit.recommend(product);
    var banner = document.getElementById('fit-rec');
    if (banner) {
      var fresh = document.createElement('div');
      fresh.innerHTML = recBannerMarkup();
      if (fresh.firstChild) banner.replaceWith(fresh.firstChild);
    }
    Array.prototype.forEach.call(root.querySelectorAll('[data-size]'), function (b) {
      var isRec = rec && rec.exact && rec.size === b.getAttribute('data-size');
      b.classList.toggle('size--rec', !!isRec);
    });
    if (rec && rec.exact && !sel.size) {
      var btn = root.querySelector('[data-size="' + rec.size + '"]:not([disabled])');
      if (btn) btn.click();
    }
  }

  if (fitPanel) {
    V.fit.bindForm(fitPanel, 'pdp', function () {
      fitPanel.hidden = true;
      repaintFit();
    });
  }

  root.addEventListener('click', function (e) {
    /* fit finder */
    if (e.target.closest('[data-fit-toggle]')) {
      fitPanel.hidden = !fitPanel.hidden;
      if (!fitPanel.hidden) {
        var first = fitPanel.querySelector('input');
        if (first) first.focus();
      }
      return;
    }

    /* gallery */
    var th = e.target.closest('[data-thumb]');
    if (th) {
      sel.image = parseInt(th.getAttribute('data-thumb'), 10);
      heroImg.src = product.images[sel.image];
      heroImg.alt = product.alt;
      markThumb(sel.image);
      return;
    }

    /* colour */
    var sw = e.target.closest('[data-colour]');
    if (sw) {
      sel.colour = sw.getAttribute('data-colour');
      Array.prototype.forEach.call(root.querySelectorAll('[data-colour]'), function (b) {
        b.setAttribute('aria-pressed', String(b === sw));
      });
      var val = document.getElementById('colour-val');
      if (val) val.textContent = sel.colour;
      showColourImage(sel.colour);
      return;
    }

    /* size */
    var sz = e.target.closest('[data-size]');
    if (sz && !sz.disabled) {
      sel.size = sz.getAttribute('data-size');
      Array.prototype.forEach.call(root.querySelectorAll('[data-size]'), function (b) {
        b.setAttribute('aria-pressed', String(b === sz));
      });
      if (sizeError) sizeError.hidden = true;
      return;
    }

  });

  /* the accordion behaviour is shared with the help centre — see app.js */
  V.bindAccordion(root);

  V.mountHelpBox(document.getElementById('pdp-help'), ['times', 'window'], {
    title: 'Before you order'
  });

  /* the profile can also be changed from the collection page in another tab */
  document.addEventListener('vola:fit', repaintFit);

  /* add to bag ----------------------------------------------------------- */
  var addBtn = document.getElementById('add');
  var addRevertTimer = null;
  addBtn.addEventListener('click', function () {
    if (!sel.size) {
      sizeError.hidden = false;
      var first = root.querySelector('[data-size]:not([disabled])');
      if (first) first.focus();
      return;
    }
    /* a click that lands while the previous "Added" confirmation is still
       settling shouldn't have that timer stomp its own fresh state later */
    clearTimeout(addRevertTimer);
    addBtn.classList.remove('btn--success');
    /* async-shaped: disable + spinner so a slow network cannot double-submit */
    addBtn.disabled = true;
    addBtn.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span>Adding…';
    setTimeout(function () {
      V.cart.add(product.id, sel.size, sel.colour, 1);
      addBtn.disabled = false;
      addBtn.classList.add('btn--success');
      addBtn.innerHTML = V.icon('check') + 'Added';
      V.toast(product.name + ' added to your bag', {
        label: 'View bag',
        onClick: function () { if (V.openCart) V.openCart(); }
      });
      /* the label change already announces via the toast; this is purely
         the button settling back to its resting state */
      addRevertTimer = setTimeout(function () {
        addBtn.classList.remove('btn--success');
        addBtn.textContent = 'Add to bag';
      }, 1500);
    }, 380);
  });

  /* ---------------------------------------------------------- you may also */
  /* Recommending a piece nobody can buy, or one that does not come in the
     size this visitor takes, wastes the best four slots on the page. Rank by
     what is actually orderable for this person, keeping the original
     category-or-colour relevance rule as the reason for being here at all. */
  var also = V.products.filter(function (p) {
    if (p.id === product.id) return false;
    if (!(p.category === product.category || p.colour === product.colour)) return false;
    /* nothing left in any size is not a recommendation */
    return p.sizes.length > p.soldOut.length;
  }).sort(function (a, b) {
    return score(b) - score(a);
  }).slice(0, 4);

  function score(p) {
    var s = 0;
    if (V.fit.canSize(p) && V.fit.fitsProfile(p)) s += 2;   /* in your size */
    if (p.category === product.category) s += 1;            /* same discipline */
    return s;
  }

  if (also.length) {
    document.getElementById('also-wrap').hidden = false;
    var host = document.getElementById('also');
    host.innerHTML = also.map(V.cardWithFit).join('');
    V.stagger(host.querySelectorAll('.card'));
  }
})();
