/* VOLÀ — help centre page.

   The answers themselves live in faq.js, because three other pages surface a
   handful of them in context and a question in two places is a question that
   will eventually disagree with itself. This file is the page: sections,
   contents list, and search. */
(function () {
  'use strict';

  var V = window.VOLA, esc = V.esc;
  var SECTIONS = V.faq;

  /* ------------------------------------------------------------- render */
  var body = document.getElementById('help-body');
  var nav = document.getElementById('help-nav');
  var qEl = document.getElementById('q');
  var qCount = document.getElementById('q-count');

  function render() {
    var n = 0;
    body.innerHTML = SECTIONS.map(function (s) {
      var items = s.items.map(function (item) {
        var pid = 'a-' + s.id + '-' + (n++);
        return '<div class="accordion__item" data-q="' +
            esc((item.q + ' ' + stripTags(item.a())).toLowerCase()) + '">' +
          '<h3><button class="accordion__btn" type="button" aria-expanded="false" ' +
            'aria-controls="' + pid + '"><span>' + esc(item.q) + '</span>' + V.icon('plus') +
          '</button></h3>' +
          '<div class="accordion__panel" id="' + pid + '" data-state="closed" aria-hidden="true">' +
            '<div class="accordion__panel-inner"><div class="accordion__panel-content">' +
              item.a() +
            '</div></div>' +
          '</div>' +
        '</div>';
      }).join('');

      return '<section class="helpsec" id="' + s.id + '" aria-labelledby="h-' + s.id + '">' +
        '<div class="helpsec__head">' +
          '<h2 class="display display--lg" id="h-' + s.id + '">' + esc(s.title) + '</h2>' +
          (s.more ? '<a class="link-u" href="' + s.more.href + '">' + esc(s.more.text) + '</a>' : '') +
        '</div>' +
        (s.lead ? '<p class="helpsec__lead">' + esc(s.lead) + '</p>' : '') +
        '<div class="accordion">' + items + '</div>' +
        /* a route to a person at the end of every section, not only at the
           bottom of the page */
        '<p class="helpsec__ask">Still stuck? ' +
          '<a class="link-u" href="contact.html">Write to the atelier</a></p>' +
      '</section>';
    }).join('');

    nav.innerHTML = '<h2 class="filter-group__title" id="toc-h">Topics</h2>' +
      '<ul class="helpnav__list">' + SECTIONS.map(function (s) {
        return '<li><a href="#' + s.id + '">' + esc(s.title) +
          '<span class="num">' + s.items.length + '</span></a></li>';
      }).join('') + '</ul>';

    V.bindAccordion(body);
  }

  function stripTags(html) { return String(html).replace(/<[^>]*>/g, ' '); }

  /* --------------------------------------------------------------- search */
  /* Filters questions in place and opens what survives, because a search
     result you then have to click open is not a search result. */
  function search(term) {
    term = term.trim().toLowerCase();
    var hits = 0;

    Array.prototype.forEach.call(body.querySelectorAll('.helpsec'), function (sec) {
      var shown = 0;
      Array.prototype.forEach.call(sec.querySelectorAll('[data-q]'), function (item) {
        var match = !term || item.getAttribute('data-q').indexOf(term) > -1;
        item.hidden = !match;
        if (match) shown++;
        var btn = item.querySelector('.accordion__btn');
        var panel = item.querySelector('.accordion__panel');
        var open = !!term && match;
        btn.setAttribute('aria-expanded', String(open));
        panel.dataset.state = open ? 'open' : 'closed';
        if (open) panel.removeAttribute('aria-hidden');
        else panel.setAttribute('aria-hidden', 'true');
      });
      sec.hidden = shown === 0;
      hits += shown;
    });

    qCount.textContent = !term ? ''
      : hits === 0 ? 'No answers match — try fewer words, or write to us.'
      : hits + (hits === 1 ? ' answer' : ' answers');
  }

  var t;
  qEl.addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () { search(qEl.value); }, 180);
  });

  render();

  /* deep links from other pages: help.html#returns should land open */
  if (location.hash) {
    var target = document.querySelector(location.hash);
    if (target) target.scrollIntoView({ block: 'start' });
  }
})();
