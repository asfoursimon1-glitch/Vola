/* VOLÀ — orders.

   ═══════════════════════════════════════════════════════════════════════
   ⚠  There are no orders. This file has one seam — `lookup` — and behind it
   a generator that builds a plausible order from the number you type, so the
   page can be designed, demonstrated and tested against every state it has
   to survive: in the atelier, in transit, delivered, returnable, and final
   sale.

   It is deterministic: the same number always produces the same order. That
   is what makes it useful for testing and what makes it obviously not a
   database.

   Replace `lookup` with a call to your commerce API. It must:
     • require the order number AND the email it was placed with, and match
       both — an order number alone is a guessable URL to somebody's address;
     • rate limit, because that pair is brute-forceable;
     • return the same "not found" for a wrong email as for a wrong number.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var V = (window.VOLA = window.VOLA || {});

  /* VOLA-123456, or six bare digits. Case and spacing are forgiven because
     people copy these out of emails. */
  var PATTERN = /^(?:vola[\s-]*)?(\d{6})$/i;

  function normalise(input) {
    var m = PATTERN.exec(String(input || '').trim());
    return m ? m[1] : null;
  }

  /* deterministic, so a given number always tells the same story */
  function seedOf(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  }

  function daysBetween(a, b) { return Math.floor((b - a) / 86400000); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function iso(d) { return d.toISOString().slice(0, 10); }

  /* The stages an order passes through. A piece cut to order spends weeks in
     the atelier before it ships, and an order tracker that shows "processing"
     for a month is how a customer decides they have been forgotten. */
  function stagesFor(hasMadeToOrder, zone) {
    var ship = hasMadeToOrder ? 38 : 2;
    var list = hasMadeToOrder
      ? [
          { id: 'placed',    at: 0,  label: 'Order placed',   body: 'Confirmed, and your cloth reserved off the bolt.' },
          { id: 'cut',       at: 3,  label: 'Cut',            body: 'Your pattern cut singly in the Florence atelier.' },
          { id: 'assembled', at: 12, label: 'Assembled',      body: 'Panels joined, structure built, ready for finishing.' },
          { id: 'finishing', at: 26, label: 'Hand finishing', body: 'Edges, hardware and pressing — the slow part.' },
          { id: 'shipped',   at: ship, label: 'Shipped',      body: 'Handed to the carrier with a tracking number.' }
        ]
      : [
          { id: 'placed',  at: 0,    label: 'Order placed', body: 'Confirmed and queued for packing.' },
          { id: 'packed',  at: 1,    label: 'Packed',       body: 'Wrapped and labelled at the atelier.' },
          { id: 'shipped', at: ship, label: 'Shipped',      body: 'Handed to the carrier with a tracking number.' }
        ];
    list.push({
      id: 'delivered', at: ship + zone.max, label: 'Delivered',
      body: 'Signed for at the address on the order.'
    });
    return list;
  }

  /* Build an order from its number. Same number, same order, every time. */
  function generate(digits, email) {
    var rand = rng(seedOf(digits));
    var sized = V.products.filter(function (p) { return p.sizeSystem !== 'one'; });

    var lineCount = 1 + Math.floor(rand() * 2);
    var lines = [];
    var used = {};
    while (lines.length < lineCount) {
      var p = V.products[Math.floor(rand() * V.products.length)];
      if (used[p.id]) continue;
      used[p.id] = 1;
      var sizes = p.sizes.filter(function (s) { return p.soldOut.indexOf(s) === -1; });
      lines.push({
        id: p.id,
        size: sizes[Math.floor(rand() * sizes.length)] || p.sizes[0],
        colour: p.colour,
        qty: 1
      });
    }
    void sized;

    var countries = V.delivery.countries();
    var country = countries[Math.floor(rand() * countries.length)];
    var zone = V.delivery.zoneFor(country);

    var hasMTO = lines.some(function (l) {
      var p = V.byId(l.id);
      return p && p.tag === 'atelier';
    });

    /* spread orders across their whole life so different numbers show
       different stages — the point of the demo */
    var age = Math.floor(rand() * (hasMTO ? 60 : 14));
    var placed = addDays(new Date(), -age);
    var stages = stagesFor(hasMTO, zone);

    var current = stages[0];
    stages.forEach(function (s) { if (age >= s.at) current = s; });

    var subtotal = lines.reduce(function (n, l) {
      var p = V.byId(l.id);
      return n + (p ? p.price * l.qty : 0);
    }, 0);
    var shipping = subtotal >= V.terms.freeShipOver ? 0 : V.terms.flatShipping;

    var delivered = current.id === 'delivered';
    var deliveredAt = delivered ? addDays(placed, stages[stages.length - 1].at) : null;

    return {
      number: 'VOLA-' + digits,
      email: email,
      placedAt: placed,
      country: country,
      zone: zone,
      lines: lines,
      subtotal: subtotal,
      shipping: shipping,
      total: subtotal + shipping,
      stages: stages,
      current: current,
      delivered: delivered,
      deliveredAt: deliveredAt,
      /* the estimate is the same promise the help centre and the bag make */
      etaFrom: addDays(placed, stages[stages.length - 2].at + zone.min),
      etaTo: addDays(placed, stages[stages.length - 1].at),
      carrier: 'DHL Express',
      /* a tracking number only exists once the carrier has it */
      tracking: (current.id === 'shipped' || current.id === 'delivered')
        ? 'JD' + digits + 'IT' : null
    };
  }

  V.orders = {
    normalise: normalise,
    iso: iso,

    /* Which lines can still be sent back, and why not where not. Made-to-order
       pieces are excluded because they are cut to a single order — the same
       rule the bag and the help centre state. */
    returnable: function (order) {
      if (!order.delivered) {
        return { open: false, reason: 'Returns open once the order is delivered.' };
      }
      var daysSince = daysBetween(order.deliveredAt, new Date());
      var left = V.terms.returnsDays - daysSince;
      var eligible = [], excluded = [];
      order.lines.forEach(function (l) {
        var p = V.byId(l.id);
        if (!p) return;
        (p.tag === 'atelier' ? excluded : eligible).push(p);
      });
      return {
        open: left > 0 && eligible.length > 0,
        daysLeft: Math.max(left, 0),
        eligible: eligible,
        excluded: excluded,
        reason: left > 0 ? null
          : 'The ' + V.terms.returnsDays + '-day window closed ' +
            Math.abs(left) + (Math.abs(left) === 1 ? ' day' : ' days') + ' ago.'
      };
    },

    /* ═══════════════════════════════════════ SEAM ═══════════════════════
       Replace with your commerce API. Match the number AND the email, rate
       limit the endpoint, and return one indistinguishable "not found" for
       every failure — a different response for a real order number with the
       wrong email tells an attacker the number is real. */
    lookup: function (number, email) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          var digits = normalise(number);
          if (!digits) {
            reject(new Error('We cannot find an order with those details. ' +
              'Check the number and the email address you used, then try again.'));
            return;
          }
          resolve(generate(digits, String(email).trim().toLowerCase()));
        }, 800);
      });
    }
  };
})();
