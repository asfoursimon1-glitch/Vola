#!/usr/bin/env node
/* VOLÀ — pull the catalogue from Shopify and write assets/js/data.js.
 *
 *   node tools/shopify-sync.mjs
 *   node tools/shopify-sync.mjs --dry     print a summary, write nothing
 *
 * Why build time rather than a fetch in the browser: every page on this site
 * reads window.VOLA.products synchronously at script time, and every derived
 * figure — the mill counts, the cost breakdowns, the size availability, the
 * true-to-size table — is computed from it. Fetching the catalogue at runtime
 * would mean rewriting ten page scripts around a promise and would make the
 * shop slower and dependent on Shopify being up. A generated file keeps the
 * site static, fast and offline-capable, and the whole thing stays honest:
 * what is in data.js is what the shop shows.
 *
 * Run it whenever the catalogue changes. In CI, run it before deploying.
 *
 * No dependencies. Node 18+ for global fetch.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

/* ─────────────────────────────────────────────────────────────── config ── */
/* Read from the same file the browser reads, so there is one place to
   configure a store. Environment variables win, for CI. */
async function loadConfig() {
  const src = await readFile(join(ROOT, 'assets/js/shopify-config.js'), 'utf8');
  const pick = (key) => (src.match(new RegExp(key + `:\\s*'([^']*)'`)) || [, ''])[1];
  return {
    domain: process.env.SHOPIFY_DOMAIN || pick('domain'),
    token: process.env.SHOPIFY_STOREFRONT_TOKEN || pick('storefrontToken'),
    apiVersion: process.env.SHOPIFY_API_VERSION || pick('apiVersion') || '2025-07',
    namespace: process.env.SHOPIFY_NAMESPACE || pick('namespace') || 'vola'
  };
}

/* ──────────────────────────────────────────────────────────────── query ── */
/* Metafields are requested by identifier so a missing one comes back null
   rather than failing the query — a half-configured store still imports. */
const KEYS = [
  'denim_oz', 'denim_hand', 'denim_fade', 'denim_note',
  'mill', 'mill_city', 'mill_country', 'mill_since', 'atelier_hours',
  'atelier_hands', 'edition', 'atelier_note',
  'fit_cut', 'fit_advice', 'fit_model',
  'build', 'composition', 'care', 'flag', 'colour_hex'
];

function query(ns) {
  const ids = KEYS.map((k) => `{ namespace: "${ns}", key: "${k}" }`).join(', ');
  return `
    query catalogue($cursor: String) {
      products(first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        edges { node {
          id handle title productType description tags
          featuredImage { url altText }
          images(first: 8) { edges { node { url altText } } }
          options { name values }
          metafields(identifiers: [${ids}]) { key value }
          variants(first: 100) { edges { node {
            id title availableForSale
            price { amount currencyCode }
            selectedOptions { name value }
          } } }
        } }
      }
    }`;
}

async function fetchAll(cfg) {
  /* SHOPIFY_MOCK=tools/fixtures/products.json runs the whole mapping against
     a recorded payload. It is how the mapper is tested without a store, and
     how you can reproduce a customer's catalogue bug from an export. */
  if (process.env.SHOPIFY_MOCK) {
    const raw = await readFile(join(ROOT, process.env.SHOPIFY_MOCK), 'utf8');
    const body = JSON.parse(raw);
    return body.data.products.edges.map((e) => e.node);
  }

  const out = [];
  let cursor = null;
  for (;;) {
    const res = await fetch(`https://${cfg.domain}/api/${cfg.apiVersion}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': cfg.token
      },
      body: JSON.stringify({ query: query(cfg.namespace), variables: { cursor } })
    });
    if (!res.ok) throw new Error(`Shopify returned ${res.status} ${res.statusText}`);
    const body = await res.json();
    if (body.errors?.length) throw new Error(body.errors[0].message);
    const page = body.data.products;
    out.push(...page.edges.map((e) => e.node));
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }
  return out;
}

/* ────────────────────────────────────────────────────────────── mapping ── */
const num = (v) => (v == null || v === '' ? null : Number(v));
const clean = (s) => (s == null ? '' : String(s).trim());

/* Shopify's option names are whatever the merchant typed. Match loosely. */
function optionValue(variant, name) {
  const hit = variant.selectedOptions.find(
    (o) => o.name.toLowerCase().startsWith(name)
  );
  return hit ? hit.value : null;
}

function mapProduct(node, warn) {
  const meta = {};
  for (const m of node.metafields || []) if (m) meta[m.key] = m.value;

  const variants = node.variants.edges.map((e) => e.node);
  const first = variants[0];
  if (!first) { warn(`${node.handle}: no variants, skipped`); return null; }

  /* sizes and sold-out come from real inventory, not a hand-kept list */
  const sizes = [];
  const soldOut = [];
  const colours = [];
  const variantMap = {};

  for (const v of variants) {
    const size = optionValue(v, 'size') || optionValue(v, 'waist') || 'One size';
    const colour = optionValue(v, 'colour') || optionValue(v, 'color') || null;
    if (!sizes.includes(size)) sizes.push(size);
    if (!v.availableForSale && !soldOut.includes(size)) soldOut.push(size);
    if (colour && !colours.includes(colour)) colours.push(colour);
    variantMap[size + '::' + (colour || '')] = v.id;
    variantMap[size] = variantMap[size] || v.id;
  }
  /* a size is only sold out if EVERY variant in it is */
  const reallyOut = soldOut.filter((s) =>
    variants.filter((v) => (optionValue(v, 'size') || 'One size') === s)
            .every((v) => !v.availableForSale));

  const hexes = safeJson(meta.colour_hex) || {};
  const images = node.images.edges.map((e) => e.node.url);

  const p = {
    id: node.handle,
    name: node.title,
    category: clean(node.productType).toLowerCase() || 'jeans',
    price: Math.round(Number(first.price.amount)),
    image: node.featuredImage?.url || images[0] || '',
    images: images.length ? images : [node.featuredImage?.url].filter(Boolean),
    alt: node.featuredImage?.altText || `${node.title} by VOLÀ`,
    colour: colours[0] || 'Natural',
    colours: colours.map((c) => ({
      name: c,
      hex: hexes[c] || '#8A8A8A',
      image: node.featuredImage?.url || ''
    })),
    sizes,
    soldOut: reallyOut,
    blurb: clean(node.description).split('\n')[0] || '',
    composition: clean(meta.composition),
    care: safeJson(meta.care) || (meta.care ? [clean(meta.care)] : []),
    atelier: clean(meta.atelier_note),
    fabric: [clean(meta.mill), clean(meta.mill_city)].filter(Boolean).join(' mill, '),
    tag: pickTag(node.tags),
    variants: variantMap,
    variantId: first.id
  };

  if (meta.flag) p.flag = clean(meta.flag);
  if (meta.build) p.build = clean(meta.build);

  if (meta.denim_oz) {
    p.denim = {
      oz: num(meta.denim_oz),
      hand: clean(meta.denim_hand) || 'rigid',
      fade: clean(meta.denim_fade) || 'low',
      note: clean(meta.denim_note)
    };
  } else warn(`${node.handle}: no denim_oz — cloth spec and weight filter will skip it`);

  if (meta.mill) {
    p.prov = {
      mill: clean(meta.mill),
      city: clean(meta.mill_city),
      country: clean(meta.mill_country),
      since: num(meta.mill_since),
      hours: num(meta.atelier_hours) || 0,
      hands: num(meta.atelier_hands) || 1
    };
    if (meta.edition) p.prov.edition = clean(meta.edition);
  } else warn(`${node.handle}: no mill — it will not appear in the traceability record`);

  p.fit = {
    cut: clean(meta.fit_cut),
    advice: clean(meta.fit_advice) || 'true',
    model: clean(meta.fit_model)
  };

  return p;
}

function pickTag(tags) {
  const lower = (tags || []).map((t) => t.toLowerCase());
  if (lower.includes('atelier') || lower.includes('made-to-order')) return 'atelier';
  if (lower.includes('new')) return 'new';
  return 'core';
}

function safeJson(s) {
  if (!s) return null;
  try { const v = JSON.parse(s); return v; } catch { return null; }
}

/* ───────────────────────────────────────────────────────────── emitting ── */
/* The generated file replaces only the PRODUCTS array. Everything else in
   data.js — the categories, the cloth weights, the cost profiles, the size
   chart, the care regimens, the reviews — is editorial that Shopify has no
   opinion about, so it is preserved byte for byte. */
async function writeCatalogue(products) {
  const path = join(ROOT, 'assets/js/data.js');
  const src = await readFile(path, 'utf8');

  const startMark = '  var PRODUCTS = [';
  const endMark = '\n  ];\n';
  const start = src.indexOf(startMark);
  if (start < 0) throw new Error('Could not find the PRODUCTS array in data.js');
  const end = src.indexOf(endMark, start);
  if (end < 0) throw new Error('Could not find the end of the PRODUCTS array');

  const body = products
    .map((p) => '    p(' + JSON.stringify(p, null, 6).replace(/\n/g, '\n    ') + ')')
    .join(',\n');

  const banner =
    '  /* ─────────────────────────────────────────────────────────────────\n' +
    '     GENERATED by tools/shopify-sync.mjs on ' + new Date().toISOString() + '\n' +
    '     Do not edit by hand — re-run the sync instead. Everything outside\n' +
    '     this array is editorial and is preserved by the sync.\n' +
    '     ───────────────────────────────────────────────────────────────── */\n';

  const next = src.slice(0, start) + banner + startMark + '\n' + body + src.slice(end);
  await writeFile(path, next, 'utf8');
  return path;
}

/* ───────────────────────────────────────────────────────────────── main ── */
const warnings = [];
const warn = (m) => warnings.push(m);

try {
  const cfg = await loadConfig();
  /* A recorded payload needs no store — that is the whole point of it, and
     the guard below used to run first, so the documented SHOPIFY_MOCK command
     could never actually run. judgeme-sync.mjs has always worked this way. */
  if (!process.env.SHOPIFY_MOCK && (!cfg.domain || !cfg.token)) {
    console.error(
      '\n  No store configured.\n\n' +
      '  Put your domain and Storefront token in assets/js/shopify-config.js,\n' +
      '  or set SHOPIFY_DOMAIN and SHOPIFY_STOREFRONT_TOKEN.\n\n' +
      '  See SHOPIFY.md for where to find them.\n');
    process.exit(1);
  }

  console.log(process.env.SHOPIFY_MOCK
    ? `\n  Reading ${process.env.SHOPIFY_MOCK} (mock) …`
    : `\n  Fetching from ${cfg.domain} …`);
  const nodes = await fetchAll(cfg);
  const products = nodes.map((n) => mapProduct(n, warn)).filter(Boolean);

  if (!products.length) throw new Error('Shopify returned no published products.');

  const cats = [...new Set(products.map((p) => p.category))].sort();
  console.log(`  ${products.length} products across ${cats.length} categories`);
  console.log(`  categories: ${cats.join(', ')}`);

  if (warnings.length) {
    console.log(`\n  ${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`);
    for (const w of warnings) console.log(`    · ${w}`);
  }

  /* The site's category slugs are editorial and live in data.js. A product
     whose productType matches none of them still lists in the unfiltered
     collection, but it gets no tile on the homepage, no category filter, no
     breadcrumb and no intro — which is worth shouting about now rather than
     discovering it from a customer. */
  const known = (await readFile(join(ROOT, 'assets/js/data.js'), 'utf8'))
    .match(/slug: '([a-z]+)'/g)?.map((m) => m.slice(7, -1)) || [];
  const orphans = cats.filter((c) => !known.includes(c));
  if (orphans.length) {
    console.log(`\n  ⚠  These product types match no category in data.js:`);
    for (const o of orphans) {
      const n = products.filter((p) => p.category === o).length;
      console.log(`     "${o}" — ${n} product${n === 1 ? '' : 's'}`);
    }
    console.log(`     They will list in the collection but get no homepage tile, no`);
    console.log(`     category filter and no breadcrumb. Either rename the product type`);
    console.log(`     in Shopify to match, or add the category to CATEGORIES in data.js.`);
  }

  if (process.argv.includes('--json')) {
    console.log('\n' + JSON.stringify(products, null, 2));
  }

  if (DRY) {
    console.log('\n  --dry: nothing written.\n');
  } else {
    const path = await writeCatalogue(products);
    console.log(`\n  Wrote ${path}\n`);
  }
} catch (err) {
  console.error(`\n  Failed: ${err.message}\n`);
  process.exit(1);
}
