/* VOLÀ — the newsletter.

   What this replaced: a submit handler that validated the address, cleared
   the field and said "Thank you — you are on the list". No request was made.
   Nobody was on any list. It is the same defect as the invented reviews —
   a claim with nothing behind it — and it sat in the footer of all fifteen
   pages.

   Klaviyo, at runtime. Runtime rather than build time because a signup is an
   action rather than data, and safe in the browser because Klaviyo publishes
   a key for precisely this: the public company ID subscribes an address to
   one named list and can do nothing else. (Contrast Judge.me, whose token
   reads and writes every review on the shop, which is why reviews are synced
   by a build tool instead.)

   The care here is all in one place: never say more than the response
   supports. Klaviyo answers 202 Accepted, which means "we have your
   request" — on a double opt-in list nobody has joined anything until they
   click a link in an email. So the wording follows the list's configuration,
   and the site says "check your email" unless it is told otherwise. */
(function () {
  'use strict';

  var V = window.VOLA;
  var KEY = 'vola.news.v1';
  var ENDPOINT = 'https://a.klaviyo.com/client/subscriptions/';

  function cfg() { return V.klaviyoConfig || {}; }
  function ready() { return V.newsletterReady && V.newsletterReady(); }

  /* Same split as assets/js/core/forms.js: the reader gets a plain sentence, and
     anything that names a file, a config key or an implementation detail
     travels only as `.hint`, surfaced by console.warn in the catch below.
     Without this, a wrong companyId/listId used to print straight into the
     page a visitor sees. */
  function err(message, hint) {
    var e = new Error(message);
    if (hint) e.hint = hint;
    return e;
  }

  /* ------------------------------------------------------------- storage */
  /* The footer is on every page, so a subscriber who is not remembered gets
     asked again on all fifteen. Their own address, in their own browser —
     the same treatment the bag and the fit profile already get. */
  function remembered() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch (e) { return null; }
  }
  function remember(rec) {
    try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) {}
  }
  function forget() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  /* ------------------------------------------------------------ transport */
  /* Klaviyo's client endpoint. 202 is the only success, and it carries no
     body — there is nothing to read back, which is exactly why the wording
     has to come from configuration rather than from the response. */
  function subscribe(email, source) {
    var c = cfg();
    if (!ready()) {
      return Promise.reject(err(
        'The newsletter is not connected yet, so nothing was sent.',
        'Add your Klaviyo companyId and listId to assets/js/integrations/shopify-config.js — see docs/NEWSLETTER.md.'));
    }

    var body = {
      data: {
        type: 'subscription',
        attributes: {
          /* Named so the list shows where each address came from rather than
             fifteen identical "website" rows. */
          custom_source: source || 'Website',
          profile: {
            data: { type: 'profile', attributes: { email: email } }
          }
        },
        relationships: {
          list: { data: { type: 'list', id: c.listId } }
        }
      }
    };

    return fetch(ENDPOINT + '?company_id=' + encodeURIComponent(c.companyId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        revision: c.revision || '2024-10-15'
      },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (res.status === 202 || res.ok) return { pending: c.doubleOptIn !== false };

      /* Each failure gets its own sentence. "Something went wrong" tells a
         reader nothing about whether to retype the address or come back
         later, and the two need different actions. */
      if (res.status === 400) {
        return res.json().catch(function () { return null; }).then(function (b) {
          var detail = b && b.errors && b.errors[0] && b.errors[0].detail;
          throw err(detail && /email/i.test(detail)
            ? 'That address was refused. Please check it and try again.'
            : 'That address could not be added. Please check it and try again.');
        });
      }
      if (res.status === 429) throw err('Too many attempts just now. Try again in a minute.');
      if (res.status === 401 || res.status === 403) {
        throw err('The newsletter is misconfigured and nothing was sent.',
          'The Klaviyo API answered ' + res.status +
          ' — check companyId and listId in assets/js/integrations/shopify-config.js.');
      }
      throw err('The list could not be reached. Nothing was sent — please try again.');
    }, function () {
      /* fetch itself rejected: offline, DNS, blocked by a content blocker.
         Distinct from a refusal by Klaviyo, and the reader can act on it. */
      throw err('Could not reach the list. Check your connection and try again.');
    });
  }

  /* ------------------------------------------------------------------ UI */
  var SUBSCRIBED = 'You are on the list.';
  var PENDING = 'Almost — check your email and confirm.';

  function settledMarkup(rec) {
    var line = rec.state === 'pending'
      ? 'Confirmation sent to <strong>' + V.esc(rec.email) + '</strong>. ' +
        'Click the link in it to join — nothing arrives until you do.'
      : 'You are on the list as <strong>' + V.esc(rec.email) + '</strong>.';
    return '<p class="newsletter__done">' + V.icon('check') + '<span>' + line + '</span></p>' +
      '<button class="newsletter__again" type="button" data-news-reset>Use a different address</button>';
  }

  function mount(form) {
    var input = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');
    var host = form.parentNode;
    var source = form.getAttribute('data-newsletter') || 'Website';

    /* The status line is the accessible half of the toast: a toast is polite
       and transient, and a failed signup is neither. */
    var status = document.createElement('p');
    status.className = 'newsletter__status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;
    form.insertAdjacentElement('afterend', status);

    function say(message, bad) {
      status.textContent = message;
      status.classList.toggle('is-bad', !!bad);
      status.hidden = false;
    }

    function settle(rec) {
      var done = document.createElement('div');
      done.className = 'newsletter__settled';
      done.innerHTML = settledMarkup(rec);
      form.hidden = true;
      status.hidden = true;
      host.insertBefore(done, status);
      done.querySelector('[data-news-reset]').addEventListener('click', function () {
        forget();
        done.remove();
        form.hidden = false;
        input.value = '';
        input.focus();
      });
    }

    var known = remembered();
    if (known && known.email) settle(known);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input.value || '').trim();

      if (!input.checkValidity() || !email) {
        input.setAttribute('aria-invalid', 'true');
        say('Please enter a valid email address.', true);
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');

      /* In flight: the button is the only thing that can be pressed twice,
         and a second press would be a second subscription request. */
      button.disabled = true;
      form.setAttribute('aria-busy', 'true');
      var label = button.textContent;
      button.textContent = 'Joining…';
      say('Sending…');

      subscribe(email, source).then(function (result) {
        var rec = { email: email, state: result.pending ? 'pending' : 'subscribed', at: new Date().toISOString() };
        remember(rec);
        /* the page it came from, and whether it still needs confirming.
           Not the address — that is between them and the list. */
        if (V.track) V.track('Newsletter signup', { from: source, state: rec.state });
        V.toast(result.pending ? PENDING : SUBSCRIBED);
        settle(rec);
      }).catch(function (e) {
        say(e.message, true);
        /* A wrong key or an unconfigured list is a developer's problem, not
           the visitor's, and the console is where a developer will look for
           it — never the sentence the visitor just read. */
        if (e.hint) console.warn('[VOLÀ] newsletter: ' + e.hint);
        input.focus();
      }).then(function () {
        button.disabled = false;
        button.textContent = label;
        form.removeAttribute('aria-busy');
      });
    });
  }

  /* --------------------------------------------------------------- public */
  V.newsletter = { ready: ready, subscribe: subscribe, remembered: remembered, forget: forget };

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-newsletter]'), mount);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
