/* VOLÀ — the answers, and the box that shows a few of them in context.

   These live here rather than on the help centre page because three other
   pages surface a handful of them at the moment they matter: duties beside
   the checkout button, delivery times on a product page, the most-asked
   questions above the contact form. One source, so moving an answer moves it
   everywhere it appears.

   Answers are functions, not strings, wherever they depend on the catalogue —
   change the shipping threshold and every place that quotes it rewrites
   itself. They are called at render time, after app.js has defined the
   helpers they use. */
(function () {
  'use strict';

  var V = (window.VOLA = window.VOLA || {});

  function money(n) { return V.money(n); }
  function link(href, text) { return '<a href="' + href + '">' + text + '</a>'; }

  /* the delivery promise as a table, which is what it always should have been */
  function deliveryTable() {
    var rows = V.delivery.zones.map(function (z) {
      /* `where` is a prepositional phrase for prose ("in Europe",
         "elsewhere"); a table cell wants the place, capitalised */
      var place = z.where.replace(/^in /, '');
      place = place.charAt(0).toUpperCase() + place.slice(1);
      return '<tr>' +
        '<th scope="row">' + V.esc(place) + '</th>' +
        '<td>' + V.esc(V.delivery.window(z)) + '</td>' +
        '<td>' + V.esc((z.countries || []).join(', ') || 'Everywhere else we ship') + '</td>' +
      '</tr>';
    }).join('');
    return '<div class="table-scroll"><table class="sizetable helptable">' +
      '<caption class="sr-only">Express delivery times by zone.</caption>' +
      '<thead><tr><th scope="col">Zone</th><th scope="col">Express delivery</th>' +
        '<th scope="col">Countries</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
      '<p>Times run from the day your order leaves the atelier, not the day you place it. ' +
      'Made-to-order pieces are cut first — see the commissions section.</p>';
  }

  V.faq = [
    {
      id: 'ordering', title: 'Ordering and payment',
      items: [
        { id: 'account', q: 'Do I need an account to order?',
          a: function () {
            return '<p>No, and there are none. Checkout is guest-only by design. Your bag and ' +
              'your saved sizes live in this browser, not on our server, which is why they ' +
              'survive a refresh but not a new device.</p>';
          } },
        { id: 'payment', q: 'How do I pay?',
          a: function () {
            return '<p>Payment is taken on the next step, on our payment provider’s own secure ' +
              'page. VOLÀ never sees or stores your card details, and there are no card ' +
              'fields anywhere on this site.</p>';
          } },
        { id: 'change-order', q: 'Can I change or cancel an order?',
          a: function () {
            var made = V.products.filter(function (p) { return p.tag === 'atelier'; }).length;
            return '<p>Write to us the same day and we will almost always catch it. Once a piece ' +
              'has shipped it becomes a return instead.</p>' +
              '<p>The ' + made + ' made-to-order pieces are the exception in both directions: ' +
              'tell us before cutting begins and we will stop, at no cost. After that the piece ' +
              'exists only for you and cannot be cancelled or returned.</p>';
          } },
        { id: 'track', q: 'Where is my order?',
          a: function () {
            return '<p>' + link('track.html', 'Track it here') + ' with your order number and ' +
              'the email you placed it with. No account and no password — there is nothing to ' +
              'sign in to.</p>' +
              '<p>A made-to-order piece is cut only once you have ordered it, so it spends weeks ' +
              'in the atelier before it ships. The tracker shows which stage it is at rather ' +
              'than leaving it on “processing”.</p>';
          } },
        { id: 'restock', q: 'Something is out of stock in my size. Will it come back?',
          a: function () {
            return '<p>Often, but not always. We buy the bolt rather than the metre, so when a ' +
              'cloth is gone the piece is retired rather than re-sourced in something ' +
              'approximate. ' + link('traceability.html', 'Why we work that way') + '.</p>' +
              '<p>' + link('fit.html', 'The Fit Studio') + ' shows how much of the collection is ' +
              'currently cut in each size.</p>';
          } }
      ]
    },
    {
      id: 'shipping', title: 'Shipping and delivery',
      items: [
        { id: 'cost', q: 'What does shipping cost?',
          a: function () {
            var t = V.terms;
            var under = V.products.filter(function (p) { return p.price < t.freeShipOver; }).length;
            var cheapest = V.products.reduce(function (m, p) { return Math.min(m, p.price); }, Infinity);
            return '<p>Express shipping is complimentary on orders over ' +
              money(t.freeShipOver) + ' and ' + money(t.flatShipping) + ' below it, worldwide.</p>' +
              '<p>Worth knowing: ' + under + ' of the ' + V.products.length + ' pieces sit below ' +
              'that threshold on their own — the least expensive is ' + money(cheapest) + '.</p>';
          } },
        { id: 'times', q: 'How long will delivery take?', a: deliveryTable },
        { id: 'where', q: 'Where do you ship?',
          a: function () {
            return '<p>To ' + V.delivery.countries().length + ' countries at checkout: ' +
              V.esc(V.delivery.countries().join(', ')) + '.</p>' +
              '<p>If yours is not listed, write to us — we can usually arrange it, we simply ' +
              'will not put a country in the dropdown if we cannot quote a delivery time for it.</p>';
          } },
        { id: 'duties', q: 'Who pays duties and taxes?',
          a: function () {
            return '<p>You do, and they are settled with the carrier at delivery rather than ' +
              'added at checkout. We quote prices excluding destination duty because we cannot ' +
              'know your local rate accurately enough to charge it honestly.</p>' +
              '<p>Inside the EU there is nothing further to pay — duty is already in the price.</p>';
          } }
      ]
    },
    {
      id: 'returns', title: 'Returns and exchanges',
      items: [
        { id: 'window', q: 'What is the returns window?',
          a: function () {
            var made = V.products.filter(function (p) { return p.tag === 'atelier'; });
            var names = made.map(function (p) {
              return link('product.html?id=' + encodeURIComponent(p.id), V.esc(p.name));
            }).join(', ');
            return '<p>' + V.terms.returnsDays + ' days from delivery, unworn, with the tag ' +
              'attached.</p>' +
              '<p class="help__warn">' + V.icon('alert') + '<span><strong>The ' + made.length +
              ' made-to-order pieces are excluded.</strong> They are cut to a single order and ' +
              'cannot be resold, so they are final sale: ' + names + '. This is stated on each ' +
              'of their product pages and again in your bag before you pay.</span></p>';
          } },
        { id: 'exchange', q: 'How do I exchange for another size?',
          a: function () {
            return '<p>Return the piece and order the size you want. We do not hold stock against ' +
              'an exchange, because on a collection this size that would take the piece out of ' +
              'circulation for a fortnight.</p>' +
              '<p>Before you do — ' + link('fit.html', 'the Fit Studio') + ' lists how every cut ' +
              'runs, and most of our size returns are on the four or five pieces that run small.</p>';
          } },
        { id: 'refund-shipping', q: 'Do you refund the shipping?',
          a: function () {
            return '<p>We refund the piece. Return postage is yours, unless the piece arrived ' +
              'faulty or we sent the wrong thing — in which case we cover it both ways and would ' +
              'rather you told us immediately than posted it back first.</p>';
          } },
        { id: 'damaged', q: 'Something arrived damaged.',
          a: function () {
            return '<p>Photograph it and ' + link('contact.html?subject=order', 'write to us') +
              ' before doing anything else. We will replace it, repair it or refund it, and we ' +
              'cover the postage.</p>';
          } }
      ]
    },
    {
      id: 'sizing', title: 'Sizing and fit',
      lead: 'Fit has its own page. These are the short answers.',
      more: { href: 'fit.html', text: 'Open the Fit Studio' },
      items: [
        { id: 'which-size', q: 'How do I know what size to take?',
          a: function () {
            return '<p>Save four measurements once in ' + link('fit.html', 'the Fit Studio') +
              ' and every product page will suggest a size and say why — including where a cut ' +
              'runs small, which a size chart cannot tell you.</p>';
          } },
        { id: 'run-small', q: 'Which pieces run small?',
          a: function () {
            var small = V.products.filter(function (p) { return p.fit && p.fit.advice === 'up'; });
            var large = V.products.filter(function (p) { return p.fit && p.fit.advice === 'down'; });
            function names(list) {
              return list.map(function (p) {
                return link('product.html?id=' + encodeURIComponent(p.id), V.esc(p.name));
              }).join(', ');
            }
            return '<p><strong>Size up:</strong> ' + names(small) + '.</p>' +
              (large.length ? '<p><strong>Size down:</strong> ' + names(large) + '.</p>' : '') +
              '<p>Everything else takes your usual size. ' +
              link('fit.html#runs-h', 'The full table') + ' shows the true-to-size figure for each.</p>';
          } },
        { id: 'shrink', q: 'Will raw denim shrink?',
          a: function () {
            var raw = V.products.filter(function (p) { return p.denim && p.denim.fade === 'high'; });
            return '<p>Yes — ' + raw.length + ' pieces are sold raw and unwashed and will move at ' +
              'the first wash, then come back with wear. Everything else is washed and settled ' +
              'before it reaches you.</p>' +
              '<p>' + link('care.html#raw', 'What to do in the first six months') + '.</p>';
          } }
      ]
    },
    {
      id: 'care', title: 'Care and repairs',
      lead: 'Repairs are free for life. The full regimens live on their own page.',
      more: { href: 'care.html', text: 'Open Care & Repairs' },
      items: [
        { id: 'repair-cost', q: 'What does a repair cost?',
          a: function () {
            return '<p>Nothing, for as long as you own the piece, with no time limit. You cover ' +
              'postage to ' + V.house.cityEn + '; we cover the return.</p>' +
              '<p>' + link('contact.html?subject=repairs', 'Request a repair') + ' with a ' +
              'photograph and a sentence — no order number needed.</p>';
          } },
        { id: 'washing', q: 'How should I wash it?',
          a: function () {
            return '<p>Rarely, and cold. Beyond that it depends on the cloth: coated, undyed, ' +
              'silk-lined, leather and welted pieces each want something different, and ' +
              link('care.html#cloth', 'each rule names the pieces it applies to') + '.</p>';
          } },
        { id: 'alterations', q: 'Can you alter something to a different size?',
          a: function () {
            return '<p>Small adjustments, usually. A genuine change of size or shape is a new ' +
              'pattern, which is a ' + link('made-to-measure.html', 'commission') + ' rather than ' +
              'a repair — and if you own a piece already we will take that into account.</p>';
          } }
      ]
    },
    {
      id: 'commissions', title: 'Made to measure',
      lead: 'Commissions have their own page, with the process and the prices.',
      more: { href: 'made-to-measure.html', text: 'Open Made to Measure' },
      items: [
        { id: 'cost-time', q: 'What does a commission cost, and how long does it take?',
          a: function () {
            var offered = V.disciplines.filter(function (d) { return d.from != null; });
            return '<p>' + offered.map(function (d) {
                return d.label + ' from ' + money(d.from);
              }).join(', ') + '. ' + V.numberWord(V.house.fittings, true) + ' fittings across ' +
              V.numberWord(V.house.fittingWeeks) + ' weeks from the first fitting.</p>' +
              '<p>The consultation is free and nothing is charged until after the first ' +
              'fitting. ' + link('made-to-measure.html#request', 'Request one') + '.</p>';
          } },
        { id: 'what', q: 'Can anything be commissioned?',
          a: function () {
            var no = V.disciplines.filter(function (d) { return d.from == null; })[0];
            return '<p>Corsetry and denim tailoring, yes. ' +
              (no ? V.esc(no.label) + ': no — footwear needs a bespoke last and hardware needs ' +
                'its own moulds, and neither is something we do well enough yet to charge for.' : '') +
              '</p>';
          } },
        { id: 'remote', q: 'Can I commission remotely?',
          a: function () {
            return '<p>The consultation can be a video call. The fittings cannot — the whole ' +
              'point is the piece on your body, twice, with someone holding the pins.</p>';
          } }
      ]
    }
  ];

  /* Every question, flattened, so a page can ask for three by id. */
  V.faqItem = function (id) {
    var hit = null;
    V.faq.forEach(function (s) {
      s.items.forEach(function (i) { if (i.id === id) hit = i; });
    });
    return hit;
  };

  /* ------------------------------------------------------------ the box */
  /* Two or three answers at the moment they matter, rather than one floating
     widget carrying all of them everywhere. Deliberately not fixed-position:
     it scrolls with the page, sits in whatever column it is placed in, and
     costs nothing on a phone but the height of three closed rows.

     Call V.mountHelpBox(host, ids) after inserting, or use V.helpBox() for
     the markup alone. */
  var boxSeq = 0;

  V.helpBox = function (ids, opts) {
    opts = opts || {};
    var items = ids.map(V.faqItem).filter(Boolean);
    if (!items.length) return '';
    var seq = boxSeq++;

    return '<aside class="helpbox" aria-labelledby="hb-' + seq + '">' +
      '<h2 class="helpbox__title" id="hb-' + seq + '">' +
        V.esc(opts.title || 'Common questions') + '</h2>' +
      '<div class="accordion">' +
        items.map(function (item, i) {
          var pid = 'hb-' + seq + '-' + i;
          return '<div class="accordion__item">' +
            '<h3><button class="accordion__btn" type="button" aria-expanded="false" ' +
              'aria-controls="' + pid + '"><span>' + V.esc(item.q) + '</span>' +
              V.icon('plus') + '</button></h3>' +
            '<div class="accordion__panel" id="' + pid + '" data-state="closed" aria-hidden="true">' +
              '<div class="accordion__panel-inner"><div class="accordion__panel-content">' +
                item.a() +
              '</div></div>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<a class="link-u helpbox__more" href="' + (opts.moreHref || 'help.html') + '">' +
        V.esc(opts.moreText || 'All answers in the help centre') + '</a>' +
    '</aside>';
  };

  /* Renders into a host element and wires the disclosure behaviour. */
  V.mountHelpBox = function (host, ids, opts) {
    if (!host) return;
    var html = V.helpBox(ids, opts);
    if (!html) { host.hidden = true; return; }
    host.innerHTML = html;
    host.hidden = false;
    V.bindAccordion(host);
  };
})();
