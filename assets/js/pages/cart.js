/* VOLÀ — bag page: line editing, totals, delivery form validation.

   The bag is the last screen before money changes hands, so it is where the
   things the rest of the site knows have to be said out loud: which of these
   pieces cannot be returned, whether the size chosen is the size this person
   usually takes, and when the parcel will actually arrive. */
(function () {
  'use strict';

  var V = window.VOLA;
  var esc = V.esc;

  var lines   = document.getElementById('lines');
  var totals  = document.getElementById('totals');
  var aside   = document.getElementById('summary-aside');
  var section = document.getElementById('checkout-section');
  var summary = document.getElementById('bag-summary');
  var shipNote = document.getElementById('ship-note');
  var termsNote = document.getElementById('terms-note');
  var countryEl = document.getElementById('country');
  var etaEl = document.getElementById('delivery-eta');

  /* Final sale is decided by the merchandising line, the same rule the
     collection filter and the product page use. */
  function isFinalSale(p) { return p.tag === 'atelier'; }

  /* Said on the line, not only in the small print at the bottom. A piece that
     cannot come back is a different purchase from one that can, and the bag
     is the last place to make that plain. */
  function finalSaleFlag(p) {
    if (!isFinalSale(p)) return '';
    return '<p class="line__flag">' + V.icon('alert') +
      '<span>Made to order &mdash; final sale, not returnable</span></p>';
  }

  /* A quiet second opinion where a wrong size costs the most. It compares the
     size in the bag with what this piece recommends for the saved profile,
     which is the piece-specific answer — the same number the product page
     showed — so the two cannot disagree. Never blocks, never nags twice. */
  function sizeCheck(p, line) {
    if (!V.fit.canSize(p)) return '';
    var rec = V.fit.recommend(p);
    if (!rec || !rec.exact || rec.size === line.size) return '';
    return '<p class="line__note">' + V.icon('ruler') +
      '<span>You usually take a ' + esc(rec.size) + ' in this cut. ' +
      '<a href="product.html?id=' + encodeURIComponent(p.id) + '">Change size</a></span></p>';
  }

  /* --------------------------------------------------------------- render */
  function render() {
    var items = V.cart.items;
    var n = V.cart.count();

    summary.textContent = n === 0
      ? 'Nothing in your bag yet.'
      : n + (n === 1 ? ' piece' : ' pieces') + ' · ' + V.money(V.cart.subtotal());

    if (!items.length) {
      aside.hidden = true;
      section.hidden = true;
      /* the panel is hidden, but leaving last order's terms sitting in it is
         how a stale line ends up on screen the next time something unhides */
      if (termsNote) { termsNote.textContent = ''; termsNote.className = 'terms-note'; }
      lines.innerHTML =
        '<div class="empty">' +
          '<span class="empty__icon">' + V.icon('bag') + '</span>' +
          '<p class="display display--lg">Your bag is empty</p>' +
          '<p class="lede" style="font-size:1rem;max-width:42ch">' +
            'Nothing chosen yet. Every piece is cut by hand and made in small numbers.</p>' +
          '<a class="btn btn--primary" href="shop.html">Browse the collection</a>' +
        '</div>';
      return;
    }

    aside.hidden = false;
    section.hidden = false;

    lines.innerHTML = items.map(function (l) {
      var p = V.byId(l.id);
      if (!p) return '';
      var k = V.cart.key(l.id, l.size, l.colour);
      return '<article class="line" style="grid-template-columns:110px 1fr">' +
        '<a class="line__media" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
          '<img src="' + p.image + '" alt="' + esc(p.alt) + '" width="110" height="138" loading="lazy"></a>' +
        '<div class="line__body">' +
          '<h3 class="line__name"><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a></h3>' +
          '<p class="line__meta">' + esc(l.colour) + ' &middot; Size ' + esc(l.size) + ' &middot; ' + esc(V.catLabel(p.category)) + '</p>' +
          '<p class="line__meta">' + V.money(p.price) + ' each</p>' +
          sizeCheck(p, l) +
          finalSaleFlag(p) +
          '<div class="line__row">' +
            V.qtyControl(k, l.qty, p.name) +
            '<span class="line__price num">' + V.money(p.price * l.qty) + '</span>' +
          '</div>' +
          '<button type="button" class="line__remove" data-remove="' + esc(k) + '">' +
            'Remove<span class="sr-only"> ' + esc(p.name) + ', size ' + esc(l.size) + '</span></button>' +
        '</div>' +
      '</article>';
    }).join('');

    var sub = V.cart.subtotal();
    var ship = V.cart.shipping();

    totals.innerHTML =
      '<div class="totals__row"><span>Subtotal</span><span class="num">' + V.money(sub) + '</span></div>' +
      '<div class="totals__row"><span>Express shipping</span><span class="num">' +
        (ship === 0 ? 'Complimentary' : V.money(ship)) + '</span></div>' +
      '<div class="totals__row"><span>Duties &amp; taxes</span><span>Settled at delivery</span></div>' +
      '<div class="totals__row totals__row--grand"><span>Total</span>' +
        '<strong class="num">' + V.money(sub + ship) + '</strong></div>';

    var remaining = V.cart.freeShipThreshold - sub;
    shipNote.textContent = remaining > 0
      ? 'Add ' + V.money(remaining) + ' for complimentary express shipping.'
      : 'Complimentary express shipping applied to this order.';

    renderTerms(items);
  }

  /* What this particular bag can and cannot do, rather than a blanket
     returns policy that is only true of some of it. */
  function renderTerms(items) {
    if (!termsNote) return;
    var final = items.filter(function (l) {
      var p = V.byId(l.id);
      return p && isFinalSale(p);
    });
    var returnable = items.length - final.length;

    if (!final.length) {
      termsNote.innerHTML = '<span>' + V.terms.returnsDays +
        ' days to return anything in this bag, unworn with the tag attached. ' +
        '<a href="help.html#returns">How returns work</a>.</span>';
      termsNote.className = 'terms-note';
      return;
    }
    termsNote.className = 'terms-note terms-note--warn';
    termsNote.innerHTML = V.icon('alert') + '<span>' +
      (final.length === 1 ? 'One piece here is' : final.length + ' pieces here are') +
      ' made to order and <strong>cannot be returned</strong>' +
      (returnable
        ? '. The other ' + (returnable === 1 ? 'one has' : returnable + ' have') + ' ' +
          V.terms.returnsDays + ' days.'
        : '.') +
      ' <a href="help.html#returns">How returns work</a>.' +
      '</span>';
  }

  /* ------------------------------------------------------ delivery window */
  /* The atelier page promises delivery times in a sentence nobody reads at
     checkout. This is that same promise, for the country actually chosen,
     next to the field where it is chosen. */
  function fillCountries() {
    if (!countryEl) return;
    countryEl.insertAdjacentHTML('beforeend', V.delivery.countries().map(function (c) {
      return '<option>' + esc(c) + '</option>';
    }).join(''));
  }

  function renderEta() {
    if (!etaEl || !countryEl) return;
    if (!countryEl.value) { etaEl.hidden = true; etaEl.textContent = ''; return; }
    var zone = V.delivery.zoneFor(countryEl.value);
    etaEl.hidden = false;
    etaEl.textContent = 'Express delivery to ' + countryEl.value + ' takes ' +
      V.delivery.window(zone) + ' once your order leaves the atelier.';
  }

  V.bindLineActions(lines, render);
  document.addEventListener('vola:cart', render);
  /* a profile saved in another tab changes what the size check says */
  document.addEventListener('vola:fit', render);
  fillCountries();
  render();
  renderEta();

  /* Duties are settled at delivery and that surprises people after they have
     paid, so the answer sits beside the checkout button rather than a page
     away. Same three answers whether or not the bag is empty — the questions
     are about ordering, not about what is in it. */
  V.mountHelpBox(document.getElementById('cart-help'),
    ['duties', 'change-order', 'window'], { title: 'Before you pay' });

  /* Smooth-scroll the summary CTA to the form and focus its first field. */
  document.getElementById('to-checkout').addEventListener('click', function (e) {
    e.preventDefault();
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { document.getElementById('first').focus(); }, 320);
  });

  /* ----------------------------------------------------------- validation */
  var form = document.getElementById('checkout');
  var errSummary = document.getElementById('err-summary');
  var errList = document.getElementById('err-list');
  var submitBtn = document.getElementById('co-submit');

  var RULES = {
    first:    { label: 'First name',   msg: 'Enter your first name.' },
    last:     { label: 'Last name',    msg: 'Enter your last name.' },
    email:    { label: 'Email',        msg: 'Enter an email address in the format name@example.com.' },
    address:  { label: 'Street address', msg: 'Enter your street address.' },
    city:     { label: 'City',         msg: 'Enter your city.' },
    postcode: { label: 'Postal code',  msg: 'Enter your postal code.' },
    country:  { label: 'Country',      msg: 'Choose your country.' }
  };

  function validateField(id) {
    var el = document.getElementById(id);
    var err = document.getElementById(id + '-err');
    var ok = el.checkValidity() && el.value.trim() !== '';
    if (ok) {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
      err.hidden = true;
      err.innerHTML = '';
    } else {
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', id + '-err');
      err.hidden = false;
      err.innerHTML = V.icon('alert') + '<span>' + esc(RULES[id].msg) + '</span>';
    }
    return ok;
  }

  /* Validate on blur, not on keystroke — never scold mid-typing. */
  Object.keys(RULES).forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('blur', function () {
      if (el.value.trim() !== '' || el.getAttribute('aria-invalid') === 'true') validateField(id);
    });
    el.addEventListener('input', function () {
      if (el.getAttribute('aria-invalid') === 'true') validateField(id);
    });
  });

  if (countryEl) countryEl.addEventListener('change', renderEta);

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var bad = Object.keys(RULES).filter(function (id) { return !validateField(id); });

    if (bad.length) {
      errList.innerHTML = bad.map(function (id) {
        return '<li><a href="#' + id + '">' + esc(RULES[id].label) + ' — ' + esc(RULES[id].msg) + '</a></li>';
      }).join('');
      errSummary.hidden = false;
      errSummary.focus();             /* WCAG 2.2: focus the linked summary */
      return;
    }

    errSummary.tabIndex = -1;
    errSummary.hidden = true;
    goToCheckout();
  });

  /* ------------------------------------------------------------ checkout */
  /* With a store connected this hands off to Shopify's hosted checkout,
     which is where the address and the card are collected. Without one it
     stops here, as it always has. Card fields never exist on this site. */
  function goToCheckout() {
    /* Counted on the attempt, not on success: a checkout that fails to start
       is the one worth knowing about, and completion happens on Shopify's
       domain where this site cannot see it anyway. */
    if (V.track) V.track('Begin checkout', { lines: V.cart.items.length });
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span>Securing your order…';

    if (!(V.shopify && V.shopify.configured())) {
      setTimeout(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue to payment';
        V.toast('Details saved. Payment is not connected on this preview.');
      }, 700);
      return;
    }

    V.shopify.createCheckout({
      email: (document.getElementById('email') || {}).value || undefined,
      note: (document.getElementById('notes') || {}).value || undefined,
      fit: V.fit && V.fit.summaryLine ? V.fit.summaryLine() : ''
    }).then(function (cart) {
      /* leaving the site, so leave the bag alone — Shopify's checkout is the
         authority from here and a shopper who backs out still has it */
      location.href = cart.checkoutUrl;
    }).catch(function (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue to payment';
      errList.innerHTML = '<li>' + esc(err.message) + '</li>';
      errSummary.hidden = false;
      errSummary.focus();
    });
  }

  /* When Shopify is connected it collects the delivery address itself, so
     asking for one here would be asking twice. The form is replaced by the
     hand-off rather than duplicated. */
  (function checkoutMode() {
    if (!(V.shopify && V.shopify.configured())) return;
    var grid = form.querySelector('.form-grid');
    if (!grid) return;

    /* keep the two fields that Shopify cannot infer and that the atelier
       genuinely wants: the email for the confirmation, and the note */
    Array.prototype.forEach.call(grid.querySelectorAll('.field'), function (f) {
      var input = f.querySelector('input, select, textarea');
      if (!input) return;
      if (input.id === 'email' || input.id === 'notes') return;
      f.hidden = true;
      input.removeAttribute('required');
      delete RULES[input.id];
    });

    var note = document.createElement('p');
    note.className = 'field__hint';
    note.style.cssText = 'text-transform:none;letter-spacing:0';
    note.textContent = 'Delivery address and payment are collected on the next step, on ' +
      'Shopify’s secure checkout.';
    grid.parentNode.insertBefore(note, grid.nextSibling);
    submitBtn.textContent = 'Continue to checkout';
  })();

  /* Error-summary links focus the field, not just the anchor. */
  errList.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  });
})();
