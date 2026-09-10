/* VOLÀ — contact.

   Blur-time validation, a linked error summary, draft autosave — and three
   things that carry context in rather than making people retype it: the piece
   they were looking at, their saved sizes, and what made-to-measure actually
   costs next to the ready-to-wear on the rest of the site. */
(function () {
  'use strict';

  var V = window.VOLA, esc = V.esc;
  var form = document.getElementById('contact-form');
  var errSummary = document.getElementById('err-summary');
  var errList = document.getElementById('err-list');
  var sent = document.getElementById('sent-note');
  var failed = document.getElementById('failed-note');
  var gotcha = document.getElementById('company');
  var btn = document.getElementById('send');
  var pieceEl = document.getElementById('piece');
  var subjectEl = document.getElementById('subject');
  var messageEl = document.getElementById('message');
  var DRAFT = 'vola.contact.draft';

  var RULES = {
    name:    { label: 'Your name', msg: 'Enter your name.' },
    email:   { label: 'Email',     msg: 'Enter an email address in the format name@example.com.' },
    subject: { label: 'Subject',   msg: 'Choose what your message is about.' },
    message: { label: 'Message',   msg: 'Tell us what you need — a sentence is plenty.' }
  };

  /* --------------------------------------------------- made to measure */
  /* "Corsetry from $1,400" means nothing on its own; set against the
     ready-to-wear the visitor has just been browsing it means something.
     Disciplines, from-prices and the categories they are quoted against all
     come from data.js — the commission page is the full version of this
     panel, and the two must not disagree. */
  (function madeToMeasure() {
    var h = V.house;
    var offered = V.disciplines.filter(function (d) { return d.from != null; });

    var fittings = document.querySelector('[data-mtm-fittings]');
    if (fittings) {
      fittings.textContent = V.numberWord(h.fittings, true) + ' fittings across ' +
        V.numberWord(h.fittingWeeks) + ' weeks.';
    }
    var prices = document.querySelector('[data-mtm-prices]');
    if (prices) {
      prices.textContent = offered.map(function (d, i) {
        return (i ? d.label.toLowerCase() : d.label) + ' from ' + V.money(d.from);
      }).join(', ') + '.';
    }

    var compare = document.getElementById('mtm-compare');
    if (!compare) return;
    var bits = offered.map(function (d) {
      var r = V.priceRange(d.categories);
      return r ? d.label.toLowerCase() + ' runs ' + r.label : null;
    }).filter(Boolean);
    compare.textContent = bits.length
      ? 'For comparison, ready-to-wear ' + bits.join(' and ') + '.'
      : '';
  })();

  /* ------------------------------------------------------ which piece */
  /* Grouped by category so a 19-item list stays scannable, and ordered the
     way the collection page orders its filters. */
  function fillPieces() {
    if (!pieceEl) return;
    var html = V.categories.map(function (c) {
      var items = V.products.filter(function (p) { return p.category === c.slug; });
      if (!items.length) return '';
      return '<optgroup label="' + esc(c.label) + '">' +
        items.map(function (p) {
          return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>';
        }).join('') +
      '</optgroup>';
    }).join('');
    pieceEl.insertAdjacentHTML('beforeend', html);
  }

  /* A "Book a fitting" link from a product page carries ?id=. Answer what we
     already know — the piece, and the subject that implies — and leave the
     cursor in the one field only they can fill. */
  /* Pages that know why someone is writing can say so: care.html sends
     ?subject=repairs rather than dropping people on an unanswered dropdown. */
  var SUBJECT_ALIASES = {
    repairs: 'Repairs or alterations',
    fitting: 'A private appointment or fitting',
    mtm: 'Made-to-measure enquiry',
    sizing: 'Sizing advice',
    order: 'An existing order',
    press: 'Press or wholesale'
  };

  function applyIncoming() {
    var params = new URLSearchParams(location.search);

    var wanted = SUBJECT_ALIASES[params.get('subject')];
    if (wanted && subjectEl && !subjectEl.value) subjectEl.value = wanted;

    var id = params.get('id');
    if (!id) return null;
    var product = V.byId(id);
    if (!product || !pieceEl) return null;

    pieceEl.value = product.id;
    /* don't overwrite a subject restored from a saved draft */
    if (subjectEl && !subjectEl.value) {
      subjectEl.value = 'A private appointment or fitting';
    }
    if (messageEl && !messageEl.value.trim()) {
      /* deliberately no size here. The size for this piece (recommend) and
         the size on the profile (baseSize) legitimately differ whenever a cut
         runs small — printing one in the message and the other in the consent
         line below reads as the form contradicting itself. Sizes travel by
         the opt-in, which is labelled and explains itself. */
      messageEl.value = 'I would like to enquire about the ' + product.name + '.\n\n';
      /* caret after the opener, not before it */
      messageEl.setSelectionRange(messageEl.value.length, messageEl.value.length);
    }
    return product;
  }

  /* -------------------------------------------------- saved sizes opt-in */
  /* The profile is useful to an atelier taking a fitting enquiry, and it is
     nobody's to send but the person it describes. Off by default, and it says
     exactly what would go with the message. */
  function renderFitConsent() {
    var host = document.getElementById('fit-consent');
    if (!host) return;
    var line = V.fit.summaryLine();
    if (!line) { host.innerHTML = ''; host.hidden = true; return; }
    host.hidden = false;
    host.innerHTML =
      '<label class="checkline" for="send-sizes">' +
        '<input type="checkbox" id="send-sizes">' +
        '<span>Include my saved sizes — <b>' + esc(line) + '</b>. ' +
          'They stay in your browser unless you tick this. ' +
          '<a href="privacy.html#sizes">How we handle measurements</a>.</span>' +
      '</label>';
  }

  /* --------------------------------------------------------- validation */
  function check(id) {
    var el = document.getElementById(id), err = document.getElementById(id + '-err');
    var ok = el.checkValidity() && el.value.trim() !== '';
    if (ok) {
      el.removeAttribute('aria-invalid');
      err.hidden = true; err.innerHTML = '';
    } else {
      el.setAttribute('aria-invalid', 'true');
      err.hidden = false;
      err.innerHTML = V.icon('alert') + '<span>' + esc(RULES[id].msg) + '</span>';
    }
    return ok;
  }

  Object.keys(RULES).forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('blur', function () {
      if (el.value.trim() !== '' || el.getAttribute('aria-invalid') === 'true') check(id);
    });
    el.addEventListener('input', function () {
      if (el.getAttribute('aria-invalid') === 'true') check(id);
      saveDraft();
    });
  });
  if (pieceEl) pieceEl.addEventListener('change', saveDraft);

  /* Autosave so a long message survives an accidental navigation. */
  var DRAFT_FIELDS = Object.keys(RULES).concat(['piece']);

  function saveDraft() {
    try {
      var d = {};
      DRAFT_FIELDS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) d[id] = el.value;
      });
      localStorage.setItem(DRAFT, JSON.stringify(d));
    } catch (e) { /* storage blocked — the form still works */ }
  }
  function loadDraft() {
    try {
      var d = JSON.parse(localStorage.getItem(DRAFT) || '{}');
      DRAFT_FIELDS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && d[id]) el.value = d[id];
      });
    } catch (e) { /* ignore */ }
  }

  /* order matters: options exist, then the draft restores, then an explicit
     ?id= in the URL wins over both — it is the most recent intent */
  fillPieces();
  loadDraft();
  renderFitConsent();
  applyIncoming();

  document.addEventListener('vola:fit', renderFitConsent);

  /* The cheapest support win there is: answer the three most-asked before the
     message gets written. */
  V.mountHelpBox(document.getElementById('contact-help'),
    ['times', 'window', 'repair-cost'], { title: 'Answered already' });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    sent.hidden = true;
    var bad = Object.keys(RULES).filter(function (id) { return !check(id); });

    if (bad.length) {
      errList.innerHTML = bad.map(function (id) {
        return '<li><a href="#' + id + '">' + esc(RULES[id].label) + ' — ' + esc(RULES[id].msg) + '</a></li>';
      }).join('');
      errSummary.hidden = false;
      errSummary.focus();
      return;
    }

    errSummary.hidden = true;

    /* Keys are written for the inbox that reads them, not for this file —
       Formspree turns them into the labels in the email. The piece is sent by
       name rather than by handle for the same reason: "Sculpt Raw Selvedge
       Jean" is answerable, "sculpt-raw-jean" needs looking up. */
    var consent = document.getElementById('send-sizes');
    var piece = pieceEl && pieceEl.value ? V.byId(pieceEl.value) : null;
    var fields = {
      Name: document.getElementById('name').value.trim(),
      Email: document.getElementById('email').value.trim(),
      About: subjectEl.value,
      Piece: piece ? piece.name : null,
      Message: messageEl.value.trim(),
      /* Only when they ticked the box. It is their body, not our data. */
      'Saved sizes': consent && consent.checked ? V.fit.summaryLine() : null
    };

    V.forms.submit({
      form: form, button: btn, sent: sent, failed: failed,
      draftKey: DRAFT,
      subject: subjectEl.value,
      fields: fields,
      gotcha: gotcha ? gotcha.value : '',
      toast: 'Message sent to the atelier',
      after: renderFitConsent
    });
  });

  errList.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  });
})();
