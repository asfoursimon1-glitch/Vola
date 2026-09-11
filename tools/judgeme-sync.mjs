#!/usr/bin/env node
/* VOLÀ — pull reviews from Judge.me and write them into assets/js/core/data.js.
 *
 *   JUDGEME_TOKEN=… node tools/judgeme-sync.mjs
 *   JUDGEME_TOKEN=… node tools/judgeme-sync.mjs --dry     summarise, write nothing
 *   JUDGEME_MOCK=tools/fixtures/judgeme.json node tools/judgeme-sync.mjs --dry
 *
 * Why build time, and why it is not optional here.
 *
 * The catalogue sync runs at build time because every page reads
 * window.VOLA.products synchronously. Reviews have that reason too — the
 * product page, the Fit Studio and the collection sort all count from
 * VOLA.reviews before first paint — and one more that settles it: the
 * Judge.me API token is PRIVATE. It reads and writes every review on the
 * shop. Judge.me's own widget avoids this by embedding a script that talks to
 * their servers with a public key; that would mean a third-party iframe in the
 * middle of the product page and, worse, review data this site cannot count.
 * The whole architecture here is that no figure is asserted — the true-to-size
 * percentage is the percentage of the reviews printed underneath it. That only
 * holds if the reviews are in data.js.
 *
 * So: the token lives in the environment, only this tool ever sees it, and
 * what ships is a static file.
 *
 * Run it on the same schedule as the catalogue sync. In CI, run both before
 * deploying, and put JUDGEME_TOKEN in the secret store — never in this repo.
 *
 * No dependencies. Node 18+ for global fetch.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const API = 'https://judge.me/api/v1/reviews';

/* ─────────────────────────────────────────────────────────────── config ── */
/* The browser file is the single place a store is configured, so read it
   rather than keeping a second copy here. judgemeConfig is nested, so it is
   evaluated rather than picked apart with regexes — it is our own file, read
   from disk, and getting the question titles wrong would silently drop every
   fit answer. Environment variables win, for CI. */
async function loadConfig() {
  const src = await readFile(join(ROOT, 'assets/js/integrations/shopify-config.js'), 'utf8');
  const start = src.indexOf('window.VOLA.judgemeConfig = ');
  if (start < 0) throw new Error('No judgemeConfig in assets/js/integrations/shopify-config.js');
  const open = src.indexOf('{', start);
  const close = src.indexOf('\n  };', open);
  const literal = src.slice(open, close + 4).replace(/;\s*$/, '');
  const cfg = new Function('return (' + literal + ')')();

  return {
    token: process.env.JUDGEME_TOKEN || '',
    shopDomain: process.env.JUDGEME_SHOP_DOMAIN || cfg.shopDomain || '',
    questions: cfg.questions || {},
    fitAnswers: cfg.fitAnswers || {}
  };
}

/* ───────────────────────────────────────────────────────────── fetching ── */
async function fetchAll(cfg) {
  /* JUDGEME_MOCK=tools/fixtures/judgeme.json runs the whole mapping against a
     recorded payload — how the mapper is tested without a shop, and how you
     reproduce a mapping bug from an export. */
  if (process.env.JUDGEME_MOCK) {
    const raw = await readFile(join(ROOT, process.env.JUDGEME_MOCK), 'utf8');
    return JSON.parse(raw).reviews || [];
  }

  const out = [];
  for (let page = 1; ; page++) {
    const url = new URL(API);
    url.searchParams.set('api_token', cfg.token);
    url.searchParams.set('shop_domain', cfg.shopDomain);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 401 || res.status === 403) {
      throw new Error('Judge.me rejected the token. Check JUDGEME_TOKEN and shopDomain.');
    }
    if (!res.ok) throw new Error(`Judge.me returned ${res.status} ${res.statusText}`);

    const body = await res.json();
    const batch = body.reviews || [];
    out.push(...batch);
    if (batch.length < 100) break;
    /* A shop with tens of thousands of reviews is not this shop, but an
       unbounded loop against someone else's API deserves a stop. */
    if (page >= 200) { console.log('  stopped at 20,000 reviews'); break; }
  }
  return out;
}

/* ────────────────────────────────────────────────────────────── mapping ── */
const clean = (s) => (s == null ? '' : String(s).replace(/\s+/g, ' ').trim());
const norm = (s) => clean(s).toLowerCase();

/* Judge.me has moved this shape around between accounts and API versions:
   the question can arrive as cf_question.title, question.title, or a bare
   title on the answer. Read all three rather than losing the fit data to a
   field rename nobody would notice until the percentages went missing. */
function answers(review) {
  const list = review.custom_form_answers || review.cf_answers || [];
  return list.map((a) => ({
    question: norm(a.cf_question?.title || a.question?.title || a.title || a.question),
    value: clean(a.value ?? a.answer)
  })).filter((a) => a.question && a.value);
}

function answerTo(list, title) {
  if (!title) return '';
  const want = norm(title);
  const hit = list.find((a) => a.question === want) ||
              list.find((a) => a.question.includes(want) || want.includes(a.question));
  return hit ? hit.value : '';
}

/* The fit verdict is the one field the site does arithmetic on, so an answer
   that matches nothing is left unanswered rather than guessed. reviewStats
   divides the true-to-size share by the reviews that answered, so an
   unrecognised answer costs a data point; a guessed one costs the truth. */
function mapFit(raw, table, warn) {
  const v = norm(raw);
  if (!v) return null;
  for (const key of ['small', 'true', 'large']) {
    const options = (table[key] || []).map(norm);
    if (options.includes(v)) return key;
  }
  for (const key of ['small', 'true', 'large']) {
    const options = (table[key] || []).map(norm);
    if (options.some((o) => v.includes(o))) return key;
  }
  warn(`fit answer "${raw}" matches nothing in fitAnswers — counted as unanswered`);
  return null;
}

/* "6 months", "Over a year", "a few weeks", "18 months" → whole months.
   Null when it cannot be read, which the site prints as nothing rather than
   as "New" — a missing answer is not a fresh purchase. */
function mapMonths(raw) {
  const v = norm(raw);
  if (!v) return null;
  if (/less than a month|a few (days|weeks)|under a month|weeks?/.test(v)) return 0;
  const years = v.match(/(\d+)\s*year/);
  if (years) return Number(years[1]) * 12;
  if (/(over|more than|about)?\s*a year/.test(v)) return 12;
  const months = v.match(/(\d+)\s*month/);
  if (months) return Number(months[1]);
  const bare = v.match(/^(\d+)$/);
  if (bare) return Number(bare[1]);
  return null;
}

/* Judge.me's `verified` is a string, and the values differ by how the review
   arrived — buyer, validated, web, import. Only a matched order is a verified
   purchase; everything else prints without the badge rather than borrowing
   trust it has not earned. */
function isVerified(review) {
  const v = norm(review.verified);
  return v === 'buyer' || v === 'validated' || v === 'verified';
}

/* A review is printable only if Judge.me says it is published, not hidden and
   not spam. Curation state is the shop's moderation decision; overriding it
   here would put a review on the site that the admin thinks it removed. */
function isPublishable(r) {
  if (r.published === false || r.hidden === true) return false;
  const c = norm(r.curated);
  return !(c === 'spam' || c === 'rejected');
}

function mapReview(r, cfg, index, warn) {
  const a = answers(r);
  const product = resolve(r, index);

  if (!product) {
    warn(`"${clean(r.product_title) || r.product_handle || r.product_external_id}" ` +
         `matches no piece in data.js — ${clean(r.title) || 'a review'} skipped`);
    return null;
  }

  const rating = Number(r.rating);
  if (!(rating >= 1 && rating <= 5)) { warn(`review ${r.id}: no usable rating, skipped`); return null; }

  const out = {
    product,
    rating: Math.round(rating),
    size: answerTo(a, cfg.questions.size) || null,
    fit: mapFit(answerTo(a, cfg.questions.fit), cfg.fitAnswers, warn),
    months: mapMonths(answerTo(a, cfg.questions.owned)),
    author: clean(r.reviewer?.name) || 'Anonymous',
    date: clean(r.created_at).slice(0, 10),
    verified: isVerified(r),
    title: clean(r.title),
    body: clean(r.body)
  };

  /* Judge.me has no location field. If the shop asks for one as a custom
     question it comes through; otherwise the line is simply shorter. */
  const place = answerTo(a, 'where are you') || answerTo(a, 'city');
  if (place) out.place = place;

  if (!out.body) { warn(`review ${r.id}: empty body, skipped`); return null; }
  return out;
}

/* Match reviews to pieces without needing a mapping table: the catalogue sync
   writes the Shopify handle as the product id, which is what Judge.me sends.
   Only the PRODUCTS array is read — data.js is full of other `id:` keys (the
   lines, the cloth weights, the price bands) and counting those would report a
   coverage figure that is quietly wrong. */
function buildIndex(src) {
  const from = src.indexOf('  var PRODUCTS = [');
  const to = src.indexOf('\n  ];\n', from);
  if (from < 0 || to < 0) throw new Error('Could not find the PRODUCTS array in data.js');
  const slice = src.slice(from, to);

  const items = [...slice.matchAll(
    /["']?id["']?:\s*["']([^"']+)["'][\s\S]{0,80}?["']?name["']?:\s*["']([^"']+)["']/g
  )].map((m) => ({ id: m[1], name: m[2] }));

  const byHandle = new Map(items.map((p) => [norm(p.id), p.id]));
  const byTitle = new Map(items.map((p) => [norm(p.name), p.id]));
  const byExternalId = new Map(
    [...slice.matchAll(/id:\s*'([^']+)'[\s\S]{0,600}?gid:\/\/shopify\/Product\/(\d+)/g)]
      .map((m) => [m[2], m[1]]));

  return { items, byHandle, byTitle, byExternalId, count: items.length };
}

const words = (s) => norm(s).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);

/* Handle first — it is stable and is what the catalogue is keyed on. Titles
   drift ("Column Wide Jean" in Judge.me, "Column Wide-Leg Jean" in the
   catalogue), so the fallback matches on words and only accepts a single
   candidate. Two possible pieces is not a near miss, it is a coin toss, and
   attributing a review to the wrong jean is worse than dropping it. */
function resolve(r, index) {
  const byHandle = index.byHandle.get(norm(r.product_handle));
  if (byHandle) return byHandle;

  const external = index.byExternalId.get(String(r.product_external_id || ''));
  if (external) return external;

  const exact = index.byTitle.get(norm(r.product_title));
  if (exact) return exact;

  const want = words(r.product_title);
  if (want.length < 2) return null;
  const hits = index.items.filter((p) => {
    const have = words(p.name);
    return want.every((w) => have.includes(w));
  });
  return hits.length === 1 ? hits[0].id : null;
}

/* ───────────────────────────────────────────────────────────── emitting ── */
/* Replaces only the REVIEWS array. Everything else in data.js — the
   catalogue, the categories, the cost profiles, the size chart — is left byte
   for byte, exactly as the catalogue sync leaves the reviews alone. */
async function writeReviews(reviews) {
  const path = join(ROOT, 'assets/js/core/data.js');
  const src = await readFile(path, 'utf8');

  /* Windows git normalises this file to CRLF the moment anything commits
     it, which broke this function the first time it ran against a
     post-commit checkout: a literal '\n  ];\n' never matches
     '\r\n  ];\r\n'. Detecting the file's actual line ending and matching
     either style (via regex) survives both, and writing the generated
     banner/body back out in that same style keeps the file from ending
     up a mix of the two. */
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const startMark = '  var REVIEWS = [';
  const endRe = /\r?\n  \];\r?\n/;
  const start = src.indexOf(startMark);
  if (start < 0) throw new Error('Could not find the REVIEWS array in data.js');
  const endMatch = src.slice(start).match(endRe);
  if (!endMatch) throw new Error('Could not find the end of the REVIEWS array');
  const end = start + endMatch.index;

  const body = reviews
    .map((r) => '    ' + JSON.stringify(r, null, 6).replace(/\n/g, eol + '    '))
    .join(',' + eol);

  const banner =
    '  /* ─────────────────────────────────────────────────────────────────' + eol +
    '     GENERATED by tools/judgeme-sync.mjs on ' + new Date().toISOString() + eol +
    '     ' + reviews.length + ' published review' + (reviews.length === 1 ? '' : 's') +
      ' from Judge.me. Do not edit by hand — reviews' + eol +
    '     are moderated in Judge.me and re-synced. Everything outside this' + eol +
    '     array is editorial and is preserved by the sync.' + eol +
    '     ───────────────────────────────────────────────────────────────── */' + eol;

  /* Drop a previous banner so they do not stack up on every run. */
  const before = src.slice(0, start).replace(
    /  \/\* ─+\r?\n     GENERATED by tools\/judgeme-sync\.mjs[\s\S]*?─+ \*\/\r?\n$/, '');

  await writeFile(path, before + banner + startMark + eol + body + src.slice(end), 'utf8');
  return path;
}

/* ───────────────────────────────────────────────────────────────── main ── */
const warnings = [];
const warn = (m) => { if (!warnings.includes(m)) warnings.push(m); };

try {
  const cfg = await loadConfig();

  if (!process.env.JUDGEME_MOCK && (!cfg.token || !cfg.shopDomain)) {
    /* Thrown rather than printed-and-exited here: this file has no
       function to return out of at top level, and process.exit() trips
       a libuv assertion on Windows (see CLAUDE.md). Throwing lets the
       catch block at the bottom halt the same way every other failure
       here does, via process.exitCode. */
    throw new Error(
      'No Judge.me credentials.\n\n' +
      '  Put your shop domain in assets/js/integrations/shopify-config.js (judgemeConfig.shopDomain)\n' +
      '  and pass the private API token in the environment:\n\n' +
      '      JUDGEME_TOKEN=… node tools/judgeme-sync.mjs\n\n' +
      '  Judge.me → Settings → Integrations → API tokens.\n' +
      '  The token is private. Never commit it. See docs/REVIEWS.md.');
  }

  const dataSrc = await readFile(join(ROOT, 'assets/js/core/data.js'), 'utf8');
  const index = buildIndex(dataSrc);

  console.log(`\n  Fetching reviews for ${cfg.shopDomain || '(mock)'} …`);
  const raw = await fetchAll(cfg);
  const publishable = raw.filter(isPublishable);
  const reviews = publishable
    .map((r) => mapReview(r, cfg, index, warn))
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const withFit = reviews.filter((r) => r.fit).length;
  const withSize = reviews.filter((r) => r.size).length;
  const pieces = new Set(reviews.map((r) => r.product)).size;

  console.log(`  ${raw.length} fetched · ${raw.length - publishable.length} unpublished or spam ` +
              `· ${reviews.length} usable`);
  console.log(`  covering ${pieces} of ${index.count} pieces`);
  console.log(`  ${withFit} answered the fit question · ${withSize} gave a size`);

  if (warnings.length) {
    console.log(`\n  ${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`);
    for (const w of warnings) console.log(`    · ${w}`);
  }

  /* The fit question is the whole reason this shop runs Judge.me rather than
     printing an average. Without it the reviews still read, but the
     true-to-size figure on every product page and the Fit Studio's "how it
     runs" column have nothing to count — and that silence looks like a bug
     rather than a missing form field, so say it here. */
  if (reviews.length && !withFit) {
    console.log(
      '\n  ⚠  Not one review answered the fit question.\n' +
      '     The true-to-size figure on every product page and the "runs" column\n' +
      '     in the Fit Studio will read "No fit feedback yet" until it does.\n' +
      `     Add a custom form question titled "${cfg.questions.fit}" in Judge.me\n` +
      '     with the answers listed in docs/REVIEWS.md, or change judgemeConfig.questions\n' +
      '     to match the question you already ask.');
  } else if (reviews.length && withFit < reviews.length / 2) {
    console.log(`\n  ⚠  Only ${withFit} of ${reviews.length} reviews carry a fit verdict. ` +
                `The\n     true-to-size figures are counted from those alone.`);
  }

  if (process.argv.includes('--json')) console.log('\n' + JSON.stringify(reviews, null, 2));

  if (DRY) {
    console.log('\n  --dry: nothing written.\n');
  } else {
    console.log(`\n  Wrote ${await writeReviews(reviews)}\n`);
  }
} catch (err) {
  console.error(`\n  Failed: ${err.message}\n`);
  process.exitCode = 1;
}
