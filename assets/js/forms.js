/* VOLÀ — sending a form.

   Shared by the contact form and the commission request, which had the same
   hand-off seam and the same defect:

       void payload;
       setTimeout(function () {
         form.reset();
         localStorage.removeItem(DRAFT);
         sent.hidden = false;
         V.toast('Message sent to the atelier');
       }, 800);

   Nothing was sent. The 800ms was a fake latency, which made the lie more
   convincing rather than less. And it is worse than the newsletter's version
   of the same bug: this one cleared the field and deleted the saved draft
   first, so someone who spent ten minutes describing a repair lost the text
   and was told the atelier had it. The failure mode is a person waiting for
   a reply that cannot come, to a message that no longer exists.

   So the rules this module exists to enforce:

     1. Nothing is claimed until the endpoint says so.
     2. The draft is deleted only after a confirmed success. On any failure
        the message is exactly where they left it.
     3. A failure offers a way through — the atelier's address, with the
        message already in it — rather than a dead end and an apology. */
(function () {
  'use strict';

  var V = window.VOLA;

  function cfg() { return V.formsConfig || {}; }
  function ready() { return V.formsReady && V.formsReady(); }

  /* --------------------------------------------------------------- send */
  /* `fields` is an ordered plain object: the keys become the labels in the
     email the atelier reads, so they are written for that inbox rather than
     for this codebase. */
  function send(fields, opts) {
    opts = opts || {};

    if (!ready()) {
      return Promise.reject(err(
        'This form is not connected yet, so nothing was sent. Your message has ' +
        'been kept — copy it somewhere safe.',
        'Add a form endpoint to assets/js/shopify-config.js — see CONTACT.md.'));
    }

    var body = {};
    Object.keys(fields).forEach(function (k) {
      if (fields[k] != null && fields[k] !== '') body[k] = fields[k];
    });
    /* Formspree reads _subject for the email subject line and _gotcha as the
       honeypot. Both are conventions of the endpoint, not of this site. */
    body._subject = (cfg().subjectPrefix ? cfg().subjectPrefix + ' — ' : '') +
      (opts.subject || 'Website enquiry');
    if (opts.gotcha) body._gotcha = opts.gotcha;

    return fetch(cfg().endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (res.ok) return true;

      /* Each cause gets its own sentence and its own instruction. "Something
         went wrong" leaves a reader unable to tell whether to fix the address,
         wait a minute, or write to the atelier directly. */
      if (res.status === 422 || res.status === 400) {
        return res.json().catch(function () { return null; }).then(function (b) {
          var first = b && b.errors && b.errors[0];
          throw err(first && first.message
            ? 'The form was refused: ' + first.message
            : 'The form was refused. Please check the address you entered.');
        });
      }
      if (res.status === 429) {
        throw err('Too many messages have been sent from here just now. ' +
          'Wait a minute and send it again — nothing has been lost.');
      }
      if (res.status === 403 || res.status === 404) {
        throw err('This form is misconfigured and nothing was sent. Your message has been kept.',
          'The endpoint answered ' + res.status + ' — check it in assets/js/shopify-config.js.');
      }
      throw err('The message could not be sent. Nothing has been lost — try again.');
    }, function () {
      throw err('Could not reach the atelier. Check your connection and try again — ' +
        'your message has been kept.');
    });
  }

  function err(message, hint) {
    var e = new Error(message);
    if (hint) e.hint = hint;
    return e;
  }

  /* ----------------------------------------------------------- fallback */
  /* A failed send is the one moment someone is most likely to give up, and
     the atelier's address is on the page anyway. Handing them the message
     already written into a mail client costs nothing and rescues the enquiry.
     mailto: has a practical length limit around 2000 characters in some
     clients, so a very long brief is trimmed with a note rather than
     silently truncated. */
  function mailtoHref(subject, fields) {
    var lines = [];
    Object.keys(fields).forEach(function (k) {
      if (fields[k] != null && fields[k] !== '') lines.push(k + ': ' + fields[k]);
    });
    var body = lines.join('\n');
    if (body.length > 1600) body = body.slice(0, 1600) + '\n\n[…trimmed — the rest is still in the form]';
    return 'mailto:' + V.house.email +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  /* Renders the failure into a note the page already owns, with the way out
     attached. Focused rather than announced: a send that did not happen is
     not a polite aside. */
  function showFailure(note, error, subject, fields) {
    note.innerHTML =
      V.icon('alert') +
      '<span>' + V.esc(error.message) +
        ' <a href="' + mailtoHref(subject, fields) + '">Send it by email instead</a>.' +
      '</span>';
    note.hidden = false;
    note.focus();
    if (error.hint) console.warn('[VOLÀ] form: ' + error.hint);
  }

  /* ------------------------------------------------------- the whole flow */
  /* Both forms do exactly the same thing around `send`, so they do it here:
     disable, send, and on success — and only on success — clear the form and
     the draft. `opts.reset` is whatever else the page must repaint afterwards
     (the price panel, the sizes opt-in). */
  function submit(opts) {
    var btn = opts.button;
    var label = btn.textContent;

    opts.sent.hidden = true;
    opts.failed.hidden = true;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span>Sending…';
    opts.form.setAttribute('aria-busy', 'true');

    return send(opts.fields, { subject: opts.subject, gotcha: opts.gotcha })
      .then(function () {
        opts.form.reset();
        try { localStorage.removeItem(opts.draftKey); } catch (e) { /* ignore */ }
        if (opts.after) opts.after();
        /* which of the two forms, and what it was about — the dropdown
           value, never the message. */
        if (V.track) V.track('Enquiry sent', { about: opts.subject });
        opts.sent.hidden = false;
        opts.sent.focus();
        V.toast(opts.toast || 'Message sent to the atelier');
      })
      .catch(function (e) {
        /* Deliberately nothing is reset here. The draft is still in storage
           and the text is still in the field. */
        showFailure(opts.failed, e, opts.subject, opts.fields);
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = label;
        opts.form.removeAttribute('aria-busy');
      });
  }

  V.forms = { ready: ready, send: send, submit: submit, mailtoHref: mailtoHref };
})();
