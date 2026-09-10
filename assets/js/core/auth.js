/* VOLÀ — the session layer.

   ═══════════════════════════════════════════════════════════════════════
   ⚠  READ THIS BEFORE SHIPPING ANYTHING THAT DEPENDS ON IT.

   This file contains NO authentication. It cannot: a static site has no
   server, and any check that runs in the browser is a check the visitor
   controls. Everything below is the *interface* to authentication —
   the states, the errors, the timing — with one clearly marked seam where a
   real provider goes.

   What that means concretely:

   • The demo `signIn` accepts any well-formed input. There is no user
     database and no password is ever stored, hashed or otherwise — the
     password variable is dropped the moment the call resolves.
   • The "session" is a name and an email in web storage. It gates nothing.
     Anyone can write one from the console. Do not use it to hide anything.
   • The lockout after repeated failures is UI, not defence. Real rate
     limiting has to happen on the server, per-IP and per-account.

   To make it real, replace the three functions marked `SEAM` with calls to
   your provider (Auth0, Clerk, Supabase, WorkOS, your own API). The session
   should then come back as an httpOnly, Secure, SameSite=Lax cookie that
   this file never sees, and `VOLA.auth.user` should be hydrated from a
   `/me` endpoint rather than from storage.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VOLA = (window.VOLA = window.VOLA || {});
  var KEY = 'vola.session.v1';
  var FAILS = 'vola.signin.fails.v1';

  var LOCK_AFTER = 5;          /* failed attempts before the form locks */
  var LOCK_SECONDS = 30;       /* how long it stays locked */
  var MIN_PASSWORD = 8;

  /* ------------------------------------------------------------- storage */
  /* "Stay signed in" is the one part of this that is genuinely meaningful
     client-side: localStorage survives the browser closing, sessionStorage
     does not. On a shared machine that distinction is the whole point, so
     the checkbox says what it actually does. */
  function store(remember) {
    try { return remember ? window.localStorage : window.sessionStorage; }
    catch (e) { return null; }
  }

  function readSession() {
    var raw = null;
    try { raw = window.sessionStorage.getItem(KEY) || window.localStorage.getItem(KEY); }
    catch (e) { return null; }
    if (!raw) return null;
    try {
      var v = JSON.parse(raw);
      return v && v.email ? v : null;
    } catch (e) { return null; }
  }

  function writeSession(user, remember) {
    clearSession();
    if (user) {
      var s = store(remember);
      try { if (s) s.setItem(KEY, JSON.stringify(user)); } catch (e) { /* non-fatal */ }
    }
    auth.user = user;
    document.dispatchEvent(new CustomEvent('vola:auth', { detail: user }));
  }

  function clearSession() {
    try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    try { window.sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------ attempt counter */
  function fails() {
    try { return JSON.parse(window.localStorage.getItem(FAILS) || '{"n":0,"until":0}'); }
    catch (e) { return { n: 0, until: 0 }; }
  }
  function setFails(v) {
    try { window.localStorage.setItem(FAILS, JSON.stringify(v)); } catch (e) { /* ignore */ }
  }

  /* seconds remaining on the soft lock, or 0 */
  function lockedFor() {
    var f = fails();
    var left = Math.ceil((f.until - Date.now()) / 1000);
    return left > 0 ? left : 0;
  }

  function noteFailure() {
    var f = fails();
    f.n += 1;
    if (f.n >= LOCK_AFTER) {
      f.until = Date.now() + LOCK_SECONDS * 1000;
      f.n = 0;
    }
    setFails(f);
  }

  function clearFailures() { setFails({ n: 0, until: 0 }); }

  /* -------------------------------------------------------- validation */
  /* Deliberately permissive: the only authority on whether an address
     exists is the mail server. Rejecting valid-but-unusual addresses is a
     far more common bug than accepting a typo. */
  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim()); }

  /* Length only, and no composition rules. NIST dropped the "one uppercase,
     one symbol" advice years ago: it pushes people towards Passw0rd! and
     away from passphrases. Length and a breached-password check (server
     side, against Have I Been Pwned or equivalent) is the current guidance. */
  function passwordProblem(s) {
    if (!s) return 'Enter your password.';
    if (String(s).length < MIN_PASSWORD) {
      return 'Use at least ' + MIN_PASSWORD + ' characters. A phrase you will remember beats a short jumble.';
    }
    return null;
  }

  /* An honest, non-blocking strength read for the register form. */
  function strength(s) {
    s = String(s || '');
    if (!s) return { score: 0, label: '' };
    var score = 0;
    if (s.length >= MIN_PASSWORD) score++;
    if (s.length >= 14) score++;
    if (s.length >= 20 || /\s/.test(s)) score++;   /* passphrases score well */
    if (/[^A-Za-z0-9]/.test(s) && s.length >= 12) score++;
    score = Math.min(score, 4);
    return {
      score: score,
      label: ['Too short', 'Weak', 'Acceptable', 'Good', 'Strong'][score]
    };
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var auth = VOLA.auth = {
    user: readSession(),
    minPassword: MIN_PASSWORD,
    lockAfter: LOCK_AFTER,
    validEmail: validEmail,
    passwordProblem: passwordProblem,
    strength: strength,
    lockedFor: lockedFor,

    isSignedIn: function () { return !!auth.user; },

    /* Write or clear the session. Public because shopify.js replaces the
       seams below with real Shopify calls and needs to record the result —
       it is the one part of this file a provider still has to reach. */
    set: function (user, remember) { writeSession(user, remember); },

    /* Set true from the console to exercise the failure and lockout UI:
       VOLA.auth.demoFail = true  */
    demoFail: false,

    /* ═══════════════════════════════════ SEAM 1 of 3 ═══════════════════
       Replace with your provider's sign-in. It must:
         • verify server-side, never here;
         • return a generic failure — never reveal whether the address is
           registered, which is an account-enumeration leak;
         • set an httpOnly Secure SameSite=Lax session cookie;
         • enforce rate limiting per IP and per account.
       Resolve with the user, or reject with an Error whose message is safe
       to show. The password argument must not be stored or logged. */
    signIn: function (email, password, remember) {
      var left = lockedFor();
      if (left) {
        return Promise.reject(new Error('Too many attempts. Try again in ' + left + ' seconds.'));
      }
      return wait(700).then(function () {
        if (auth.demoFail) {
          noteFailure();
          /* one message for every failure mode, on purpose */
          throw new Error('That email and password do not match. Check both and try again.');
        }
        clearFailures();
        var user = {
          email: String(email).trim().toLowerCase(),
          name: null,
          since: new Date().toISOString().slice(0, 10),
          demo: true
        };
        writeSession(user, remember);
        return user;
      });
    },

    /* ═══════════════════════════════════ SEAM 2 of 3 ═══════════════════
       Replace with your provider's registration. It must:
         • check the password against a breached-password list (Have I Been
           Pwned's range API, or your provider's equivalent);
         • send a verification email and NOT sign the person in until the
           address is verified — an unverified account is a bounced order
           confirmation and, at scale, a spam-relay complaint;
         • record consent with a timestamp and the wording shown, because
           "they ticked a box" is not a defensible record of what they agreed
           to;
         • respond identically whether or not the address is already
           registered, and tell the existing account by email instead. A
           "that email is taken" message is the same enumeration leak as a
           specific sign-in error.
       Resolves with what to show next, not with a session. */
    register: function (details) {
      return wait(900).then(function () {
        clearFailures();
        return {
          email: String(details.email).trim().toLowerCase(),
          name: String(details.name || '').trim() || null,
          verificationSent: true
        };
      });
    },

    /* Re-send the verification email. Rate limited server-side in a real
       implementation; the UI here throttles the button either way. */
    resendVerification: function (email) {
      return wait(700).then(function () { return true; });
    },

    /* ═══════════════════════════════════ SEAM 3 of 3 ═══════════════════
       Replace with your provider's reset request. It must always resolve the
       same way whether or not the address is registered — the response is
       the other half of the enumeration leak. */
    requestReset: function (email) {
      return wait(700).then(function () { return true; });
    },

    /* Passkeys are the current recommendation and cannot be faked from a
       static file: WebAuthn needs a server-issued challenge. The button is
       shown when the browser supports it and says plainly that the server
       half is missing, rather than pretending to sign anybody in. */
    passkeysAvailable: function () {
      return typeof window.PublicKeyCredential === 'function';
    },
    signInWithPasskey: function () {
      return Promise.reject(new Error(
        'Passkeys need a challenge from the server, which this preview has no way to issue. ' +
        'Wire VOLA.auth.signInWithPasskey() to your provider to enable it.'));
    },

    signOut: function () {
      writeSession(null, false);
      return Promise.resolve();
    }
  };

  /* Signed in or out in another tab — reflect it here rather than leaving
     two tabs disagreeing about who is using them. */
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    auth.user = readSession();
    document.dispatchEvent(new CustomEvent('vola:auth', { detail: auth.user }));
  });
})();
