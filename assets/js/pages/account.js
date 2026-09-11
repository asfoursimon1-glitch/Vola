/* VOLÀ — the account page.

   Three states in one document, no reloads between them: sign in, reset, and
   signed in. Switching keeps whatever has already been typed, because the
   commonest reason to switch is realising you are on the wrong one — and
   losing the email you just typed for that is infuriating.

   Creating an account is register.html: it needs consent ticks, a strength
   read and a verification step that do not belong in a sign-in box, and it
   deserves a URL that can be linked from an email.

   The authentication behind it is not real. See the header of auth.js. */
(function () {
  'use strict';

  var V = window.VOLA, esc = V.esc;
  var A = V.auth;
  var root = document.getElementById('auth-root');
  var lede = document.getElementById('auth-lede');
  var heading = document.getElementById('auth-h');

  /* The preview banner says nothing here authenticates anyone. With a hosted
     sign-in configured that is no longer true — it is authentication, just
     not on this page — so the banner goes rather than contradicting the
     button beneath it. Removed, not hidden: it should not be in the
     accessibility tree either. */
  function dropDemoBanner() {
    var note = document.querySelector('[data-devnote="demo-auth"]');
    if (note && note.parentNode) note.parentNode.removeChild(note);
  }

  /* Where to go after signing in. Only ever a same-origin path from this
     site — an open redirect is a phishing gift, so anything with a scheme,
     a host, or a leading slash-slash is discarded. */
  function safeNext() {
    var raw = new URLSearchParams(location.search).get('next') || '';
    if (!raw || /^[a-z]+:/i.test(raw) || raw.indexOf('//') === 0) return 'index.html';
    if (!/^[\w.-]+\.html([?#].*)?$/.test(raw)) return 'index.html';
    return raw;
  }

  var view = new URLSearchParams(location.search).get('view') || 'signin';
  /* registration has its own page now; keep the old link working rather than
     leaving it to fall through to the sign-in form */
  if (view === 'register') {
    location.replace('register.html' + location.hash);
    return;
  }
  /* survives a view switch */
  var draft = { email: '' };

  /* ------------------------------------------------------------- pieces */

  function summary() {
    return '<div class="error-summary" id="err-summary" tabindex="-1" hidden>' +
      '<h2>There is a problem</h2><ul id="err-list"></ul></div>';
  }

  /* One region for everything the form has to say back — failures, lockouts,
     the passkey explanation, the reset confirmation. role="status" so it is
     announced without stealing focus. */
  function statusRegion() {
    return '<p class="authstatus" id="auth-status" role="status" aria-live="polite" hidden></p>';
  }

  function passkeyButton() {
    if (!A.passkeysAvailable()) return '';
    return '<button class="btn btn--ghost btn--block" type="button" id="passkey">' +
      V.icon('check') + 'Sign in with a passkey</button>' +
      '<p class="authdivider"><span>or with your email</span></p>';
  }

  /* --------------------------------------------------------------- views */

  /* The hand-off, when the store runs Shopify's new customer accounts.

     No form, because there is nothing this page could collect: those
     accounts have no password, and the two ways in — Shop, and a one-time
     code by email — are issued by Shopify on a page it controls. Drawing a
     password box here, or buttons labelled Google and Apple that Shopify
     does not offer, would be a shopfront with nothing behind it.

     The options are named anyway rather than hidden behind "Continue",
     because "sign in on another site" is exactly the shape of a phishing
     step, and someone who knows what is coming can tell the difference. */
  function hostedView() {
    heading.textContent = 'Sign in';
    lede.textContent = 'Your orders and addresses live with your account. ' +
      'It is never required to buy anything.';

    return '<div class="stack">' +
      '<ul class="authgains">' +
        '<li>Continue with <b>Shop</b>, if you already use it</li>' +
        '<li>Or have a <b>one-time code</b> sent to your email — there is no ' +
          'password to remember, or to lose</li>' +
      '</ul>' +

      '<a class="btn btn--primary btn--block" href="' + esc(A.hosted) + '">' +
        'Continue to sign in</a>' +

      '<p class="authnote">' + V.icon('alert') +
        '<span>Sign-in is handled by Shopify, who run the shop and the checkout, ' +
        'so the address bar will read <code>shopify.com</code>. Creating an account ' +
        'happens on the same page — there is no separate form. ' +
        '<a class="link-u" href="privacy.html">What Shopify receives</a>.</span></p>' +
    '</div>';
  }

  function signInView() {
    heading.textContent = 'Sign in';
    lede.textContent = 'An account keeps your measurements, your commissions and your order ' +
      'history in one place. It is never required to buy anything.';

    return '<form id="auth-form" novalidate>' +
      summary() + statusRegion() +
      passkeyButton() +
      V.formField({ id: 'email', label: 'Email', type: 'email', inputmode: 'email',
              autocomplete: 'username', value: draft.email }) +
      V.formField({ id: 'password', label: 'Password', password: true,
              autocomplete: 'current-password' }) +
      '<p class="capslock" id="capslock" hidden>' + V.icon('alert') +
        '<span>Caps Lock is on.</span></p>' +

      '<div class="authrow">' +
        '<label class="checkline checkline--tight" for="remember">' +
          '<input type="checkbox" id="remember">' +
          '<span>Stay signed in <b>on this device</b></span>' +
        '</label>' +
        '<button class="link-u" type="button" data-view="reset">Forgotten your password?</button>' +
      '</div>' +

      '<button class="btn btn--primary btn--block" type="submit" id="submit">Sign in</button>' +

      '<p class="authswitch">New here? ' +
        '<a class="link-u" href="register.html">Create an account</a>' +
      '</p>' +
    '</form>';
  }

  function resetView() {
    heading.textContent = 'Reset your password';
    lede.textContent = 'Tell us the address on the account and we will send a link to it.';

    return '<form id="auth-form" novalidate>' +
      summary() + statusRegion() +
      V.formField({ id: 'email', label: 'Email', type: 'email', inputmode: 'email',
              autocomplete: 'username', value: draft.email }) +
      '<button class="btn btn--primary btn--block" type="submit" id="submit">Send the link</button>' +
      '<p class="authswitch">' +
        '<button class="link-u" type="button" data-view="signin">Back to sign in</button>' +
      '</p>' +
    '</form>';
  }

  function signedInView() {
    var u = A.user;
    heading.textContent = u.name ? 'Hello, ' + u.name : 'You are signed in';
    lede.textContent = 'Signed in as ' + u.email + '.';

    var fit = V.fit && V.fit.summaryLine ? V.fit.summaryLine() : '';

    return '<div class="signedin">' +
      statusRegion() +
      '<dl class="signedin__facts">' +
        '<div><dt>Email</dt><dd>' + esc(u.email) + '</dd></div>' +
        '<div><dt>Member since</dt><dd class="num">' + esc(u.since) + '</dd></div>' +
        '<div><dt>Saved sizes</dt><dd>' + (fit ? esc(fit) : 'None yet') + '</dd></div>' +
      '</dl>' +

      '<p class="authnote">' + V.icon('alert') + '<span>Order history and measurements synced ' +
        'across devices arrive with a real backend. Right now your sizes still live in this ' +
        'browser only, and this session gates nothing.</span></p>' +

      '<div class="signedin__actions">' +
        '<a class="btn btn--primary" href="shop.html">Continue shopping</a>' +
        '<a class="btn btn--ghost" href="fit.html">Your measurements</a>' +
        '<button class="btn btn--ghost" type="button" id="signout">Sign out</button>' +
      '</div>' +
    '</div>';
  }

  /* ------------------------------------------------------------ rendering */

  var VIEWS = { signin: signInView, reset: resetView };

  function render() {
    /* The hand-off has no form and no session of its own, so it short-circuits
       both branches below — there is nothing to bind and nothing to validate. */
    if (A.hosted) {
      dropDemoBanner();
      root.innerHTML = hostedView();
      document.title = heading.textContent + ' — VOLÀ';
      renderGains();
      return;
    }

    root.innerHTML = A.isSignedIn() ? signedInView() : (VIEWS[view] || signInView)();
    /* the tab should say which of the three states you are looking at */
    document.title = heading.textContent + ' — VOLÀ';
    renderGains();
    if (A.isSignedIn()) { bindSignedIn(); return; }
    bindForm();
    var lock = A.lockedFor();
    if (lock) showStatus('Too many attempts. Try again in ' + lock + ' seconds.', 'warn');
  }

  function renderGains() {
    var host = document.getElementById('auth-gains');
    if (!host) return;
    var made = V.products.filter(function (p) { return p.tag === 'atelier'; }).length;

    /* A hosted account is a Shopify account: it carries orders and addresses,
       and nothing else. The fit profile is written to this browser by fit.js
       and is not sent anywhere, so "your measurements on every device" would
       be an outright false promise — the one thing this list must not make.
       It reappears the day a backend actually stores them. */
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
    void made;
  }

  function switchTo(next) {
    keepDraft();
    view = next;
    var u = new URL(location.href);
    if (next === 'signin') u.searchParams.delete('view');
    else u.searchParams.set('view', next);
    history.replaceState(null, '', u);
    render();
    var first = root.querySelector('input:not([type=checkbox])');
    if (first) first.focus();
  }

  function keepDraft() {
    var e = document.getElementById('email');
    var n = document.getElementById('name');
    if (e) draft.email = e.value;
    if (n) draft.name = n.value;
  }

  /* -------------------------------------------------------------- status */
  function showStatus(msg, kind) {
    var el = document.getElementById('auth-status');
    if (!el) return;
    el.hidden = false;
    el.className = 'authstatus' + (kind ? ' is-' + kind : '');
    el.innerHTML = (kind === 'ok' ? V.icon('check') : V.icon('alert')) +
      '<span>' + esc(msg) + '</span>';
  }
  function hideStatus() {
    var el = document.getElementById('auth-status');
    if (el) { el.hidden = true; el.innerHTML = ''; }
  }

  /* ---------------------------------------------------------- validation */
  function rulesFor() {
    var r = {};
    if (view === 'reset') {
      r.email = { label: 'Email', check: function (v) {
        return A.validEmail(v) ? null : 'Enter an email address in the format name@example.com.'; } };
    } else {
      r.email = { label: 'Email', check: function (v) {
        return A.validEmail(v) ? null : 'Enter an email address in the format name@example.com.'; } };
      /* On sign-in, only require that something was typed. Telling someone
         their password is "too short" at the sign-in step leaks the rule and
         helps nobody — the password is either right or it is not. */
      r.password = { label: 'Password', check: function (v) {
        return v ? null : 'Enter your password.'; } };
    }
    return r;
  }

  function checkField(id, rules) {
    var el = document.getElementById(id);
    var err = document.getElementById(id + '-err');
    if (!el || !rules[id]) return true;
    var problem = rules[id].check(el.value);
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

  /* ------------------------------------------------------------- binding */
  function bindForm() {
    var form = document.getElementById('auth-form');
    var rules = rulesFor();
    var errSummary = document.getElementById('err-summary');
    var errList = document.getElementById('err-list');
    var btn = document.getElementById('submit');
    var caps = document.getElementById('capslock');
    var meter = document.getElementById('pw-strength');

    Object.keys(rules).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('blur', function () {
        if (el.value.trim() !== '' || el.getAttribute('aria-invalid') === 'true') checkField(id, rules);
      });
      el.addEventListener('input', function () {
        if (el.getAttribute('aria-invalid') === 'true') checkField(id, rules);
      });
    });

    /* Caps Lock is the single most common cause of a "wrong password" that
       is not wrong, and the browser will not tell anyone. */
    var pw = document.getElementById('password');
    if (pw && caps) {
      ['keydown', 'keyup'].forEach(function (ev) {
        pw.addEventListener(ev, function (e) {
          if (typeof e.getModifierState !== 'function') return;
          caps.hidden = !e.getModifierState('CapsLock');
        });
      });
      pw.addEventListener('blur', function () { caps.hidden = true; });
    }

    if (pw && meter) {
      pw.addEventListener('input', function () {
        var s = A.strength(pw.value);
        meter.querySelector('i').style.width = (s.score / 4 * 100) + '%';
        meter.setAttribute('data-score', s.score);
        meter.querySelector('.pwmeter__label').textContent = s.label;
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideStatus();

      var bad = Object.keys(rules).filter(function (id) { return !checkField(id, rules); });
      if (bad.length) {
        errList.innerHTML = bad.map(function (id) {
          var msg = rules[id].check(document.getElementById(id).value);
          return '<li><a href="#' + id + '">' + esc(rules[id].label) + ' — ' + esc(msg) + '</a></li>';
        }).join('');
        errSummary.hidden = false;
        errSummary.focus();
        return;
      }
      errSummary.hidden = true;

      var email = document.getElementById('email').value.trim();
      var password = pw ? pw.value : '';
      var remember = !!(document.getElementById('remember') || {}).checked;
      var name = (document.getElementById('name') || {}).value || '';

      var label = btn.textContent;
      btn.disabled = true;
      btn.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span>' +
        (view === 'reset' ? 'Sending…' : 'Signing in…');

      var job = view === 'reset' ? A.requestReset(email)
                                : A.signIn(email, password, remember);

      job.then(function () {
        /* the password variable goes out of scope here and is never stored */
        if (view === 'reset') {
          btn.disabled = false;
          btn.textContent = label;
          /* Always the same answer, whether or not the address is registered:
             a different response for a known address is how account lists
             get harvested. */
          showStatus('If that address has an account, a reset link is on its way. ' +
            'It expires in an hour.', 'ok');
          return;
        }
        V.toast('Signed in');
        location.href = safeNext();
      }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = label;
        showStatus(err.message || 'Something went wrong. Try again.', 'warn');
        if (pw) { pw.value = ''; pw.focus(); }
      });
    });

    errList.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    });

    var passkey = document.getElementById('passkey');
    if (passkey) {
      passkey.addEventListener('click', function () {
        hideStatus();
        A.signInWithPasskey().then(function () {
          location.href = safeNext();
        }).catch(function (err) { showStatus(err.message, 'warn'); });
      });
    }
  }

  function bindSignedIn() {
    var out = document.getElementById('signout');
    if (!out) return;
    out.addEventListener('click', function () {
      A.signOut().then(function () {
        V.toast('Signed out');
        view = 'signin';
        render();
      });
    });
  }

  /* view switches and the password toggle are delegated, so they survive
     every re-render */
  root.addEventListener('click', function (e) {
    var sw = e.target.closest('[data-view]');
    if (sw) { switchTo(sw.getAttribute('data-view')); return; }
  });

  V.bindPasswordToggles(root);

  document.addEventListener('vola:auth', render);
  render();
})();
