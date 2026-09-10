/* VOLÀ — made to measure.

   The house's highest-value product used to be four lines in a sidebar on the
   contact page. Everything here is built from the same data those four lines
   were: VOLA.disciplines for what can be commissioned and what it costs,
   VOLA.commissionSteps for the six weeks, VOLA.house for the particulars. The
   page states no price and no timeline of its own. */
(function () {
  'use strict';

  var V = window.VOLA, esc = V.esc;
  var H = V.house;

  var offered = V.disciplines.filter(function (d) { return d.from != null; });

  /* ------------------------------------------------- the price floor */
  /* Named in the first screen deliberately. A commission is a long
     conversation and both sides lose if it starts without the number. */
  function renderFloor() {
    var host = document.getElementById('mtm-floor');
    if (!host || !offered.length) return;
    host.innerHTML = offered.map(function (d) {
      return '<span class="floor"><span class="floor__label">' + esc(d.label) + '</span>' +
        '<span class="floor__price num">from ' + V.money(d.from) + '</span></span>';
    }).join('');
  }

  /* --------------------------------------------------- what we make */
  /* Offered and not-offered are the same list, because a page that shows only
     what it sells leaves the visitor to guess about everything else — and
     someone who wants bespoke boots deserves a straight answer, not silence. */
  function renderDisciplines() {
    var host = document.getElementById('disciplines');
    if (!host) return;

    host.innerHTML = V.disciplines.map(function (d) {
      var cats = d.categories.map(V.catLabel).join(' · ');
      var rtw = V.priceRange(d.categories);
      var offeredHere = d.from != null;

      /* the ready-to-wear the from-price is quoted against, said plainly:
         a commission that costs less than a coat on the shelf is worth
         knowing about, and so is one that costs twice as much */
      var compare = offeredHere && rtw
        ? '<p class="discipline__compare">Ready-to-wear in these categories runs ' +
            rtw.label + '.</p>'
        : '';

      return '<article class="discipline' + (offeredHere ? '' : ' discipline--none') + '">' +
        '<p class="discipline__cats">' + esc(cats) + '</p>' +
        '<h3 class="discipline__name">' + esc(d.label) + '</h3>' +
        '<p class="discipline__price num">' +
          (offeredHere ? 'From ' + V.money(d.from) : 'Not commissioned') + '</p>' +
        '<p class="discipline__lead">' + esc(d.lead) + '</p>' +
        '<p class="discipline__detail">' + esc(d.detail) + '</p>' +
        compare +
      '</article>';
    }).join('');

    V.stagger(host.querySelectorAll('.discipline'));
  }

  /* ------------------------------------------------------ the process */
  /* Week numbers, not step numbers. "Stage 3 of 5" tells you where you are in
     a list; "week 3" tells you when the thing will be ready. */
  function renderProcess() {
    var host = document.getElementById('process');
    if (!host) return;
    host.innerHTML = V.commissionSteps.map(function (s) {
      return '<li class="step">' +
        '<p class="step__week num">' + (s.week === 0 ? 'Day one' : 'Week ' + s.week) + '</p>' +
        '<h3 class="step__title">' + esc(s.title) + '</h3>' +
        '<p class="step__body">' + esc(s.body) + '</p>' +
      '</li>';
    }).join('');
    V.stagger(host.querySelectorAll('.step'));
  }

  /* ---------------------------------------------------------- terms */
  function renderTerms() {
    var host = document.getElementById('terms-list');
    if (!host) return;

    var items = [
      { icon: 'scissors', title: 'It is cut for you alone',
        body: 'A commissioned piece is made to your measurements on a pattern that exists ' +
              'only for you. It cannot be resold and it cannot be returned — there is no ' +
              'second person it would fit. The ' + V.terms.returnsDays + '-day return that ' +
              'covers the collection does not apply here.' },
      { icon: 'box', title: 'Nothing is charged until the first fitting',
        body: 'The consultation is free and carries no obligation. A deposit is taken at the ' +
              'first fitting, once the brief and the estimate are agreed, and the balance ' +
              'falls due on delivery. Say no at any point before that deposit and you owe ' +
              'us nothing.' },
      { icon: 'truck', title: V.numberWord(H.fittingWeeks, true) + ' weeks, honestly quoted',
        body: 'From first fitting to delivery is about ' + V.numberWord(H.fittingWeeks) +
              ' weeks. Corsetry with hand-set eyelets runs longer. If we are going to miss a ' +
              'date that matters to you, we will tell you before you commit rather than after.' },
      { icon: 'leaf', title: 'Repaired for life, like everything else',
        body: 'A commission carries the same repair promise as the collection: send it back to ' +
              'Florence and we will mend it, free, for as long as you own it. Your pattern is ' +
              'kept on file, so an alteration years later is straightforward.' }
    ];

    host.innerHTML = items.map(function (it, i) {
      return '<div class="value" data-reveal style="--reveal-delay:' + (i * 60) + 'ms">' +
        '<span class="value__icon">' + V.icon(it.icon) + '</span>' +
        '<h3>' + it.title + '</h3>' +
        '<p>' + it.body + '</p>' +
      '</div>';
    }).join('');
    V.stagger(host.querySelectorAll('.value'));
  }

  /* ------------------------------------------------------ the aside */
  function renderPrices() {
    var host = document.getElementById('mtm-prices');
    if (!host) return;
    host.innerHTML = offered.map(function (d) {
      return '<p class="pricerow"><span>' + esc(d.label) + '</span>' +
        '<span class="num">' + V.money(d.from) + '</span></p>';
    }).join('') +
    '<p class="field__hint" style="text-transform:none;letter-spacing:0;margin-top:var(--space-2)">' +
      'Estimates are given at the consultation and depend on cloth and construction.</p>';
  }

  /* -------------------------------------------------------- the form */
  var form = document.getElementById('mtm-form');
  if (!form) return;

  var errSummary = document.getElementById('err-summary');
  var errList = document.getElementById('err-list');
  var sent = document.getElementById('sent-note');
  var failed = document.getElementById('failed-note');
  var gotcha = document.getElementById('company');
  var btn = document.getElementById('mtm-send');
  var disciplineEl = document.getElementById('discipline');
  var priceHint = document.getElementById('discipline-price');
  var briefEl = document.getElementById('brief');
  var DRAFT = 'vola.mtm.draft';

  var RULES = {
    name:       { label: 'Your name',  msg: 'Enter your name.' },
    email:      { label: 'Email',      msg: 'Enter an email address in the format name@example.com.' },
    discipline: { label: 'Discipline', msg: 'Choose what you would like made.' },
    brief:      { label: 'Your brief', msg: 'A sentence or two about what you have in mind.' }
  };

  function fillDisciplines() {
    disciplineEl.insertAdjacentHTML('beforeend', offered.map(function (d) {
      return '<option value="' + esc(d.id) + '">' + esc(d.label) + '</option>';
    }).join('') +
    '<option value="unsure">I am not sure yet</option>');
  }

  /* The from-price follows the choice, so the number is in front of someone at
     the moment they are deciding rather than several screens above it. */
  function showPrice() {
    var d = offered.filter(function (x) { return x.id === disciplineEl.value; })[0];
    if (!d) { priceHint.hidden = true; priceHint.textContent = ''; return; }
    var rtw = V.priceRange(d.categories);
    priceHint.hidden = false;
    priceHint.textContent = d.label + ' starts at ' + V.money(d.from) +
      (rtw ? ', against ' + rtw.label + ' ready-to-wear.' : '.');
  }

  function renderFitConsent() {
    var host = document.getElementById('fit-consent');
    if (!host) return;
    var line = V.fit.summaryLine();
    if (!line) { host.innerHTML = ''; host.hidden = true; return; }
    host.hidden = false;
    /* Measurements are taken properly at the fitting; these only help the
       atelier judge the brief before you arrive. Off by default either way. */
    host.innerHTML =
      '<label class="checkline" for="send-sizes">' +
        '<input type="checkbox" id="send-sizes">' +
        '<span>Include my saved sizes — <b>' + esc(line) + '</b>. ' +
        'We will measure you properly at the fitting; this only helps us read your brief. ' +
        '<a href="privacy.html#sizes">How we handle measurements</a>.</span>' +
      '</label>';
  }

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

  function saveDraft() {
    try {
      var d = {};
      Object.keys(RULES).concat(['when', 'where']).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) d[id] = el.value;
      });
      localStorage.setItem(DRAFT, JSON.stringify(d));
    } catch (e) { /* storage blocked — the form still works */ }
  }
  function loadDraft() {
    try {
      var d = JSON.parse(localStorage.getItem(DRAFT) || '{}');
      Object.keys(d).forEach(function (id) {
        var el = document.getElementById(id);
        if (el && d[id]) el.value = d[id];
      });
    } catch (e) { /* ignore */ }
  }

  /* A visitor arriving from a product page brings the piece with them; name it
     in the brief so they are not asked to describe what they were looking at. */
  function applyIncoming() {
    var id = new URLSearchParams(location.search).get('id');
    if (!id) return;
    var product = V.byId(id);
    if (!product) return;
    var d = offered.filter(function (x) {
      return x.categories.indexOf(product.category) > -1;
    })[0];
    if (d && !disciplineEl.value) disciplineEl.value = d.id;
    if (briefEl && !briefEl.value.trim()) {
      briefEl.value = 'I have been looking at the ' + product.name +
        ' and would like something along those lines, cut to my measurements.\n\n';
      briefEl.setSelectionRange(briefEl.value.length, briefEl.value.length);
    }
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
  disciplineEl.addEventListener('change', function () {
    showPrice();
    if (disciplineEl.getAttribute('aria-invalid') === 'true') check('discipline');
    saveDraft();
  });
  ['when', 'where'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', saveDraft);
  });

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

    /* Same transport as the contact form, which is what the seam here always
       claimed to be — it just never sent anything. Keys are the labels in the
       email the atelier reads. */
    var consent = document.getElementById('send-sizes');
    var discipline = (V.disciplines.filter(function (d) {
      return d.id === disciplineEl.value || d.label === disciplineEl.value;
    })[0] || {}).label || disciplineEl.value;

    var fields = {
      Name: document.getElementById('name').value.trim(),
      Email: document.getElementById('email').value.trim(),
      Discipline: discipline,
      When: document.getElementById('when').value,
      Where: document.getElementById('where').value,
      Brief: briefEl.value.trim(),
      'Saved sizes': consent && consent.checked ? V.fit.summaryLine() : null
    };

    V.forms.submit({
      form: form, button: btn, sent: sent, failed: failed,
      draftKey: DRAFT,
      /* a comma, not a dash: the prefix already contributes one, and
         "VOLÀ — Commission — Corsetry" reads like a stutter in an inbox */
      subject: 'Commission, ' + discipline,
      fields: fields,
      gotcha: gotcha ? gotcha.value : '',
      toast: 'Request sent to the atelier',
      after: function () { showPrice(); renderFitConsent(); }
    });
  });

  errList.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  });

  document.addEventListener('vola:fit', renderFitConsent);

  /* boot ------------------------------------------------------------- */
  renderFloor();
  renderDisciplines();
  renderProcess();
  renderTerms();
  renderPrices();
  fillDisciplines();
  loadDraft();
  applyIncoming();
  showPrice();
  renderFitConsent();
})();
