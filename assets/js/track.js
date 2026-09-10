/* VOLÀ — order tracking.

   With no accounts, an order-number lookup is the entire post-purchase
   experience — and post-purchase silence generates most of the customer
   service contact in this category. It matters more here than for most
   shops, because a made-to-order piece legitimately takes six weeks and a
   tracker that says "processing" for a month is how somebody decides they
   have been forgotten.

   There are no orders behind it. See the header of orders.js. */
(function () {
  'use strict';

  var V = window.VOLA, esc = V.esc;
  var O = V.orders;

  var form = document.getElementById('track-form');
  var result = document.getElementById('track-result');
  var lookupWrap = document.getElementById('track-lookup');

  var RULES = {
    number: { label: 'Order number', check: function (v) {
      return O.normalise(v) ? null : 'Order numbers look like VOLA-123456 — it is at the top of your confirmation email.'; } },
    email: { label: 'Email', check: function (v) {
      return V.auth && V.auth.validEmail(v) ? null
        : 'Enter the email address you placed the order with.'; } }
  };

  function checkField(id) {
    var el = document.getElementById(id);
    var err = document.getElementById(id + '-err');
    var problem = RULES[id].check(el.value);
    if (problem) {
      el.setAttribute('aria-invalid', 'true');
      err.hidden = false;
      err.innerHTML = V.icon('alert') + '<span>' + esc(problem) + '</span>';
      return false;
    }
    el.removeAttribute('aria-invalid');
    err.hidden = true;
    err.innerHTML = '';
    return true;
  }

  function showStatus(msg, kind) {
    var el = document.getElementById('track-status');
    el.hidden = false;
    el.className = 'authstatus' + (kind ? ' is-' + kind : '');
    el.innerHTML = (kind === 'ok' ? V.icon('check') : V.icon('alert')) +
      '<span>' + msg + '</span>';
  }
  function hideStatus() {
    var el = document.getElementById('track-status');
    el.hidden = true; el.innerHTML = '';
  }

  function fmt(d) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function fmtShort(d) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  /* ------------------------------------------------------------ rendering */

  function timeline(order) {
    var reached = true;
    var currentIndex = order.stages.map(function (s) { return s.id; }).indexOf(order.current.id);

    return '<ol class="track">' + order.stages.map(function (s, i) {
      var done = i < currentIndex;
      var now = i === currentIndex;
      var when = new Date(order.placedAt.getTime() + s.at * 86400000);
      void reached;
      return '<li class="track__step' + (done ? ' is-done' : now ? ' is-now' : '') + '"' +
          (now ? ' aria-current="step"' : '') + '>' +
        '<span class="track__mark" aria-hidden="true"></span>' +
        '<p class="track__when num">' +
          (done || now ? fmtShort(when) : 'Expected ' + fmtShort(when)) + '</p>' +
        '<h3 class="track__label">' + esc(s.label) +
          (now ? '<span class="track__badge">Now</span>' : '') + '</h3>' +
        '<p class="track__body">' + esc(s.body) + '</p>' +
      '</li>';
    }).join('') + '</ol>';
  }

  function linesMarkup(order) {
    return order.lines.map(function (l) {
      var p = V.byId(l.id);
      if (!p) return '';
      var mto = p.tag === 'atelier';
      return '<article class="line" style="grid-template-columns:84px 1fr">' +
        '<a class="line__media" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
          '<img src="' + p.image + '" alt="" width="84" height="105" loading="lazy"></a>' +
        '<div class="line__body">' +
          '<h3 class="line__name"><a href="product.html?id=' + encodeURIComponent(p.id) + '">' +
            esc(p.name) + '</a></h3>' +
          '<p class="line__meta">' + esc(l.colour) + ' &middot; Size ' + esc(l.size) + '</p>' +
          (mto ? '<p class="line__flag">' + V.icon('alert') +
            '<span>Made to order &mdash; final sale</span></p>' : '') +
          '<p class="line__meta">' + V.money(p.price * l.qty) + '</p>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function returnsMarkup(order) {
    var r = O.returnable(order);

    if (!order.delivered) {
      return '<div class="trackpanel">' +
        '<h3 class="trackpanel__title">Returns</h3>' +
        '<p>' + esc(r.reason) + ' You will have ' + V.terms.returnsDays +
          ' days from the day it arrives.</p>' +
        '<a class="link-u" href="help.html#returns">How returns work</a>' +
      '</div>';
    }

    var excluded = r.excluded.length
      ? '<p class="trackpanel__warn">' + V.icon('alert') + '<span>' +
          (r.excluded.length === 1 ? 'One piece is' : r.excluded.length + ' pieces are') +
          ' made to order and cannot be returned: ' +
          r.excluded.map(function (p) { return esc(p.name); }).join(', ') +
          '. This was stated on the product page and in your bag.</span></p>'
      : '';

    if (!r.open) {
      return '<div class="trackpanel">' +
        '<h3 class="trackpanel__title">Returns</h3>' +
        (r.reason ? '<p>' + esc(r.reason) + '</p>' : '') +
        (r.eligible.length === 0 && r.excluded.length
          ? '<p>Everything in this order was made to order.</p>' : '') +
        excluded +
        '<p>A piece can still be <a href="care.html">repaired free, for life</a>, whether or ' +
          'not it can be returned.</p>' +
      '</div>';
    }

    return '<div class="trackpanel">' +
      '<h3 class="trackpanel__title">Returns</h3>' +
      '<p><strong>' + r.daysLeft + (r.daysLeft === 1 ? ' day' : ' days') + ' left</strong> to ' +
        'return ' + (r.eligible.length === 1 ? 'this piece' : r.eligible.length + ' of these pieces') +
        ', unworn with the tag attached.</p>' +
      excluded +
      '<a class="btn btn--ghost" href="contact.html?subject=order">Start a return</a>' +
    '</div>';
  }

  function render(order) {
    var eta = order.delivered
      ? 'Delivered ' + fmt(order.deliveredAt)
      : 'Expected ' + fmtShort(order.etaFrom) + ' – ' + fmt(order.etaTo);

    result.innerHTML =
      '<div class="trackhead">' +
        '<div>' +
          '<p class="eyebrow">Order ' + esc(order.number) + '</p>' +
          '<h2 class="display display--xl">' + esc(order.current.label) + '</h2>' +
          '<p class="lede" style="font-size:1rem">' + esc(eta) + ' &middot; ' +
            esc(order.country) + '</p>' +
        '</div>' +
        '<button class="link-u" type="button" id="track-again">Track another order</button>' +
      '</div>' +

      timeline(order) +

      '<div class="trackgrid">' +
        '<div>' +
          '<h3 class="trackpanel__title">In this order</h3>' +
          linesMarkup(order) +
          '<div class="totals" style="margin-top:var(--space-4)">' +
            '<div class="totals__row"><span>Subtotal</span><span class="num">' +
              V.money(order.subtotal) + '</span></div>' +
            '<div class="totals__row"><span>Express shipping</span><span class="num">' +
              (order.shipping === 0 ? 'Complimentary' : V.money(order.shipping)) + '</span></div>' +
            '<div class="totals__row totals__row--grand"><span>Total</span><strong class="num">' +
              V.money(order.total) + '</strong></div>' +
          '</div>' +
        '</div>' +

        '<div class="trackside">' +
          '<div class="trackpanel">' +
            '<h3 class="trackpanel__title">Delivery</h3>' +
            '<dl class="trackfacts">' +
              '<div><dt>Placed</dt><dd class="num">' + fmt(order.placedAt) + '</dd></div>' +
              '<div><dt>Destination</dt><dd>' + esc(order.country) + '</dd></div>' +
              '<div><dt>Window</dt><dd>' + esc(V.delivery.window(order.zone)) + '</dd></div>' +
              '<div><dt>Carrier</dt><dd>' + esc(order.carrier) + '</dd></div>' +
            '</dl>' +
            (order.tracking
              ? '<p class="trackcode">Tracking <span class="num">' + esc(order.tracking) + '</span></p>' +
                '<p class="field__hint" style="text-transform:none;letter-spacing:0">' +
                'The carrier link goes here once the API is wired.</p>'
              : '<p class="field__hint" style="text-transform:none;letter-spacing:0">' +
                'A tracking number appears here the moment the carrier has it.</p>') +
          '</div>' +
          returnsMarkup(order) +
        '</div>' +
      '</div>';

    lookupWrap.hidden = true;
    result.hidden = false;
    result.focus();

    document.getElementById('track-again').addEventListener('click', function () {
      result.hidden = true;
      result.innerHTML = '';
      lookupWrap.hidden = false;
      hideStatus();
      document.getElementById('number').focus();
    });
  }

  /* --------------------------------------------------------------- events */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideStatus();

    var bad = Object.keys(RULES).filter(function (id) { return !checkField(id); });
    if (bad.length) {
      document.getElementById(bad[0]).focus();
      return;
    }

    var btn = document.getElementById('track-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span>Looking…';

    O.lookup(document.getElementById('number').value, document.getElementById('email').value)
      .then(function (order) {
        btn.disabled = false;
        btn.textContent = 'Find my order';
        render(order);
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = 'Find my order';
        /* one message for every failure, so a real order number with the
           wrong email is indistinguishable from a number that does not exist */
        showStatus(esc(err.message) +
          ' <a href="contact.html?subject=order">Write to us</a> and we will find it.', 'warn');
      });
  });

  Object.keys(RULES).forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('blur', function () {
      if (el.value.trim() !== '' || el.getAttribute('aria-invalid') === 'true') checkField(id);
    });
    el.addEventListener('input', function () {
      if (el.getAttribute('aria-invalid') === 'true') checkField(id);
    });
  });

  /* A link from a confirmation email can carry both, so the page answers
     rather than asking again. */
  (function fromLink() {
    var p = new URLSearchParams(location.search);
    var n = p.get('order'), m = p.get('email');
    if (n) document.getElementById('number').value = n;
    if (m) document.getElementById('email').value = m;
    if (n && m) form.dispatchEvent(new Event('submit'));
  })();
})();
