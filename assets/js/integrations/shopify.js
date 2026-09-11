/* VOLÀ — the Shopify runtime.

   Three kinds of Shopify data reach this site, and they arrive by different
   routes because they have different requirements:

     CATALOGUE   build time.  `node tools/shopify-sync.mjs` pulls products and
                 metafields and writes assets/js/core/data.js. The site stays
                 static and synchronous, so all fifteen pages and every
                 derived figure keep working untouched — and the shop is fast
                 and survives Shopify being slow.

     CART        runtime, here. Inventory and totals have to be current, and
                 the checkout URL is issued per cart.

     CUSTOMER    runtime, here. Sign-in, registration, password reset and
                 order history are real Shopify operations — this is the file
                 that turns the seams in auth.js and orders.js into
                 something that actually works.

   Everything degrades: with no store configured, the cart stays local, the
   auth seams stay in demo mode, and the site behaves exactly as it does now. */
(function () {
  'use strict';

  var V = (window.VOLA = window.VOLA || {});
  var CART_ID = 'vola.shopify.cart.v1';
  var TOKEN = 'vola.shopify.token.v1';

  function cfg() { return V.shopifyConfig || {}; }
  function ready() { return V.shopifyReady && V.shopifyReady(); }

  function endpoint() {
    return 'https://' + cfg().domain + '/api/' + cfg().apiVersion + '/graphql.json';
  }

  /* ------------------------------------------------------------- transport */
  /* One place that talks to Shopify. Throws with the first user-safe message
     Shopify returns, so callers can surface it without inspecting GraphQL. */
  function gql(query, variables) {
    if (!ready()) return Promise.reject(new Error('No Shopify store is configured.'));
    return fetch(endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': cfg().storefrontToken
      },
      body: JSON.stringify({ query: query, variables: variables || {} })
    }).then(function (res) {
      if (!res.ok) throw new Error('Shopify returned ' + res.status + '.');
      return res.json();
    }).then(function (body) {
      if (body.errors && body.errors.length) {
        throw new Error(body.errors[0].message || 'Shopify rejected the request.');
      }
      return body.data;
    });
  }

  /* Shopify returns userErrors inside mutations rather than as GraphQL
     errors; they are the ones worth showing a person. */
  function firstUserError(payload, keys) {
    for (var i = 0; i < keys.length; i++) {
      var errs = payload && payload[keys[i]];
      if (errs && errs.length) return errs[0].message;
    }
    return null;
  }

  function store(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* private mode */ }
  }
  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  /* ═══════════════════════════════════════════════════════════════ CART ═══
     The local bag stays the source of truth for what the shopper sees — it
     is instant, it survives being offline, and it already works. Shopify is
     asked for a cart only at the moment of checkout, which is the only
     moment its answer actually matters. That keeps every add-to-bag free of
     a network round trip. */

  var LINE_FRAGMENT = 'id checkoutUrl totalQuantity ' +
    'cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }';

  /* Map a local bag line to a Shopify merchandise id. The sync writes each
     variant id onto the product as `variantFor[size::colour]`. */
  function variantIdFor(line) {
    var p = V.byId(line.id);
    if (!p || !p.variants) return null;
    return p.variants[line.size + '::' + line.colour] ||
           p.variants[line.size] ||
           p.variantId ||
           null;
  }

  function cartLines() {
    var missing = [];
    var lines = V.cart.items.map(function (l) {
      var id = variantIdFor(l);
      if (!id) { missing.push(l); return null; }
      return { merchandiseId: id, quantity: l.qty };
    }).filter(Boolean);
    return { lines: lines, missing: missing };
  }

  var shopify = V.shopify = {
    configured: ready,

    /* Build a fresh Shopify cart from the local bag and hand back the hosted
       checkout URL. A new cart each time is deliberate: the local bag is
       authoritative, and reconciling a stale Shopify cart against it is a
       class of bug nobody needs. */
    createCheckout: function (opts) {
      opts = opts || {};
      var built = cartLines();
      if (built.missing.length) {
        /* No product anywhere has a variant id, which is not a stock problem
           — it means data.js was never generated from Shopify. Say the thing
           that is actually wrong, because the shopper-facing message would
           send somebody hunting for an inventory bug that does not exist. */
        var anyMapped = V.products.some(function (p) {
          return p.variants || p.variantId;
        });
        if (!anyMapped) {
          return Promise.reject(new Error(
            'This catalogue has not been synced from Shopify yet, so nothing can be ' +
            'bought. Run `node tools/shopify-sync.mjs` and reload.'));
        }
        var names = built.missing.map(function (l) {
          var p = V.byId(l.id);
          return (p ? p.name : l.id) + ' (' + l.size + ')';
        });
        return Promise.reject(new Error(
          'These are not available to buy right now: ' + names.join(', ') +
          '. Remove them, or write to us and we will sort it.'));
      }
      if (!built.lines.length) return Promise.reject(new Error('Your bag is empty.'));

      var attrs = [];
      if (opts.note) attrs.push({ key: 'Notes for the atelier', value: String(opts.note) });
      if (opts.fit) attrs.push({ key: 'Saved sizes', value: String(opts.fit) });

      var input = {
        lines: built.lines,
        attributes: attrs
      };
      if (opts.email) input.buyerIdentity = { email: opts.email };
      var token = read(TOKEN);
      if (token) {
        input.buyerIdentity = input.buyerIdentity || {};
        input.buyerIdentity.customerAccessToken = token;
      }

      return gql(
        'mutation cartCreate($input: CartInput!) {' +
        '  cartCreate(input: $input) {' +
        '    cart { ' + LINE_FRAGMENT + ' }' +
        '    userErrors { field message }' +
        '  }' +
        '}', { input: input }
      ).then(function (data) {
        var msg = firstUserError(data.cartCreate, ['userErrors']);
        if (msg) throw new Error(msg);
        var cart = data.cartCreate.cart;
        if (!cart || !cart.checkoutUrl) throw new Error('Shopify did not return a checkout.');
        store(CART_ID, cart.id);
        return cart;
      });
    },

    /* ═══════════════════════════════════════════════════════ CUSTOMER ═══ */

    signIn: function (email, password) {
      return gql(
        'mutation login($input: CustomerAccessTokenCreateInput!) {' +
        '  customerAccessTokenCreate(input: $input) {' +
        '    customerAccessToken { accessToken expiresAt }' +
        '    customerUserErrors { code message }' +
        '  }' +
        '}', { input: { email: email, password: password } }
      ).then(function (data) {
        var payload = data.customerAccessTokenCreate;
        if (!payload.customerAccessToken) {
          /* Shopify distinguishes "unidentified customer" from other
             failures. We deliberately do not — one message for every
             failure mode, so the form cannot be used to test whether an
             address is registered. */
          throw new Error('That email and password do not match. Check both and try again.');
        }
        store(TOKEN, payload.customerAccessToken.accessToken);
        return shopify.me();
      });
    },

    me: function () {
      var token = read(TOKEN);
      if (!token) return Promise.resolve(null);
      return gql(
        'query me($token: String!) {' +
        '  customer(customerAccessToken: $token) {' +
        '    id email firstName lastName createdAt' +
        '  }' +
        '}', { token: token }
      ).then(function (data) {
        var c = data.customer;
        if (!c) { store(TOKEN, null); return null; }
        return {
          email: c.email,
          name: [c.firstName, c.lastName].filter(Boolean).join(' ') || null,
          since: (c.createdAt || '').slice(0, 10),
          shopifyId: c.id
        };
      });
    },

    register: function (details) {
      return gql(
        'mutation create($input: CustomerCreateInput!) {' +
        '  customerCreate(input: $input) {' +
        '    customer { id email }' +
        '    customerUserErrors { code field message }' +
        '  }' +
        '}', {
          input: {
            email: details.email,
            password: details.password,
            firstName: details.name || undefined,
            acceptsMarketing: !!(details.consent && details.consent.marketing)
          }
        }
      ).then(function (data) {
        var payload = data.customerCreate;
        var msg = firstUserError(payload, ['customerUserErrors']);
        /* TAKEN is the enumeration leak. Answer as if it worked and let
           Shopify's own email tell the existing account someone tried. */
        if (msg && !/taken|already/i.test(msg)) throw new Error(msg);
        return { email: details.email, name: details.name || null, verificationSent: true };
      });
    },

    requestReset: function (email) {
      return gql(
        'mutation recover($email: String!) {' +
        '  customerRecover(email: $email) { customerUserErrors { message } }' +
        '}', { email: email }
      ).then(function () { return true; });   /* always the same answer */
    },

    signOut: function () {
      var token = read(TOKEN);
      store(TOKEN, null);
      if (!token) return Promise.resolve();
      return gql(
        'mutation out($token: String!) {' +
        '  customerAccessTokenDelete(customerAccessToken: $token) { deletedAccessTokenId }' +
        '}', { token: token }
      ).catch(function () { /* the local token is gone either way */ });
    },

    /* ═════════════════════════════════════════════════════════ ORDERS ═══
       Real orders, for a signed-in customer. Guest lookup by number and
       email is not possible from the Storefront API at all — it needs the
       Admin API, which needs a secret, which needs a server. See SHOPIFY.md
       for the twenty-line serverless proxy that closes that gap. */
    orders: function (first) {
      var token = read(TOKEN);
      if (!token) return Promise.resolve([]);
      return gql(
        'query orders($token: String!, $first: Int!) {' +
        '  customer(customerAccessToken: $token) {' +
        '    orders(first: $first, reverse: true) { edges { node {' +
        '      orderNumber name processedAt fulfillmentStatus financialStatus statusUrl' +
        '      shippingAddress { country }' +
        '      currentTotalPrice { amount currencyCode }' +
        '      subtotalPrice { amount currencyCode }' +
        '      totalShippingPrice { amount currencyCode }' +
        '      successfulFulfillments(first: 5) { trackingCompany trackingInfo { number url } }' +
        '      lineItems(first: 20) { edges { node {' +
        '        title quantity' +
        '        variant { title product { handle } }' +
        '      } } }' +
        '    } } }' +
        '  }' +
        '}', { token: token, first: first || 20 }
      ).then(function (data) {
        var c = data.customer;
        if (!c) return [];
        return c.orders.edges.map(function (e) { return mapOrder(e.node); });
      });
    }
  };

  /* Shopify's order shape → the shape track.js already renders. */
  function mapOrder(o) {
    var lines = o.lineItems.edges.map(function (e) {
      var n = e.node;
      var handle = n.variant && n.variant.product ? n.variant.product.handle : null;
      var parts = (n.variant && n.variant.title ? n.variant.title : '').split(' / ');
      return {
        id: handle,
        size: parts[0] || '',
        colour: parts[1] || '',
        qty: n.quantity,
        title: n.title
      };
    });

    var f = (o.successfulFulfillments || [])[0];
    var info = f && f.trackingInfo && f.trackingInfo[0];

    return {
      number: o.name,
      shopify: true,
      statusUrl: o.statusUrl,
      placedAt: new Date(o.processedAt),
      country: (o.shippingAddress && o.shippingAddress.country) || '',
      lines: lines,
      subtotal: Math.round(parseFloat((o.subtotalPrice || {}).amount || 0)),
      shipping: Math.round(parseFloat((o.totalShippingPrice || {}).amount || 0)),
      total: Math.round(parseFloat((o.currentTotalPrice || {}).amount || 0)),
      fulfilled: o.fulfillmentStatus === 'FULFILLED',
      carrier: f ? f.trackingCompany : null,
      tracking: info ? info.number : null,
      trackingUrl: info ? info.url : null
    };
  }

  /* ══════════════════════════════════════════════════ HOSTED ACCOUNTS ═══
     When `accountUrl` is set, this store is on Shopify's new customer
     accounts and the customer mutations above are unreachable in practice:
     there is no password on the account for `customerAccessTokenCreate` to
     check. Signing in happens on Shopify's own page, which is also the only
     place the real options live — Shop, and a one-time code by email.

     So the site hands off rather than imitating. What it deliberately does
     NOT do is keep a local "signed in" flag afterwards: the token from that
     flow belongs to the Customer Account API, which this site has no client
     ID for, so the browser never learns who came back. A header claiming
     somebody is signed in when nothing can verify it is precisely the kind
     of decorative truth this codebase refuses. `isSignedIn()` stays false,
     and every page that asked reads as signed out — correctly.

     Order history moves with it: a customer's orders live behind the same
     token, so track.html sends people to the hosted page instead of
     pretending to look one up. Guest lookup by number was never possible
     from the Storefront API anyway — see §5 of SHOPIFY.md. */
  function hostedAccounts() {
    var url = cfg().accountUrl;
    return typeof url === 'string' && /^https:\/\//.test(url) ? url : null;
  }

  if (hostedAccounts() && V.auth) {
    V.auth.hosted = hostedAccounts();

    /* The seams are not left in demo mode underneath: a stray call to any of
       them would sign somebody into a session that authenticates nothing.
       They reject with the truth instead, and the pages route around them. */
    var handOff = function () {
      return Promise.reject(new Error('Signing in happens on Shopify’s account page.'));
    };
    V.auth.signIn = handOff;
    V.auth.register = handOff;
    V.auth.requestReset = handOff;

    /* A session stored before this store moved to hosted accounts would
       otherwise sit in the header forever, unverifiable. Clear it once. */
    if (V.auth.isSignedIn()) V.auth.set(null, false);

    if (V.orders) {
      V.orders.hosted = V.auth.hosted;
      V.orders.lookup = function () {
        return Promise.reject(new Error('Your orders are on your VOLÀ account page, ' +
          'where signing in takes a moment and needs no password.'));
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════ WIRING ═══
     Overwrite the demo seams when a store is configured. Doing it here
     rather than inside auth.js keeps the Shopify dependency in one file and
     leaves the demo working untouched when there is no store. */
  if (ready()) {
    if (V.auth && !V.auth.hosted) {
      V.auth.signIn = function (email, password, remember) {
        return shopify.signIn(email, password).then(function (user) {
          V.auth.set(user, remember);
          return user;
        });
      };
      V.auth.register = function (details) { return shopify.register(details); };
      V.auth.requestReset = function (email) { return shopify.requestReset(email); };
      V.auth.signOut = function () {
        return shopify.signOut().then(function () { V.auth.set(null, false); });
      };
      V.auth.live = true;

      /* A stored session is only as good as the token behind it: re-check on
         load so an expired token does not leave the header claiming somebody
         is signed in. */
      if (V.auth.isSignedIn()) {
        shopify.me().then(function (user) {
          if (!user) V.auth.set(null, false);
        }).catch(function () { /* offline — leave the session alone */ });
      }
    }

    if (V.orders && !V.orders.hosted) {
      V.orders.live = true;
      var demoLookup = V.orders.lookup;
      V.orders.lookup = function (number, email) {
        var wanted = String(number).replace(/\D/g, '');
        return shopify.orders(30).then(function (list) {
          var hit = list.filter(function (o) {
            return o.number.replace(/\D/g, '') === wanted;
          })[0];
          if (hit) return hit;
          throw new Error('We cannot find an order with those details. ' +
            'Check the number and the email address you used, then try again.');
        }).catch(function (err) {
          /* Not signed in, or the order is not on this account: guest lookup
             needs the Admin API. Fall back to the demo generator only when
             no store is answering at all, so a real deployment never invents
             an order. */
          if (V.auth && V.auth.isSignedIn()) throw err;
          throw new Error('Sign in to see your orders, or write to us with the ' +
            'order number and we will find it.');
        });
      };
      void demoLookup;
    }
  }
})();
