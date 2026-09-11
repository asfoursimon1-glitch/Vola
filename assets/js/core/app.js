/* VOLÀ — shared application layer.
   Cart store (localStorage) · cart drawer · toasts · nav · scroll reveal.
   No dependencies. */
(function () {
  'use strict';

  var VOLA = (window.VOLA = window.VOLA || {});
  var CART_KEY = 'vola.bag.v1';

  /* The three numbers the house promises out loud. They were written into six
     announcement bars, two product-page blocks and the atelier copy, and
     computed separately in the bag — nine places to change a shipping
     threshold, which is nine chances to leave one saying the old figure.
     Everything reads from here now; see paintTerms() below. */
  var TERMS = VOLA.terms = {
    freeShipOver: 500,
    flatShipping: 25,
    returnsDays: 30
  };
  var FREE_SHIP = TERMS.freeShipOver;

  /* The house itself: the address in the footer of every page, the hours the
     contact page quotes, the reply promise made twice on that page in two
     different sentences, and the made-to-measure prices. Same reasoning as
     TERMS — these are facts about one business, and one business should only
     have to state them once.

     These are the placeholder details the README says to replace before
     launch. Replacing them is now a single edit here. */
  var HOUSE = VOLA.house = {
    street: 'Via dei Fossi 14',
    postcode: '50123',
    city: 'Firenze',
    cityEn: 'Florence',
    province: 'FI',
    country: 'Italy',
    email: 'atelier@vola.example',
    phone: '+39 055 000 0000',
    openDays: 'Tuesday – Saturday',
    openHours: '10:00 – 18:00 CET',
    founded: 2016,
    replyWithin: 'one working day',
    fittings: 2,
    fittingWeeks: 6
    /* made-to-measure prices live on VOLA.disciplines in data.js, beside the
       ready-to-wear categories they are quoted against */
  };
  /* tel: hrefs want the number with nothing but digits and a leading + */
  HOUSE.phoneHref = HOUSE.phone.replace(/[^\d+]/g, '');

  /* Where we ship and how long it takes. The atelier page promises these
     windows in a sentence; the bag needs them per country, at the moment
     someone picks one. Both now come from here, and the country list on the
     checkout form is built from it — a country we cannot quote a time for has
     no business being in the dropdown. */
  var DELIVERY = VOLA.delivery = {
    /* `where` is the whole prepositional phrase, not a bare place name: one
       zone wants "in Europe" and the other wants "elsewhere", and gluing an
       "in" on in the template produces "in elsewhere". */
    zones: [
      { id: 'eu', where: 'in Europe', min: 2, max: 4,
        countries: ['France', 'Germany', 'Italy', 'United Kingdom'] },
      { id: 'row', where: 'elsewhere', min: 3, max: 6,
        countries: ['Australia', 'Canada', 'Japan', 'United Arab Emirates', 'United States'] }
    ],

    /* every country we list, alphabetically, whichever zone it sits in */
    countries: function () {
      return DELIVERY.zones.reduce(function (all, z) {
        return all.concat(z.countries || []);
      }, []).sort();
    },

    zoneFor: function (country) {
      var hit = null;
      DELIVERY.zones.forEach(function (z) {
        if (z.countries && z.countries.indexOf(country) > -1) hit = z;
      });
      /* an unlisted country falls to the slowest window rather than to none */
      return hit || DELIVERY.zones[DELIVERY.zones.length - 1];
    },

    /* "two to four working days" — spelled out for prose, digits for the
       bag, where it sits beside other numbers */
    window: function (zone, asWords) {
      return asWords
        ? VOLA.numberWord(zone.min) + ' to ' + VOLA.numberWord(zone.max) + ' working days'
        : zone.min + '–' + zone.max + ' working days';
    }
  };

  /* ------------------------------------------------------------- utilities */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function money(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  VOLA.money = money;

  function byId(id) { return VOLA.products.filter(function (p) { return p.id === id; })[0]; }
  VOLA.byId = byId;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  VOLA.esc = esc;

  /* ---------------------------------------------------------------- icons */
  /* Phosphor-style outline set, inlined so there is no icon-font flash.
     Decorative uses get aria-hidden; interactive controls carry the label. */
  var PATHS = {
    bag: '<path d="M56 72h144l16 144H40Z"/><path d="M92 72a36 36 0 0 1 72 0"/>',
    menu: '<path d="M40 72h176M40 128h176M40 184h176"/>',
    close: '<path d="M64 64l128 128M192 64L64 192"/>',
    search: '<circle cx="116" cy="116" r="60"/><path d="M158 158l50 50"/>',
    plus: '<path d="M40 128h176M128 40v176"/>',
    minus: '<path d="M40 128h176"/>',
    check: '<path d="M216 72L104 184l-56-56"/>',
    arrow: '<path d="M40 128h160M144 72l56 56-56 56"/>',
    alert: '<circle cx="128" cy="128" r="88"/><path d="M128 80v56M128 172h.1"/>',
    scissors: '<circle cx="72" cy="188" r="28"/><circle cx="184" cy="188" r="28"/><path d="M60 44l104 124M196 44L92 168"/>',
    leaf: '<path d="M48 208C24 128 72 48 208 48c0 136-80 184-160 160Z"/><path d="M120 136l88-88"/>',
    truck: '<path d="M16 72h136v104H16zM152 104h40l32 40v32h-72z"/><circle cx="76" cy="196" r="20"/><circle cx="188" cy="196" r="20"/>',
    box: '<path d="M32 76l96-44 96 44v104l-96 44-96-44Z"/><path d="M128 120v104M32 76l96 44 96-44"/>',
    ruler: '<path d="M28 100h200v56H28Z"/><path d="M68 100v24M108 100v32M148 100v24M188 100v32"/>',
    pin: '<path d="M128 232s84-72 84-132a84 84 0 1 0-168 0c0 60 84 132 84 132Z"/><circle cx="128" cy="100" r="32"/>',
    instagram: '<rect x="40" y="40" width="176" height="176" rx="44"/><circle cx="128" cy="128" r="40"/><path d="M180 76h.1"/>',
    pinterest: '<circle cx="128" cy="128" r="96"/><path d="M120 152l-16 60M104 168c-8-12-8-32 4-48 14-18 44-20 58-6 16 16 10 52-10 62-12 6-26 2-32-8"/>',
    tiktok: '<path d="M168 40c4 32 24 50 56 52v40c-22 2-42-6-56-18v58a66 66 0 1 1-66-66c4 0 8 0 12 1v42a26 26 0 1 0 18 25V40Z"/>'
  };

  function icon(name, opts) {
    opts = opts || {};
    var label = opts.label;
    return '<svg class="icon" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="14" ' +
      'stroke-linecap="round" stroke-linejoin="round" ' +
      (label ? 'role="img" aria-label="' + esc(label) + '"' : 'aria-hidden="true" focusable="false"') +
      '>' + PATHS[name] + '</svg>';
  }
  VOLA.icon = icon;

  /* ---------------------------------------------------------------- store */
  function read() {
    var v;
    try {
      var raw = localStorage.getItem(CART_KEY);
      v = raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }   /* private mode / blocked storage */
    if (!Array.isArray(v)) return [];
    /* A bag can outlive the catalogue. Without this, a retired piece still
       counts towards the badge but contributes nothing to the subtotal.
       Only prune when the catalogue actually loaded — otherwise a failed
       product fetch would empty a real bag on the next write. */
    var known = VOLA.products && VOLA.products.length;
    return v.filter(function (l) {
      return l && typeof l.id === 'string' && (!known || byId(l.id));
    });
  }

  function write(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* non-fatal */ }
    cart.items = items;
    document.dispatchEvent(new CustomEvent('vola:cart', { detail: items }));
  }

  var cart = VOLA.cart = {
    items: read(),
    key: function (id, size, colour) { return id + '::' + size + '::' + colour; },
    count: function () {
      return cart.items.reduce(function (n, l) { return n + l.qty; }, 0);
    },
    subtotal: function () {
      return cart.items.reduce(function (n, l) {
        var p = byId(l.id);
        return n + (p ? p.price * l.qty : 0);
      }, 0);
    },
    shipping: function () {
      var s = cart.subtotal();
      return s === 0 || s >= FREE_SHIP ? 0 : TERMS.flatShipping;
    },
    total: function () { return cart.subtotal() + cart.shipping(); },
    freeShipThreshold: FREE_SHIP,
    add: function (id, size, colour, qty) {
      qty = qty || 1;
      var items = read();
      var k = cart.key(id, size, colour);
      var line = items.filter(function (l) { return cart.key(l.id, l.size, l.colour) === k; })[0];
      if (line) { line.qty = Math.min(line.qty + qty, 10); }
      else { items.push({ id: id, size: size, colour: colour, qty: qty }); }
      write(items);
      /* The piece and the size, which are facts about the catalogue. Not who
         added it, and not what else they have looked at. */
      if (VOLA.track) VOLA.track('Add to bag', { piece: id, size: size });
    },
    setQty: function (k, qty) {
      var items = read().map(function (l) {
        if (cart.key(l.id, l.size, l.colour) === k) l.qty = Math.max(1, Math.min(10, qty));
        return l;
      });
      write(items);
    },
    remove: function (k) {
      var items = read(), removed = null, idx = -1;
      items.forEach(function (l, i) {
        if (cart.key(l.id, l.size, l.colour) === k) { removed = l; idx = i; }
      });
      if (idx > -1) items.splice(idx, 1);
      write(items);
      return { line: removed, index: idx };
    },
    restore: function (line, index) {
      var items = read();
      items.splice(index < 0 ? items.length : index, 0, line);
      write(items);
    },
    clear: function () { write([]); }
  };

  /* --------------------------------------------------------------- toasts */
  var toastHost;
  function toast(message, action) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toasts';
      /* polite + non-focus-stealing: announced, never interrupts */
      toastHost.setAttribute('role', 'status');
      toastHost.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastHost);
    }
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = icon('check') + '<span>' + esc(message) + '</span>';
    if (action) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast__action';
      btn.textContent = action.label;
      btn.addEventListener('click', function () { action.onClick(); dismiss(); });
      el.appendChild(btn);
    }
    toastHost.appendChild(el);
    var timer = setTimeout(dismiss, action ? 6000 : 4000);
    function dismiss() {
      clearTimeout(timer);
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    return dismiss;
  }
  VOLA.toast = toast;

  /* A single polite region for state changes that are not toasts. Cleared
     between messages so an identical repeat still gets announced. */
  var liveRegion;
  function announce(message) {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = '';
    setTimeout(function () { liveRegion.textContent = message; }, 60);
  }
  VOLA.announce = announce;

  /* ------------------------------------------------------- focus trapping */
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
                  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function trap(container, e) {
    var nodes = Array.prototype.filter.call(
      container.querySelectorAll(FOCUSABLE),
      function (n) { return n.offsetParent !== null || n === document.activeElement; }
    );
    if (!nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* Generic overlay controller: drawer / mobile menu.
     Handles open + close, Esc, focus trap, focus restore, scroll lock. */
  function overlay(panel, scrim, opener) {
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      if (scrim) { scrim.hidden = false; }
      panel.hidden = false;
      /* force a frame so the transition runs from the hidden state */
      requestAnimationFrame(function () {
        if (scrim) scrim.dataset.open = 'true';
        panel.dataset.open = 'true';
      });
      document.body.classList.add('is-locked');
      if (opener) opener.setAttribute('aria-expanded', 'true');
      var target = panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE);
      if (target) target.focus();
      document.addEventListener('keydown', onKey, true);
    }

    function close() {
      panel.dataset.open = 'false';
      if (scrim) scrim.dataset.open = 'false';
      document.body.classList.remove('is-locked');
      if (opener) opener.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKey, true);
      var ms = reduceMotion.matches ? 0 : 420;
      setTimeout(function () {
        if (panel.dataset.open !== 'true') {
          panel.hidden = true;
          if (scrim) scrim.hidden = true;
        }
      }, ms);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') { trap(panel, e); }
    }

    if (scrim) scrim.addEventListener('click', close);
    Array.prototype.forEach.call(panel.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', close);
    });
    return { open: open, close: close };
  }
  VOLA.overlay = overlay;

  /* -------------------------------------------------------- form fields */
  /* One labelled field, with its hint and its error slot, built the same way
     on every form. Shared because the account and register pages are two
     halves of one flow and a field that behaves differently between them is
     a field somebody will file a bug about.

     Password fields get a reveal control rather than a confirm field: a
     second box to retype into raises abandonment and catches fewer mistakes
     than simply letting people look at what they typed. */
  VOLA.formField = function (o) {
    var req = o.required === false
      ? ' <span class="field__hint">Optional</span>'
      : ' <span class="req" aria-hidden="true">*</span>';
    var described = o.describedby ? 'aria-describedby="' + o.describedby + '" ' : '';
    var required = o.required === false ? '' : 'required';

    var control = o.password
      ? '<div class="pwfield">' +
          '<input class="input" id="' + o.id + '" name="' + o.id + '" type="password" ' +
            'autocomplete="' + o.autocomplete + '" ' + described + required + '>' +
          '<button class="pwfield__toggle" type="button" data-toggle="' + o.id + '" ' +
            'aria-pressed="false" aria-label="Show password">' +
            '<span aria-hidden="true">Show</span></button>' +
        '</div>'
      : '<input class="input" id="' + o.id + '" name="' + o.id + '" ' +
          'type="' + (o.type || 'text') + '" ' +
          (o.inputmode ? 'inputmode="' + o.inputmode + '" ' : '') +
          'autocomplete="' + o.autocomplete + '" ' + described +
          (o.value ? 'value="' + esc(o.value) + '" ' : '') + required + '>';

    return '<div class="field">' +
      '<label class="field__label" for="' + o.id + '">' + o.label + req + '</label>' +
      control +
      (o.hint ? '<p class="field__hint" id="' + o.id + '-hint" ' +
        'style="text-transform:none;letter-spacing:0">' + o.hint + '</p>' : '') +
      '<p class="field__error" id="' + o.id + '-err" hidden></p>' +
    '</div>';
  };

  /* The reveal control, delegated so it survives a re-render. Bound once per
     form root by whoever renders the fields. */
  VOLA.bindPasswordToggles = function (root) {
    root.addEventListener('click', function (e) {
      var tg = e.target.closest('[data-toggle]');
      if (!tg || !root.contains(tg)) return;
      var input = document.getElementById(tg.getAttribute('data-toggle'));
      if (!input) return;
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      tg.setAttribute('aria-pressed', String(!showing));
      tg.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      tg.querySelector('span').textContent = showing ? 'Show' : 'Hide';
      /* keep the caret where it was rather than jumping to the end */
      var pos = input.value.length;
      input.focus();
      try { input.setSelectionRange(pos, pos); } catch (err) { /* type change race */ }
    });
  };

  /* -------------------------------------------------------- accordions */
  /* Panels animate open and closed via grid-template-rows rather than the
     hidden attribute, so the height can transition. aria-hidden (not hidden)
     is what pulls a closed panel from the accessibility tree without snapping
     it to display:none mid-animation — which is why this cannot just be a
     <details>. Delegated, so panels added after binding still work. */
  VOLA.bindAccordion = function (root) {
    root.addEventListener('click', function (e) {
      var btn = e.target.closest('.accordion__btn');
      if (!btn || !root.contains(btn)) return;
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      panel.dataset.state = open ? 'closed' : 'open';
      if (open) panel.setAttribute('aria-hidden', 'true');
      else panel.removeAttribute('aria-hidden');
    });
  };

  /* ---------------------------------------------------------- cart drawer */
  function renderDrawerBody(host) {
    if (!cart.items.length) {
      host.innerHTML =
        '<div class="empty">' +
        '<span class="empty__icon">' + icon('bag') + '</span>' +
        '<p class="display display--lg">Your bag is empty</p>' +
        '<p class="lede" style="font-size:1rem">Nothing chosen yet. Every piece is cut by ' +
        'hand and made in small numbers.</p>' +
        '<a class="btn btn--primary" href="shop.html">Browse the collection</a>' +
        '</div>';
      return;
    }
    host.innerHTML = cart.items.map(function (l) {
      var p = byId(l.id);
      if (!p) return '';
      var k = cart.key(l.id, l.size, l.colour);
      return '<article class="line">' +
        '<div class="line__media"><img src="' + p.image + '" alt="" width="84" height="105" loading="lazy"></div>' +
        '<div class="line__body">' +
          '<h3 class="line__name"><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a></h3>' +
          '<p class="line__meta">' + esc(l.colour) + ' &middot; Size ' + esc(l.size) + '</p>' +
          '<div class="line__row">' +
            qtyControl(k, l.qty, p.name) +
            '<span class="line__price">' + money(p.price * l.qty) + '</span>' +
          '</div>' +
          '<button type="button" class="line__remove" data-remove="' + esc(k) + '">' +
            'Remove<span class="sr-only"> ' + esc(p.name) + ', size ' + esc(l.size) + '</span></button>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function qtyControl(k, qty, name) {
    return '<div class="qty">' +
      '<button type="button" data-qty="-1" data-key="' + esc(k) + '"' + (qty <= 1 ? ' disabled' : '') + '>' +
        icon('minus') + '<span class="sr-only">Decrease quantity of ' + esc(name) + '</span></button>' +
      '<span class="qty__val">' + qty + '</span>' +
      '<button type="button" data-qty="1" data-key="' + esc(k) + '"' + (qty >= 10 ? ' disabled' : '') + '>' +
        icon('plus') + '<span class="sr-only">Increase quantity of ' + esc(name) + '</span></button>' +
    '</div>';
  }
  VOLA.qtyControl = qtyControl;

  /* Delegated qty / remove handling — works for the drawer and the bag page. */
  VOLA.bindLineActions = function (root, onChange) {
    root.addEventListener('click', function (e) {
      var q = e.target.closest('[data-qty]');
      if (q) {
        var k = q.getAttribute('data-key');
        var line = cart.items.filter(function (l) { return cart.key(l.id, l.size, l.colour) === k; })[0];
        if (!line) return;
        var want = line.qty + parseInt(q.getAttribute('data-qty'), 10);
        if (want > 10) { announce('Ten is the maximum quantity per piece.'); return; }
        cart.setQty(k, want);
        if (onChange) onChange();
        /* the number and the line total both changed - say so in full, rather
           than leaving a bare digit to be re-read out of context */
        var prod = byId(line.id);
        if (prod) {
          /* `want`, not line.qty - setQty rebuilds the array, so `line` is stale */
          announce(prod.name + ', quantity ' + want + ', ' + money(prod.price * want));
        }
        return;
      }
      var r = e.target.closest('[data-remove]');
      if (r) {
        var key = r.getAttribute('data-remove');
        var item = cart.items.filter(function (l) { return cart.key(l.id, l.size, l.colour) === key; })[0];
        var prod = item ? byId(item.id) : null;
        var res = cart.remove(key);
        if (onChange) onChange();
        toast((prod ? prod.name : 'Item') + ' removed', {
          label: 'Undo',
          onClick: function () {
            if (res.line) cart.restore(res.line, res.index);
            if (onChange) onChange();
          }
        });
      }
    });
  };

  function renderDrawerFoot(host) {
    if (!cart.items.length) { host.hidden = true; return; }
    host.hidden = false;
    var sub = cart.subtotal();
    var remaining = FREE_SHIP - sub;
    host.innerHTML =
      '<div class="totals__row totals__row--grand"><span>Subtotal</span>' +
      '<strong class="num">' + money(sub) + '</strong></div>' +
      '<p class="line__meta">' + (remaining > 0
        ? money(remaining) + ' from complimentary express shipping'
        : 'Complimentary express shipping applied') + '</p>' +
      '<a class="btn btn--primary btn--block" href="cart.html">View bag &amp; check out</a>' +
      '<button type="button" class="link-u" data-close style="justify-self:center">Continue shopping</button>';
  }

  /* ----------------------------------------------------------------- chrome */
  function mountChrome() {
    /* cart badge */
    var lastCount = cart.count();
    function paintBadge() {
      var n = cart.count();
      Array.prototype.forEach.call(document.querySelectorAll('[data-cart-count]'), function (el) {
        el.textContent = n;
        el.hidden = n === 0;
        /* only on a genuine increase - not on the initial paint, and not
           when a removal drops the number */
        if (n > lastCount) {
          el.classList.remove('is-bumped');
          void el.offsetWidth;   /* restart the animation on repeated adds */
          el.classList.add('is-bumped');
        }
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-cart-label]'), function (el) {
        el.textContent = n === 0 ? 'Bag, empty' : 'Bag, ' + n + (n === 1 ? ' item' : ' items');
      });
      lastCount = n;
    }

    /* mobile menu */
    var burger = document.querySelector('[data-menu-open]');
    var menu = document.getElementById('mobile-menu');
    if (burger && menu) {
      var m = overlay(menu, null, burger);
      burger.addEventListener('click', m.open);
    }

    /* cart drawer */
    var drawer = document.getElementById('cart-drawer');
    var scrim = document.getElementById('scrim');
    var openers = document.querySelectorAll('[data-cart-open]');
    if (drawer && scrim) {
      var body = drawer.querySelector('[data-drawer-body]');
      var foot = drawer.querySelector('[data-drawer-foot]');
      var d = overlay(drawer, scrim, openers[0]);
      VOLA.openCart = d.open;

      function paintDrawer(animateIn) {
        renderDrawerBody(body);
        renderDrawerFoot(foot);
        Array.prototype.forEach.call(foot.querySelectorAll('[data-close]'), function (b) {
          b.addEventListener('click', d.close);
        });
        /* only on a fresh open, not on every quantity tick while it's
           already open - re-fading the whole list on every click reads as
           a glitch, not a flourish */
        if (animateIn) VOLA.stagger(body.querySelectorAll('.line'));
      }
      VOLA.bindLineActions(body, function () { paintDrawer(false); });
      document.addEventListener('vola:cart', function () { paintBadge(); paintDrawer(false); });
      Array.prototype.forEach.call(openers, function (o) {
        o.addEventListener('click', function () { paintDrawer(true); d.open(); });
      });
      paintDrawer(false);
    } else {
      document.addEventListener('vola:cart', paintBadge);
    }
    paintBadge();

    /* another tab changed the bag */
    window.addEventListener('storage', function (e) {
      if (e.key === CART_KEY) { cart.items = read(); document.dispatchEvent(new CustomEvent('vola:cart')); }
    });

    /* account control — a dot when signed in, and a label that says who.
       Painted here rather than per page so every header agrees, and guarded
       so pages that load without auth.js simply show the plain link. */
    function paintAccount() {
      var signedIn = !!(VOLA.auth && VOLA.auth.isSignedIn && VOLA.auth.isSignedIn());
      var who = signedIn ? VOLA.auth.user.email : null;
      Array.prototype.forEach.call(document.querySelectorAll('[data-account]'), function (el) {
        el.setAttribute('aria-label', signedIn ? 'Your account, signed in as ' + who : 'Sign in');
        /* carry where they were, so signing in returns them to it rather
           than to the homepage */
        var here = location.pathname.split('/').pop() || 'index.html';
        if (here !== 'account.html') {
          el.setAttribute('href', 'account.html?next=' + encodeURIComponent(here + location.search));
        }
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-account-dot]'), function (el) {
        el.hidden = !signedIn;
      });
    }
    paintAccount();
    document.addEventListener('vola:auth', paintAccount);

    /* current page in nav */
    var page = document.body.getAttribute('data-page');
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      if (a.getAttribute('data-nav') === page) a.setAttribute('aria-current', 'page');
    });

    /* year */
    Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
      el.textContent = new Date().getFullYear();
    });

    /* The newsletter lives in newsletter.js. It used to be here: validate,
       clear the field, say "you are on the list", send nothing. */
  }

  /* --------------------------------------------------------- scroll reveal */
  /* Section headings unveil rather than drift in — see the [data-wipe] block
     in the stylesheet for what it does and why it is the one piece of motion
     on the site that does not move.

     Claimed here, once, rather than typed into every `.sec-head__title` in
     sixteen hand-written pages. Consistency is the whole argument for it: a
     section heading is a repeating component, and five identical ones where
     the sixth behaves differently reads as a bug, not as emphasis. Doing it
     in markup would have guaranteed that drift by the third new page.

     Skips any heading already carrying the attribute, so a page that wants
     to opt out or set its own delay keeps the last word. */
  function claimSectionHeadings() {
    var heads = document.querySelectorAll('.sec-head__title > .display');
    Array.prototype.forEach.call(heads, function (h) {
      if (h.hasAttribute('data-reveal')) return;
      h.setAttribute('data-reveal', '');
      h.setAttribute('data-wipe', '');
    });
  }

  function mountReveal() {
    claimSectionHeadings();
    var nodes = document.querySelectorAll('[data-reveal]:not(.is-in)');
    if (!nodes.length) return;
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(nodes, function (n) { io.observe(n); });
  }

  /* Stagger helper for freshly-rendered grids (design system: 60ms each). */
  VOLA.stagger = function (nodes) {
    Array.prototype.forEach.call(nodes, function (n, i) {
      n.setAttribute('data-reveal', '');
      n.style.setProperty('--reveal-delay', Math.min(i, 8) * 60 + 'ms');
    });
    mountReveal();
  };

  /* ------------------------------------------------------------ card markup */
  VOLA.card = function (p) {
    var flag = p.flag
      ? '<span class="card__flag' + (p.flag === 'Atelier' ? ' card__flag--accent' : '') + '">' + esc(p.flag) + '</span>'
      : '';
    var href = 'product.html?id=' + encodeURIComponent(p.id);

    /* The second view, on hover. Not decoration: on a grid of denim the
       difference between two cuts is the back, and asking someone to open a
       product page to find that out is asking them to shop by guesswork.
       The image already exists in the catalogue — the card was the only
       place not using it.

       Only when there genuinely is a different second image. `images[0]` is
       usually the same file as `image`, and crossfading a photograph into
       itself is a hover state that looks broken rather than subtle.

       aria-hidden and empty alt: it is the same garment, already named by
       the first image's alt and the heading below. A screen reader gaining
       a second description of one product would be noise, not access. */
    var alt = null;
    if (p.images && p.images.length) {
      for (var i = 0; i < p.images.length; i++) {
        if (p.images[i] && p.images[i] !== p.image) { alt = p.images[i]; break; }
      }
    }

    return '<article class="card">' +
      '<div class="card__media">' + flag +
        '<img class="card__img" src="' + p.image + '" alt="' + esc(p.alt) + '" width="800" height="1000" loading="lazy" decoding="async">' +
        (alt
          ? '<img class="card__img card__img--alt" src="' + alt + '" alt="" aria-hidden="true" ' +
            'width="800" height="1000" loading="lazy" decoding="async">'
          : '') +
      '</div>' +
      '<div class="card__body">' +
        '<p class="card__cat">' + esc(catLabel(p.category)) + '</p>' +
        '<h3 class="card__name"><a href="' + href + '">' + esc(p.name) + '</a></h3>' +
        '<p class="card__price num">' + money(p.price) + '</p>' +
      '</div>' +
    '</article>';
  };

  /* The ready-to-wear price range across a set of categories — what a
     made-to-measure "from" figure has to be read against. Used by the
     commission page and by the contact panel, which were computing it twice. */
  VOLA.priceRange = function (categories) {
    var prices = VOLA.products
      .filter(function (p) { return categories.indexOf(p.category) > -1; })
      .map(function (p) { return p.price; });
    if (!prices.length) return null;
    var lo = Math.min.apply(null, prices), hi = Math.max.apply(null, prices);
    return { lo: lo, hi: hi, label: lo === hi ? money(lo) : money(lo) + ' – ' + money(hi) };
  };

  /* A card that answers "does it come in my size" before the click rather
     than after it. Lives here because two grids need it — the collection and
     the related pieces under a product — and it said nothing on the second
     while saying it on the first. Silent without a profile, and silent on
     pieces the profile cannot speak to (a saved waist says nothing about a
     handbag). Curated shelves whose heading already promises the fit use the
     plain card instead. */
  VOLA.cardWithFit = function (p) {
    var html = VOLA.card(p);
    if (!VOLA.fit || !VOLA.fit.canSize(p)) return html;
    var r = VOLA.fit.recommend(p);
    var note = r && r.exact
      ? '<p class="card__fit">Your size ' + esc(r.size) + ' — in stock</p>'
      : '<p class="card__fit card__fit--out">Not in your size</p>';
    return html.replace('</div></article>', note + '</div></article>');
  };

  function catLabel(slug) {
    var c = VOLA.categories.filter(function (x) { return x.slug === slug; })[0];
    return c ? c.label : slug;
  }
  VOLA.catLabel = catLabel;

  /* ------------------------------------------------------------- the mills */
  /* The house counts its mills out loud on the homepage and again on the
     atelier page. Deriving the record here — who, where, since when, and how
     much of this season came off each loom — is what stops those pages
     disagreeing with the catalogue, or with each other. Sorted oldest first,
     which is the order a house that trades on heritage would print them in. */
  VOLA.mills = function () {
    var by = {};
    VOLA.products.forEach(function (p) {
      if (!p.prov) return;
      var m = by[p.prov.mill] || (by[p.prov.mill] = {
        name: p.prov.mill, city: p.prov.city, country: p.prov.country,
        since: p.prov.since, n: 0, hours: 0, weights: [], pieces: []
      });
      m.n++;
      m.pieces.push(p);
      m.hours += p.prov.hours || 0;
      /* the range of cloth weights this loom actually supplies — the honest
         answer to "what do you buy from them" */
      if (p.denim && m.weights.indexOf(p.denim.oz) === -1) m.weights.push(p.denim.oz);
    });
    return Object.keys(by).map(function (k) {
      var m = by[k];
      m.weights.sort(function (a, b) { return a - b; });
      return m;
    }).sort(function (a, b) { return a.since - b.since; });
  };

  var WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  VOLA.numberWord = function (n, capitalise) {
    var w = WORDS[n] || String(n);
    return capitalise ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  };

  /* Any [data-mills-word] on any page gets the live count spelled out;
     data-mills-word="cap" asks for the form that opens a sentence. */
  function paintMillCounts() {
    var n = VOLA.mills().length;
    Array.prototype.forEach.call(document.querySelectorAll('[data-mills-word]'), function (el) {
      el.textContent = VOLA.numberWord(n, el.getAttribute('data-mills-word') === 'cap');
    });
  }

  /* The same idea for the commerce terms. A page writes the current figure as
     its own fallback text — so the copy still reads correctly with scripts
     off — and this replaces it with whatever TERMS says at runtime. */
  var TERM_TEXT = {
    'ship-free': function () { return money(TERMS.freeShipOver); },
    'ship-flat': function () { return money(TERMS.flatShipping); },
    'returns-days': function () { return String(TERMS.returnsDays); }
  };

  function paintTerms() {
    Object.keys(TERM_TEXT).forEach(function (key) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-' + key + ']'), function (el) {
        el.textContent = TERM_TEXT[key]();
      });
    });

    /* the same delivery windows the bag quotes per country, written out as
       the sentence the atelier page makes of them */
    var summary = DELIVERY.zones.map(function (z) {
      return DELIVERY.window(z, true) + ' ' + z.where;
    }).join(', ');
    Array.prototype.forEach.call(document.querySelectorAll('[data-delivery-summary]'), function (el) {
      el.textContent = summary.charAt(0).toUpperCase() + summary.slice(1) + '.';
    });
  }

  /* [data-house="email"] takes HOUSE.email as its text; an <a> also gets the
     right href, so a phone number and its tel: link cannot drift apart. */
  var HOUSE_HREF = { email: 'mailto:', phone: 'tel:' };

  /* Two keys are phrasings of numbers already in HOUSE rather than facts of
     their own — spelled out, because "Two fittings across six weeks" is prose
     and "2 fittings across 6 weeks" is a spreadsheet. */
  var HOUSE_DERIVED = {
    fittingsWord: function () { return VOLA.numberWord(HOUSE.fittings, true); },
    weeksWord: function () { return VOLA.numberWord(HOUSE.fittingWeeks); }
  };

  function paintHouse() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-house]'), function (el) {
      var key = el.getAttribute('data-house');
      var value = HOUSE_DERIVED[key] ? HOUSE_DERIVED[key]() : HOUSE[key];
      if (value == null) return;
      el.textContent = value;
      if (el.tagName === 'A' && HOUSE_HREF[key]) {
        el.setAttribute('href', HOUSE_HREF[key] + (key === 'phone' ? HOUSE.phoneHref : value));
      }
    });
  }

  /* -------------------------------------------------------------- boot */
  function boot() {
    mountChrome();
    paintMillCounts();
    paintTerms();
    paintHouse();
    mountReveal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
