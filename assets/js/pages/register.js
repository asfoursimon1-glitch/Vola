/* VOLÀ — creating an account.

   Two states: the form, and the check-your-email panel it becomes. The
   account is not signed in on submission, because an unverified address is
   a bounced order confirmation and, at any scale, somebody else's inbox.

   Three deliberate omissions, each of which is a common mistake:

   • No "confirm password" field. A reveal control catches more typos than a
     second box to retype into, and does not cost the abandonment.
   • No composition rules. Length only — NIST dropped "one uppercase, one
     symbol" because it produces Passw0rd! and nothing safer.
   • No "that email is already registered". That is the same account
     enumeration leak as a specific sign-in error; a real implementation
     answers identically either way and emails the existing account instead.

   The authentication behind it is not real. See the header of auth.js. */
(function () {
  'use strict';

  var V = window.VOLA, esc = V.esc;
  var A = V.auth;
  var root = document.getElementById('register-root');
  var heading = document.getElementById('reg-h');
  var lede = document.getElementById('reg-lede');

  /* Someone who already saved measurements in this browser has done the
     hard part; the account should carry them rather than asking again. */
  var localFit = V.fit && V.fit.summaryLine ? V.fit.summaryLine() : '';

  /* ------------------------------------------------------------- the form */
  function formView() {
    return '<form id="reg-form" novalidate>' +

      '<div class="error-summary" id="err-summary" tabindex="-1" hidden>' +
        '<h2>There is a problem</h2><ul id="err-list"></ul></div>' +
      '<p class="authstatus" id="reg-status" role="status" aria-live="polite" hidden></p>' +

      V.formField({ id: 'name', label: 'Your name', autocomplete: 'name', required: false }) +
      V.formField({ id: 'email', label: 'Email', type: 'email', inputmode: 'email',
                    autocomplete: 'username',
                    hint: 'We send order confirmations here, so a typo is expensive.' }) +
      V.formField({ id: 'password', label: 'Password', password: true,
                    autocomplete: 'new-password',
                    describedby: 'password-hint pw-strength',
                    hint: 'At least ' + A.minPassword + ' characters. A phrase you will ' +
                          'remember beats a short jumble — length matters more than symbols.' }) +

      '<div class="pwmeter" id="pw-strength" aria-live="polite">' +
        '<span class="pwmeter__bar"><i></i></span><span class="pwmeter__label"></span></div>' +
      '<p class="capslock" id="capslock" hidden>' + V.icon('alert') +
        '<span>Caps Lock is on.</span></p>' +

      /* only offered if there is actually something to carry across */
      (localFit
        ? '<label class="checkline" for="bring-fit">' +
            '<input type="checkbox" id="bring-fit" checked>' +
            '<span>Bring the measurements saved in this browser — <b>' + esc(localFit) +
            '</b>. You can change them any time in the Fit Studio.</span>' +
          '</label>'
        : '') +

      /* Consent is two separate ticks on purpose. Bundling marketing into
         the terms checkbox is not consent under the GDPR, and it is the
         single most common dark pattern on a sign-up form. Neither is
         pre-ticked. */
      '<fieldset class="consent">' +
        '<legend class="sr-only">Consent</legend>' +
        '<label class="checkline" for="terms">' +
          '<input type="checkbox" id="terms">' +
          '<span>I agree to the <a href="help.html">terms of sale</a> and the ' +
            '<a href="help.html">privacy notice</a>. ' +
            '<span class="req" aria-hidden="true">*</span></span>' +
        '</label>' +
        '<p class="field__error" id="terms-err" hidden></p>' +

        '<label class="checkline" for="news">' +
          '<input type="checkbox" id="news">' +
          '<span>Send me the occasional letter about new cloth and collections. ' +
            'Roughly six a year, and one click to stop.</span>' +
        '</label>' +
      '</fieldset>' +

      '<button class="btn btn--primary btn--block" type="submit" id="submit">Create account</button>' +

      '<p class="authswitch">Already have an account? ' +
        '<a class="link-u" href="account.html">Sign in</a></p>' +
    '</form>';
  }

  /* ----------------------------------------------------- check your email */
  function sentView(result) {
    heading.textContent = 'Check your email';
    lede.textContent = 'We have sent a link to ' + result.email + '. Open it and the account is ' +
      'live — until then there is nothing to sign in to.';

    return '<div class="signedin">' +
      '<p class="authstatus is-ok">' + V.icon('check') +
        '<span>Verification sent to <strong>' + esc(result.email) + '</strong>. ' +
        'The link expires in an hour.</span></p>' +

      '<ul class="authgains">' +
        '<li>Not there in a few minutes? Look in spam — we send from an address you have ' +
          'never had mail from before.</li>' +
        '<li>Wrong address? <a href="register.html">Start again</a> and nothing is kept.</li>' +
      '</ul>' +

      '<p class="authnote">' + V.icon('alert') + '<span>In this preview no email is sent and no ' +
        'account exists. Wire <code>VOLA.auth.register()</code> to a provider to make it ' +
        'real.</span></p>' +

      '<div class="signedin__actions">' +
        '<button class="btn btn--ghost" type="button" id="resend">Send it again</button>' +
        '<a class="btn btn--ghost" href="shop.html">Back to the collection</a>' +
      '</div>' +
    '</div>';
  }

  /* --------------------------------------------------------- validation */
  var RULES = {
    email: { label: 'Email', check: function (v) {
      return A.validEmail(v) ? null : 'Enter an email address in the format name@example.com.'; } },
    password: { label: 'Password', check: A.passwordProblem }
  };

  function checkField(id) {
    var el = document.getElementById(id);
    var err = document.getElementById(id + '-err');
    if (!el || !RULES[id]) return true;
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

  function checkTerms() {
    var el = document.getElementById('terms');
    var err = document.getElementById('terms-err');
    if (el.checked) { el.removeAttribute('aria-invalid'); err.hidden = true; return true; }
    el.setAttribute('aria-invalid', 'true');
    err.hidden = false;
    err.innerHTML = V.icon('alert') +
      '<span>Please agree to the terms and the privacy notice to continue.</span>';
    return false;
  }

  function showStatus(msg, kind) {
    var el = document.getElementById('reg-status');
    if (!el) return;
    el.hidden = false;
    el.className = 'authstatus' + (kind ? ' is-' + kind : '');
    el.innerHTML = (kind === 'ok' ? V.icon('check') : V.icon('alert')) +
      '<span>' + esc(msg) + '</span>';
  }

  /* ------------------------------------------------------------- binding */
  function bindForm() {
    var form = document.getElementById('reg-form');
    var errSummary = document.getElementById('err-summary');
    var errList = document.getElementById('err-list');
    var btn = document.getElementById('submit');
    var pw = document.getElementById('password');
    var caps = document.getElementById('capslock');
    var meter = document.getElementById('pw-strength');

    Object.keys(RULES).forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener('blur', function () {
        if (el.value.trim() !== '' || el.getAttribute('aria-invalid') === 'true') checkField(id);
      });
      el.addEventListener('input', function () {
        if (el.getAttribute('aria-invalid') === 'true') checkField(id);
      });
    });

    document.getElementById('terms').addEventListener('change', function () {
      if (this.getAttribute('aria-invalid') === 'true') checkTerms();
    });

    ['keydown', 'keyup'].forEach(function (ev) {
      pw.addEventListener(ev, function (e) {
        if (typeof e.getModifierState !== 'function') return;
        caps.hidden = !e.getModifierState('CapsLock');
      });
    });
    pw.addEventListener('blur', function () { caps.hidden = true; });

    pw.addEventListener('input', function () {
      var s = A.strength(pw.value);
      meter.querySelector('i').style.width = (s.score / 4 * 100) + '%';
      meter.setAttribute('data-score', s.score);
      meter.querySelector('.pwmeter__label').textContent = s.label;
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var bad = Object.keys(RULES).filter(function (id) { return !checkField(id); });
      var termsOk = checkTerms();

      if (bad.length || !termsOk) {
        var rows = bad.map(function (id) {
          return '<li><a href="#' + id + '">' + esc(RULES[id].label) + ' — ' +
            esc(RULES[id].check(document.getElementById(id).value)) + '</a></li>';
        });
        if (!termsOk) {
          rows.push('<li><a href="#terms">Terms — please agree to the terms and the ' +
            'privacy notice.</a></li>');
        }
        errList.innerHTML = rows.join('');
        errSummary.hidden = false;
        errSummary.focus();
        return;
      }
      errSummary.hidden = true;

      btn.disabled = true;
      btn.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span>Creating…';

      A.register({
        name: document.getElementById('name').value,
        email: document.getElementById('email').value.trim(),
        password: pw.value,
        /* what was agreed to, and when — a real implementation stores this
           with the wording shown, not just a boolean */
        consent: {
          terms: true,
          marketing: document.getElementById('news').checked,
          at: new Date().toISOString()
        },
        bringFit: !!(document.getElementById('bring-fit') || {}).checked
      }).then(function (result) {
        /* the password variable goes out of scope here and is never stored */
        root.innerHTML = sentView(result);
        document.title = 'Check your email — VOLÀ';
        bindSent(result);
        root.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = 'Create account';
        showStatus(err.message || 'Something went wrong. Try again.', 'warn');
      });
    });

    errList.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    });
  }

  function bindSent(result) {
    var again = document.getElementById('resend');
    if (!again) return;
    var label = again.textContent;
    again.addEventListener('click', function () {
      again.disabled = true;
      again.textContent = 'Sending…';
      A.resendVerification(result.email).then(function () {
        again.textContent = 'Sent again';
        /* throttled in the UI as well as on the server: a resend button that
           can be held down is a way to have somebody's inbox flooded */
        setTimeout(function () { again.disabled = false; again.textContent = label; }, 30000);
      });
    });
  }

  function renderGains() {
    var host = document.getElementById('auth-gains');
    if (!host) return;
    /* Same reasoning as account.js: a hosted Shopify account carries orders
       and addresses, never the fit profile, which fit.js keeps in this
       browser and sends nowhere. */
    var gains = A.hosted ? [
      'Your orders, their status and every past one, without an order number',
      'Delivery addresses kept for next time',
      'Repair and alteration requests tied to the piece you actually bought'
    ] : [
      'Your measurements on every device, not just this browser',
      'Order history, and the pattern kept from any commission',
      'Repair requests without digging out an order number'
    ];
    host.innerHTML = gains.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
  }

  /* Hosted accounts: there is no registration form to render. Shopify's page
     signs in and creates an account through the same door — you give an email
     or continue with Shop, and whether an account already existed is its
     business, not a question this page should be asking. That also closes the
     enumeration leak the three omissions above were working around. */
  if (A.hosted) {
    /* the preview banner denies something that now happens, one page over */
    var demoNote = document.querySelector('[data-devnote="demo-auth"]');
    if (demoNote && demoNote.parentNode) demoNote.parentNode.removeChild(demoNote);

    heading.textContent = 'Create an account';
    lede.textContent = 'One step, on the page Shopify runs for the shop. ' +
      'No password is set, and none is ever needed.';
    root.innerHTML = '<div class="stack">' +
      '<ul class="authgains">' +
        '<li>Continue with <b>Shop</b>, if you already use it</li>' +
        '<li>Or give your email and confirm the <b>one-time code</b> sent to it</li>' +
      '</ul>' +
      '<a class="btn btn--primary btn--block" href="' + esc(A.hosted) + '">' +
        'Continue to create your account</a>' +
      '<p class="authnote">' + V.icon('alert') +
        '<span>The address bar will read <code>shopify.com</code> — that is the shop ' +
        'and the checkout, the same place your order is paid for. ' +
        '<a class="link-u" href="privacy.html">What they receive</a>.</span></p>' +
    '</div>';
    renderGains();
    return;
  }

  /* Already signed in? Creating a second account is almost never what was
     meant, so say so rather than letting it happen. */
  if (A.isSignedIn()) {
    heading.textContent = 'You already have an account';
    lede.textContent = 'Signed in as ' + A.user.email + '.';
    root.innerHTML = '<div class="signedin__actions">' +
      '<a class="btn btn--primary" href="account.html">Your account</a>' +
      '<a class="btn btn--ghost" href="shop.html">Continue shopping</a>' +
    '</div>';
    renderGains();
    return;
  }

  root.innerHTML = formView();
  renderGains();
  V.bindPasswordToggles(root);
  bindForm();
})();
