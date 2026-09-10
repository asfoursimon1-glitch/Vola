/* VOLÀ — catalogue.
   Swap this file for a fetch() against your commerce API; every consumer
   reads window.VOLA.products / .categories only.

   Beyond name/price/image, every piece carries four structured blocks. They
   exist because a denim PDP has to answer four questions before someone will
   spend $690 on a pair of jeans:

     denim  — what is this cloth, and how will it behave?  (the category spec
              nobody publishes: weight in ounces, hand, fade behaviour)
     prov   — where did it come from, and who touched it?  (mill, city, hours)
     fit    — will it fit me?                              (cut, size advice,
              what the model wears; the true-to-size share is counted from
              the reviews below, not asserted here)
     build  — what am I actually paying for?               (keys into
              COST_PROFILES below)

   All four are placeholder values on placeholder products. Replace them with
   real mill records, real returns data and real costings before launch — the
   whole point of publishing them is that they are checkable. */
(function () {
  'use strict';

  /* Each category carries its own one-line introduction, so the collection
     page holds no editorial of its own to fall out of step with — add a
     category here and its heading, its tile and its intro all follow. */
  var CATEGORIES = [
    { slug: 'jeans',    label: 'Jeans',
      intro: 'Wet-set on the stand so the leg holds its own architecture.' },
    { slug: 'shirts',   label: 'Shirts',
      intro: 'Chambray and selvedge, with collars built like tailoring.' },
    { slug: 'corsets',  label: 'Corsets',
      intro: 'Spiral steel between denim and silk. Made to order, numbered.' },
    { slug: 'jackets',  label: 'Jackets',
      intro: 'Chainstitched, felled and left raw at the hem.' },
    { slug: 'dresses',  label: 'Dresses',
      intro: 'Cut on the true bias, so the denim falls rather than hangs.' },
    { slug: 'belts',    label: 'Belts',
      intro: 'Doubled denim and solid brass, cast in Vicenza.' },
    { slug: 'handbags', label: 'Handbags',
      intro: 'Denim stretched wet over a vegetable-tanned calf frame.' },
    { slug: 'shoes',    label: 'Shoes',
      intro: 'Goodyear-welted in Northampton to our own last.' },
    { slug: 'heels',    label: 'Heels',
      intro: 'Heels carved from the block, then sheathed in denim.' }
  ];

  /* The three merchandising lines every piece belongs to exactly one of,
     matching the `tag` on each product below. */
  var LINES = [
    { id: 'new',     label: 'New this season' },
    { id: 'atelier', label: 'Atelier — made to order' },
    { id: 'core',    label: 'The permanent collection' }
  ];

  /* Cloth weight, defined once. The collection page filters on it and the
     homepage merchandises it; before this the two carried their own copies of
     the same 9oz and 13oz edges, which is exactly how a "mid-weight" comes to
     mean two different things on two pages.

     `max` is exclusive; null means open-ended. */
  var CLOTH_WEIGHTS = [
    { id: 'light', name: 'Light', min: 0, max: 9,
      copy: 'Chambray shirting and bias-cut dresses. The cloth falls rather than holds, and it is soft from the first wear.' },
    { id: 'mid', name: 'Mid-weight', min: 9, max: 13,
      copy: 'The everyday weight. Enough body to keep a line, enough give to sit down in without negotiating.' },
    { id: 'heavy', name: 'Heavy', min: 13, max: null,
      copy: 'Raw selvedge, truckers, the opera coat. Stiff for a month, then it breaks to your shape and stays there.' }
  ];

  /* What can actually be commissioned, and what cannot. Keyed to the
     categories above so the made-to-measure page can price each discipline
     against the ready-to-wear it sits beside, and so a category can never be
     offered for commission and quietly missing from the list of what is not.
     `from` is null where the discipline is not offered at all. */
  var DISCIPLINES = [
    {
      id: 'corsetry', label: 'Corsetry', from: 1400,
      categories: ['corsets'],
      lead: 'Twelve spiral-steel bones set to your own rib and waist measurements, with the shell cut on your body rather than to a size.',
      detail: 'Boning position, lacing gap and underbust height are all set at the first fitting. Silk lining in your choice of colour.'
    },
    {
      id: 'tailoring', label: 'Denim tailoring', from: 1100,
      categories: ['jeans', 'jackets', 'dresses', 'shirts'],
      lead: 'Jeans, jackets, dresses and shirting cut to your measurements from any cloth we hold, wet-set on the stand the way the collection is.',
      detail: 'Rise, leg line, sweep and hem are yours to set. Choose the mill and the weight; we will tell you honestly what a cloth will and will not do.'
    },
    {
      id: 'accessories', label: 'Belts, bags and footwear', from: null,
      categories: ['belts', 'handbags', 'shoes', 'heels'],
      lead: 'Not commissioned. Footwear needs a bespoke last and hardware needs its own moulds — neither is something we do well enough yet to charge for.',
      detail: 'Belts can be cut to length at no charge on any order; write to us with the measurement.'
    }
  ];

  /* Consultation, two fittings, delivery. Week numbers are the promise the
     rest of the site makes ("two fittings across six weeks") made explicit. */
  var COMMISSION_STEPS = [
    { week: 0, title: 'Consultation',
      body: 'Forty-five minutes at the atelier or by video. What you want, what the cloth will allow, and an honest estimate before anything is committed.' },
    { week: 1, title: 'First fitting',
      body: 'Measurements taken, cloth chosen from the bolts we hold, and a toile pinned on you rather than on a stand.' },
    { week: 3, title: 'Cutting',
      body: 'Your pattern is cut singly and the piece is assembled. This is the part that cannot be hurried, and the reason for the six weeks.' },
    { week: 5, title: 'Second fitting',
      body: 'The piece on your body, adjustments chalked and pinned. Anything still wrong is wrong here, not after delivery.' },
    { week: 6, title: 'Finishing and delivery',
      body: 'Final press, hand-finishing, and delivery to you or collection from Via dei Fossi. Numbered, and recorded against your measurements for any future commission.' }
  ];

  /* Care regimens. A piece can belong to several — a raw selvedge belt needs
     the raw regimen and the hardware one — so these are predicates over the
     structured fields rather than a single label per product. The per-product
     `care` arrays stay where they are; these are the general rules those
     arrays are instances of. */
  var CARE_GROUPS = [
    { id: 'raw', label: 'Raw and unwashed',
      test: function (p) { return p.denim && p.denim.fade === 'high'; },
      rule: 'Do not wash for six months. Air it, spot clean it, and let the creases set where your body puts them.',
      detail: 'When you do wash: cold, inside out, and line dry out of the sun. Expect shrinkage at the first wash and expect it to come back within an hour of wearing. Every wash costs you contrast, which is the whole point of the cloth.' },
    { id: 'coated', label: 'Coated and resin-finished',
      test: function (p) { return /coated/i.test(p.composition || ''); },
      rule: 'Dry clean. Never bleach, and never put it near direct heat.',
      detail: 'The coating softens and creases with wear — that is the finish maturing, not failing. Water spots will lift on their own; scrubbing them will not help.' },
    { id: 'undyed', label: 'Undyed and ecru',
      test: function (p) { return /undyed/i.test(p.composition || ''); },
      rule: 'Wash separately for the first three washes. Cold water only.',
      detail: 'There is no indigo to lose, so these warm towards ivory rather than fading. They will pick up colour from anything darker in the machine, permanently.' },
    { id: 'structured', label: 'Boned and structured',
      test: function (p) { return p.category === 'corsets'; },
      rule: 'Spot clean only. Store flat, never folded at the boning.',
      detail: 'Wringing or machine washing will distort spiral steel and it will not come back. Keep hardware dry; if it gets wet, dry it immediately rather than letting it sit.' },
    { id: 'silk', label: 'Silk-lined',
      test: function (p) { return /silk/i.test(p.composition || ''); },
      rule: 'Professional clean only, and tell them there is silk against denim.',
      detail: 'The two fabrics shrink at different rates. A general dry cleaner who treats it as denim will pucker the lining.' },
    { id: 'leather', label: 'Leather and suede',
      test: function (p) { return /leather|suede|calf/i.test(p.composition || ''); },
      rule: 'Condition twice a year. Protect before first wear, and keep it out of prolonged wet.',
      detail: 'Vegetable-tanned leather darkens where it is handled, which is the intended ageing. Suede linings should be brushed dry, never washed.' },
    { id: 'brass', label: 'Solid brass hardware',
      test: function (p) { return /brass/i.test(p.composition || ''); },
      rule: 'Wipe dry. Polish sparingly, or not at all.',
      detail: 'Cast brass dulls to a warm patina over about three months. That is the finish arriving. Polishing it back is a choice, not maintenance.' },
    { id: 'welted', label: 'Welted footwear',
      test: function (p) { return p.category === 'shoes' || p.category === 'heels'; },
      rule: 'Shoe trees from the first day. Re-tip heels before the metal shows.',
      detail: 'A Goodyear welt can be resoled indefinitely by any competent cobbler — you do not have to send them to us. Brush denim uppers dry rather than sponging them.' }
  ];

  /* The words for the two other cloth properties. They live here beside the
     values they describe rather than in the product page's own lookup table,
     which is how a new `hand` value ends up rendering as a blank. */
  var HAND = {
    rigid: { label: 'Rigid',          sub: 'no stretch' },
    gives: { label: 'Gives a little', sub: 'slight stretch' },
    soft:  { label: 'Soft',           sub: 'drapes' }
  };
  var FADE = {
    high: { label: 'Fades hard',   sub: 'high contrast' },
    low:  { label: 'Fades gently', sub: 'low contrast' },
    none: { label: 'Holds colour', sub: 'no fade' }
  };

  /* Price bands as numeric edges rather than hand-written labels beside
     hand-written tests. `max` is exclusive; null is open-ended. */
  var PRICE_BANDS = [
    { id: 'u500',     min: 0,    max: 500 },
    { id: '500-800',  min: 500,  max: 800 },
    { id: '800-1000', min: 800,  max: 1000 },
    { id: 'o1000',    min: 1000, max: null }
  ];

  var APPAREL = ['XS', 'S', 'M', 'L', 'XL'];
  var WAIST   = ['24', '25', '26', '27', '28', '29', '30', '32'];
  var FOOT    = ['36', '37', '38', '39', '40', '41'];
  var ONE     = ['One size'];

  /* Cost structure genuinely varies by how a thing is built, not by SKU, so
     it lives on the build type. Shares, not dollars — the dollar figures are
     derived from the price at render time, which means a price change can
     never leave a stale breakdown behind it. */
  var COST_PROFILES = {
    core: [
      ['Cloth', 0.24], ['Cutting & construction', 0.19], ['Hand finishing', 0.12],
      ['Hardware & trims', 0.05], ['Atelier & overhead', 0.18], ['VOLÀ margin', 0.22]
    ],
    atelier: [
      ['Cloth', 0.20], ['Cutting & construction', 0.26], ['Hand finishing', 0.20],
      ['Hardware & trims', 0.06], ['Atelier & overhead', 0.16], ['VOLÀ margin', 0.12]
    ],
    accessory: [
      ['Cloth & leather', 0.26], ['Construction', 0.18], ['Hand finishing', 0.10],
      ['Hardware & trims', 0.12], ['Atelier & overhead', 0.14], ['VOLÀ margin', 0.20]
    ],
    footwear: [
      ['Upper & leather', 0.25], ['Lasting & welting', 0.22], ['Hand finishing', 0.09],
      ['Sole & hardware', 0.10], ['Atelier & overhead', 0.14], ['VOLÀ margin', 0.20]
    ]
  };

  /* Every element of `sizes` appears in `set` — used to tell a waist or foot
     size run apart from apparel letters by content, not by array identity.
     Vacuously true on an empty array, which never happens for a real
     product, so that edge case is not guarded against here. */
  function subsetOf(sizes, set) {
    return sizes.every(function (s) { return set.indexOf(s) > -1; });
  }

  function p(o) {
    o.images = o.images || [o.image];
    o.sizes = o.sizes || APPAREL;
    o.soldOut = o.soldOut || [];
    o.colours = o.colours || [];
    o.build = o.build || 'core';
    /* The badge is editorial and wins where it is set — "Signature" is a
       judgement, not a line. But a piece that IS made to order and carries no
       badge at all reads as ordinary stock next to an identical sibling that
       does, so the line supplies one when nothing else has. */
    if (!o.flag) {
      if (o.tag === 'atelier') o.flag = 'Atelier';
      else if (o.tag === 'new') o.flag = 'New';
    }
    /* which size vocabulary this piece speaks — the fit profile keeps one
       saved size per system, not one per product.

       By VALUE, not by reference: a product straight out of data.js carries
       the actual WAIST/FOOT/ONE constant, but a product just written by
       tools/shopify-sync.mjs carries a freshly parsed array that is never
       === to anything, no matter its contents. Checking identity meant every
       waist- and foot-sized piece would silently misclassify as 'apparel'
       the moment a real sync ran — wrong for the Fit Studio's size advice,
       fit.canSize(), and the order page's sized-pieces filter, and wrong in
       a way nothing would announce. Checking membership instead survives
       both a hand-authored product and a synced one, and — usefully —
       survives a piece that only stocks some of a system's sizes, which
       reference equality to the full constant never would have. */
    o.sizeSystem =
      o.sizes.length === 1 ? 'one' :
      subsetOf(o.sizes, WAIST) ? 'waist' :
      subsetOf(o.sizes, FOOT) ? 'foot' : 'apparel';
    return o;
  }

  /* ─────────────────────────────────────────────────────────────────
     GENERATED by tools/shopify-sync.mjs on 2026-09-10T22:43:02.714Z
     Do not edit by hand — re-run the sync instead. Everything outside
     this array is editorial and is preserved by the sync.
     ───────────────────────────────────────────────────────────────── */
  var PRODUCTS = [
    p({
          "id": "sculpt-raw-jean",
          "name": "Sculpt Raw Selvedge Jean",
          "category": "jeans",
          "price": 690,
          "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-sculpt-raw.svg?v=1789077404",
          "images": [
                "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-sculpt-raw.svg?v=1789077404",
                "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-column-washed.svg?v=1789077404",
                "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/editorial-01.svg?v=1789077404",
                "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-noir.svg?v=1789077404"
          ],
          "alt": "Sculpted raw-denim trouser by VOLÀ, deep indigo",
          "colour": "Raw Indigo",
          "colours": [
                {
                      "name": "Raw Indigo",
                      "hex": "#243352",
                      "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-sculpt-raw.svg?v=1789077404"
                },
                {
                      "name": "Noir",
                      "hex": "#26241F",
                      "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-noir.svg?v=1789077404"
                }
          ],
          "sizes": [
                "24",
                "25",
                "26",
                "27",
                "28",
                "29",
                "30",
                "32"
          ],
          "soldOut": [
                "24"
          ],
          "blurb": "A moulded high-rise cut in 14oz Japanese selvedge, wet-set on the stand so the leg holds its own architecture.",
          "composition": "100% Japanese cotton selvedge denim, 14oz",
          "care": [
                "Cold wash inside out, or spot clean",
                "Line dry away from direct sun",
                "Do not tumble dry"
          ],
          "atelier": "",
          "fabric": "Kaihara mill, Hiroshima",
          "tag": "new",
          "variants": {
                "24": "gid://shopify/ProductVariant/50177545273482",
                "25": "gid://shopify/ProductVariant/50177545306250",
                "26": "gid://shopify/ProductVariant/50177545339018",
                "27": "gid://shopify/ProductVariant/50177545371786",
                "28": "gid://shopify/ProductVariant/50177545404554",
                "29": "gid://shopify/ProductVariant/50177545437322",
                "30": "gid://shopify/ProductVariant/50177545470090",
                "32": "gid://shopify/ProductVariant/50177545502858",
                "24::Raw Indigo": "gid://shopify/ProductVariant/50177545273482",
                "25::Raw Indigo": "gid://shopify/ProductVariant/50177545306250",
                "26::Raw Indigo": "gid://shopify/ProductVariant/50177545339018",
                "27::Raw Indigo": "gid://shopify/ProductVariant/50177545371786",
                "28::Raw Indigo": "gid://shopify/ProductVariant/50177545404554",
                "29::Raw Indigo": "gid://shopify/ProductVariant/50177545437322",
                "30::Raw Indigo": "gid://shopify/ProductVariant/50177545470090",
                "32::Raw Indigo": "gid://shopify/ProductVariant/50177545502858",
                "24::Noir": "gid://shopify/ProductVariant/50177545535626",
                "25::Noir": "gid://shopify/ProductVariant/50177545568394",
                "26::Noir": "gid://shopify/ProductVariant/50177545601162",
                "27::Noir": "gid://shopify/ProductVariant/50177545633930",
                "28::Noir": "gid://shopify/ProductVariant/50177545666698",
                "29::Noir": "gid://shopify/ProductVariant/50177545699466",
                "30::Noir": "gid://shopify/ProductVariant/50177545732234",
                "32::Noir": "gid://shopify/ProductVariant/50177545765002"
          },
          "variantId": "gid://shopify/ProductVariant/50177545273482",
          "flag": "Signature",
          "denim": {
                "oz": 14,
                "hand": "rigid",
                "fade": "high",
                "note": "Unsanforised and unwashed. Expect roughly 2cm of shrink at the first wash and sharp contrast at the knee and hip within six to nine months."
          },
          "prov": {
                "mill": "Kaihara",
                "city": "Hiroshima",
                "country": "Japan",
                "since": 1893,
                "hours": 11,
                "hands": 3
          },
          "fit": {
                "cut": "High-rise, moulded through the hip, tapered from the knee",
                "advice": "up",
                "model": "Model is 178cm and wears a 26"
          }
    }),
    p({
          "id": "column-wide-jean",
          "name": "Column Wide-Leg Jean",
          "category": "jeans",
          "price": 620,
          "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-column-washed_87359e8c-76ae-4f73-ac1f-c406dceedb1e.svg?v=1789077528",
          "images": [
                "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-column-washed_87359e8c-76ae-4f73-ac1f-c406dceedb1e.svg?v=1789077528",
                "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-sculpt-raw_75aad761-ac62-40f6-9f9b-250d8e43537f.svg?v=1789077528"
          ],
          "alt": "Wide column jean in washed indigo by VOLÀ",
          "colour": "Vapour Wash",
          "colours": [
                {
                      "name": "Vapour Wash",
                      "hex": "#7D94B4",
                      "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-column-washed_87359e8c-76ae-4f73-ac1f-c406dceedb1e.svg?v=1789077528"
                },
                {
                      "name": "Raw Indigo",
                      "hex": "#243352",
                      "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-sculpt-raw_75aad761-ac62-40f6-9f9b-250d8e43537f.svg?v=1789077528"
                }
          ],
          "sizes": [
                "24",
                "25",
                "26",
                "27",
                "28",
                "29",
                "30",
                "32"
          ],
          "soldOut": [
                "32"
          ],
          "blurb": "A true column: a single unbroken line from waist to floor, stone-washed by hand to a soft vapour blue.",
          "composition": "98% organic cotton, 2% elastane, 12oz",
          "care": [
                "Cold gentle machine wash",
                "Reshape while damp",
                "Warm iron on reverse"
          ],
          "atelier": "Hand-washed in small lots of forty. No two pairs identical.",
          "fabric": "Candiani mill, Milan",
          "tag": "core",
          "variants": {
                "24": "gid://shopify/ProductVariant/50177554055306",
                "25": "gid://shopify/ProductVariant/50177554088074",
                "26": "gid://shopify/ProductVariant/50177554120842",
                "27": "gid://shopify/ProductVariant/50177554153610",
                "28": "gid://shopify/ProductVariant/50177554186378",
                "29": "gid://shopify/ProductVariant/50177554219146",
                "30": "gid://shopify/ProductVariant/50177554251914",
                "32": "gid://shopify/ProductVariant/50177554284682",
                "24::Vapour Wash": "gid://shopify/ProductVariant/50177554055306",
                "25::Vapour Wash": "gid://shopify/ProductVariant/50177554088074",
                "26::Vapour Wash": "gid://shopify/ProductVariant/50177554120842",
                "27::Vapour Wash": "gid://shopify/ProductVariant/50177554153610",
                "28::Vapour Wash": "gid://shopify/ProductVariant/50177554186378",
                "29::Vapour Wash": "gid://shopify/ProductVariant/50177554219146",
                "30::Vapour Wash": "gid://shopify/ProductVariant/50177554251914",
                "32::Vapour Wash": "gid://shopify/ProductVariant/50177554284682",
                "24::Raw Indigo": "gid://shopify/ProductVariant/50177554317450",
                "25::Raw Indigo": "gid://shopify/ProductVariant/50177554350218",
                "26::Raw Indigo": "gid://shopify/ProductVariant/50177554382986",
                "27::Raw Indigo": "gid://shopify/ProductVariant/50177554415754",
                "28::Raw Indigo": "gid://shopify/ProductVariant/50177554448522",
                "29::Raw Indigo": "gid://shopify/ProductVariant/50177554481290",
                "30::Raw Indigo": "gid://shopify/ProductVariant/50177554514058",
                "32::Raw Indigo": "gid://shopify/ProductVariant/50177554546826"
          },
          "variantId": "gid://shopify/ProductVariant/50177554055306",
          "denim": {
                "oz": 12,
                "hand": "gives",
                "fade": "low",
                "note": "Already stone-washed, so the colour is close to settled. The 2% elastane gives about a centimetre at the waist through the day and recovers overnight."
          },
          "prov": {
                "mill": "Candiani",
                "city": "Milan",
                "country": "Italy",
                "since": 1938,
                "hours": 7,
                "hands": 2
          },
          "fit": {
                "cut": "Mid-rise, straight and wide from the hip, full break",
                "advice": "true",
                "model": "Model is 180cm and wears a 27"
          }
    }),
    p({
          "id": "noir-coated-jean",
          "name": "Noir Coated Skinny Jean",
          "category": "jeans",
          "price": 580,
          "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-noir_b48a9a71-c3ee-4c05-94bb-3730fcbc24fd.svg?v=1789077574",
          "images": [
                "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-noir_b48a9a71-c3ee-4c05-94bb-3730fcbc24fd.svg?v=1789077574"
          ],
          "alt": "Coated black denim jean by VOLÀ",
          "colour": "Coated Noir",
          "colours": [
                {
                      "name": "Coated Noir",
                      "hex": "#26241F",
                      "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/jeans-noir_b48a9a71-c3ee-4c05-94bb-3730fcbc24fd.svg?v=1789077574"
                }
          ],
          "sizes": [
                "24",
                "25",
                "26",
                "27",
                "28",
                "29",
                "30",
                "32"
          ],
          "soldOut": [],
          "blurb": "Resin-coated black denim with the hand of waxed leather, cut narrow through the ankle.",
          "composition": "92% cotton, 6% polyester, 2% elastane",
          "care": [
                "Dry clean recommended",
                "Do not bleach",
                "Coating softens with wear"
          ],
          "atelier": "Coating applied in three passes, cured between each.",
          "fabric": "Berto mill, Veneto",
          "tag": "core",
          "variants": {
                "24": "gid://shopify/ProductVariant/50177556086922",
                "25": "gid://shopify/ProductVariant/50177556119690",
                "26": "gid://shopify/ProductVariant/50177556152458",
                "27": "gid://shopify/ProductVariant/50177556185226",
                "28": "gid://shopify/ProductVariant/50177556217994",
                "29": "gid://shopify/ProductVariant/50177556250762",
                "30": "gid://shopify/ProductVariant/50177556283530",
                "32": "gid://shopify/ProductVariant/50177556316298",
                "24::Coated Noir": "gid://shopify/ProductVariant/50177556086922",
                "25::Coated Noir": "gid://shopify/ProductVariant/50177556119690",
                "26::Coated Noir": "gid://shopify/ProductVariant/50177556152458",
                "27::Coated Noir": "gid://shopify/ProductVariant/50177556185226",
                "28::Coated Noir": "gid://shopify/ProductVariant/50177556217994",
                "29::Coated Noir": "gid://shopify/ProductVariant/50177556250762",
                "30::Coated Noir": "gid://shopify/ProductVariant/50177556283530",
                "32::Coated Noir": "gid://shopify/ProductVariant/50177556316298"
          },
          "variantId": "gid://shopify/ProductVariant/50177556086922",
          "denim": {
                "oz": 11,
                "hand": "gives",
                "fade": "none",
                "note": "The resin coating holds its colour but softens and creases at the knee and ankle. That crease is the finish maturing, not the coating failing."
          },
          "prov": {
                "mill": "Berto",
                "city": "Veneto",
                "country": "Italy",
                "since": 1887,
                "hours": 6,
                "hands": 2
          },
          "fit": {
                "cut": "Mid-rise, narrow through the thigh and ankle",
                "advice": "true",
                "model": "Model is 175cm and wears a 26"
          }
    }),
    p({
          "id": "atelier-shirt",
          "name": "Atelier Oversized Shirt",
          "category": "shirts",
          "price": 440,
          "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/shirt-atelier.svg?v=1789077607",
          "images": [
                "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/shirt-atelier.svg?v=1789077607",
                "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/shirt-ecru.svg?v=1789077607"
          ],
          "alt": "Oversized atelier denim shirt by VOLÀ",
          "colour": "Vapour Wash",
          "colours": [
                {
                      "name": "Vapour Wash",
                      "hex": "#7D94B4",
                      "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/shirt-atelier.svg?v=1789077607"
                },
                {
                      "name": "Ecru",
                      "hex": "#E6DFD2",
                      "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/shirt-ecru.svg?v=1789077607"
                }
          ],
          "sizes": [
                "XS",
                "S",
                "M",
                "L",
                "XL"
          ],
          "soldOut": [],
          "blurb": "Dropped shoulder, mother-of-pearl closure, a collar built with the structure of a tailored jacket.",
          "composition": "100% cotton chambray, 6oz",
          "care": [
                "Machine wash cold",
                "Tumble dry low",
                "Iron collar and cuffs damp"
          ],
          "atelier": "Collar interlined by hand — forty minutes on its own.",
          "fabric": "Albini mill, Bergamo",
          "tag": "new",
          "variants": {
                "XS::Vapour Wash": "gid://shopify/ProductVariant/50177557528714",
                "XS": "gid://shopify/ProductVariant/50177557528714",
                "S::Vapour Wash": "gid://shopify/ProductVariant/50177557561482",
                "S": "gid://shopify/ProductVariant/50177557561482",
                "M::Vapour Wash": "gid://shopify/ProductVariant/50177557594250",
                "M": "gid://shopify/ProductVariant/50177557594250",
                "L::Vapour Wash": "gid://shopify/ProductVariant/50177557627018",
                "L": "gid://shopify/ProductVariant/50177557627018",
                "XL::Vapour Wash": "gid://shopify/ProductVariant/50177557659786",
                "XL": "gid://shopify/ProductVariant/50177557659786",
                "XS::Ecru": "gid://shopify/ProductVariant/50177557692554",
                "S::Ecru": "gid://shopify/ProductVariant/50177557725322",
                "M::Ecru": "gid://shopify/ProductVariant/50177557758090",
                "L::Ecru": "gid://shopify/ProductVariant/50177557790858",
                "XL::Ecru": "gid://shopify/ProductVariant/50177557823626"
          },
          "variantId": "gid://shopify/ProductVariant/50177557528714",
          "denim": {
                "oz": 6,
                "hand": "soft",
                "fade": "low",
                "note": "Light chambray, soft from the first wear. The indigo lifts slightly at the collar and cuff over a year and stops there."
          },
          "prov": {
                "mill": "Albini",
                "city": "Bergamo",
                "country": "Italy",
                "since": 1876,
                "hours": 5,
                "hands": 2
          },
          "fit": {
                "cut": "Oversized, dropped shoulder, boxy through the body",
                "advice": "down",
                "model": "Model is 176cm and wears an S"
          }
    }),
    p({
          "id": "ecru-selvedge-shirt",
          "name": "Ecru Selvedge Shirt",
          "category": "shirts",
          "price": 460,
          "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/shirt-ecru_b5fa63e0-46e4-4bdc-8f14-cddec465ccdd.svg?v=1789077632",
          "images": [
                "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/shirt-ecru_b5fa63e0-46e4-4bdc-8f14-cddec465ccdd.svg?v=1789077632"
          ],
          "alt": "Ecru selvedge denim shirt by VOLÀ",
          "colour": "Ecru",
          "colours": [
                {
                      "name": "Ecru",
                      "hex": "#E6DFD2",
                      "image": "https://cdn.shopify.com/s/files/1/0796/4209/9850/files/shirt-ecru_b5fa63e0-46e4-4bdc-8f14-cddec465ccdd.svg?v=1789077632"
                }
          ],
          "sizes": [
                "XS",
                "S",
                "M",
                "L",
                "XL"
          ],
          "soldOut": [
                "XS"
          ],
          "blurb": "Undyed selvedge in its natural state — the denim before indigo. It ages into ivory.",
          "composition": "100% undyed organic cotton, 9oz",
          "care": [
                "Wash separately for the first three washes",
                "Cold water only",
                "Line dry"
          ],
          "atelier": "Left undyed by intention; the yarn is the finish.",
          "fabric": "Kuroki mill, Okayama",
          "tag": "core",
          "variants": {
                "XS::Ecru": "gid://shopify/ProductVariant/50177559232650",
                "XS": "gid://shopify/ProductVariant/50177559232650",
                "S::Ecru": "gid://shopify/ProductVariant/50177559265418",
                "S": "gid://shopify/ProductVariant/50177559265418",
                "M::Ecru": "gid://shopify/ProductVariant/50177559298186",
                "M": "gid://shopify/ProductVariant/50177559298186",
                "L::Ecru": "gid://shopify/ProductVariant/50177559330954",
                "L": "gid://shopify/ProductVariant/50177559330954",
                "XL::Ecru": "gid://shopify/ProductVariant/50177559363722",
                "XL": "gid://shopify/ProductVariant/50177559363722"
          },
          "variantId": "gid://shopify/ProductVariant/50177559232650",
          "denim": {
                "oz": 9,
                "hand": "rigid",
                "fade": "none",
                "note": "Undyed, so there is no indigo to lose. It warms towards ivory with wear rather than fading — the opposite direction to the rest of the collection."
          },
          "prov": {
                "mill": "Kuroki",
                "city": "Okayama",
                "country": "Japan",
                "since": 1950,
                "hours": 6,
                "hands": 2
          },
          "fit": {
                "cut": "Straight, standard shoulder, slightly cropped body",
                "advice": "true",
                "model": "Model is 174cm and wears an M"
          }
    })
  ];

  /* ═══════════════════════════════════════════════════════ REVIEWS ═══
     Real reviews, pulled from Judge.me at build time by tools/judgeme-sync.mjs.
     Empty until that sync has run against a shop — see REVIEWS.md.

     This array held thirty-five written examples while the review pages were
     being designed. They are gone. Publishing invented reviews as genuine is
     illegal in most of the markets this site ships to, and the empty states
     are built: a product with no reviews says so, and the reviews page says so.

     Every rating and every true-to-size figure on the site is counted from
     here, so nothing is asserted that a reader cannot check. `fit` is the
     reviewer's own verdict — the Judge.me custom question that carries it is
     configured in shopify-config.js, and without it the fit filtering and the
     true-to-size figures have nothing to count.

     Do not edit by hand: reviews are moderated in Judge.me and re-synced.
     ─────────────────────────────────────────────────────────────────────── */
  var REVIEWS = [

  ];

  /* The house size chart. Body measurements in centimetres, and the denim
     waist sizes each apparel size corresponds to — this is the only place the
     two size systems are related to each other, so the size guide and
     anything built on it later cannot disagree about it.

     The `denim` arrays are checked against WAIST when the guide renders, so a
     row can never promise a waist size the catalogue does not cut. */
  var SIZE_CHART = [
    { size: 'XS', waist: [61, 64], hip: [86, 89],   bust: [80, 83],   denim: ['24', '25'] },
    { size: 'S',  waist: [65, 69], hip: [90, 94],   bust: [84, 88],   denim: ['26', '27'] },
    { size: 'M',  waist: [70, 74], hip: [95, 99],   bust: [89, 93],   denim: ['28', '29'] },
    { size: 'L',  waist: [75, 80], hip: [100, 105], bust: [94, 99],   denim: ['30', '31'] },
    { size: 'XL', waist: [81, 86], hip: [106, 111], bust: [100, 105], denim: ['32', '33'] }
  ];

  /* Cost breakdown in dollars, derived from price × share. The last row
     absorbs the rounding so the column always sums to the price on the
     page — a breakdown that does not add up costs more trust than it buys. */
  function costs(product) {
    var rows = COST_PROFILES[product.build] || COST_PROFILES.core;
    var out = [], running = 0;
    rows.forEach(function (r, i) {
      var amount = i === rows.length - 1
        ? product.price - running
        : Math.round(product.price * r[1]);
      running += amount;
      out.push({ label: r[0], amount: amount, share: amount / product.price });
    });
    return out;
  }

  window.VOLA = window.VOLA || {};
  window.VOLA.products = PRODUCTS;
  window.VOLA.categories = CATEGORIES;
  /* One place that turns a {min, max} band into the sentence describing it
     and the test that selects it, so a label can never advertise a range its
     own predicate does not match. */
  /* `pair` exists because the two unit styles want different range text: a
     currency prefix has to repeat ("$500 – $800") while a trailing unit reads
     better said once ("9–13oz"). */
  function band(b, format, pair) {
    var f = format || String;
    var both = pair || function (lo, hi) { return f(lo) + ' – ' + f(hi); };
    return {
      id: b.id,
      label: b.max == null ? f(b.min) + ' and up'
        : b.min === 0 ? 'Under ' + f(b.max)
        : both(b.min, b.max),
      test: function (value) {
        return value >= b.min && (b.max == null || value < b.max);
      }
    };
  }

  window.VOLA.costs = costs;

  /* The profiles themselves, so the traceability page can explain the shape of
     a price once in general rather than leaving nineteen per-product panels to
     be reverse-engineered. `label` is what a shopper would call this kind of
     construction, not the internal key. */
  window.VOLA.costProfiles = Object.keys(COST_PROFILES).map(function (key) {
    /* Named for how the thing is BUILT, not which line it is sold on. The
       Atelier Top-Handle Bag is made to order but costed like a bag, because
       its cost structure is a bag's — so "a made-to-order piece" would have
       been the wrong label here and would have contradicted the count of
       made-to-order pieces elsewhere on the same page. */
    var labels = {
      core: 'Cut and sewn',
      atelier: 'Hand-built and structured',
      accessory: 'Leather and hardware',
      footwear: 'Lasted and welted'
    };
    var mine = PRODUCTS.filter(function (p) { return p.build === key; });
    var cats = [];
    mine.forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
    return {
      id: key,
      label: labels[key] || key,
      /* the categories this profile actually covers, so the card is checkable
         rather than a name you have to take on trust */
      categories: cats,
      rows: COST_PROFILES[key].map(function (r) { return { label: r[0], share: r[1] }; }),
      pieces: mine.length
    };
  });
  window.VOLA.sizeSets = { apparel: APPAREL, waist: WAIST, foot: FOOT, one: ONE };
  window.VOLA.sizeChart = SIZE_CHART;
  window.VOLA.lines = LINES;
  window.VOLA.band = band;

  /* ------------------------------------------------------------- reviews */
  /* Every rating and every true-to-size figure on the site is counted from
     this list. Before, a product carried its own `rating: 4.9, reviews: 128`
     and its own `tts: 0.58` as free-standing assertions — numbers nobody
     could check against anything, on a page that showed no reviews at all. */
  REVIEWS.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  window.VOLA.reviews = REVIEWS;

  window.VOLA.reviewsFor = function (productId) {
    return REVIEWS.filter(function (r) { return r.product === productId; });
  };

  var FIT_VERDICTS = ['small', 'true', 'large'];

  /* count, average, and the fit breakdown. `tts` is null rather than 0 when
     there is nothing to count, so a product with no reviews renders an empty
     state instead of claiming that nobody finds it true to size. */
  window.VOLA.reviewStats = function (productId) {
    var list = window.VOLA.reviewsFor(productId);
    if (!list.length) return { count: 0, average: null, tts: null, fit: null, trueCount: 0, fitCount: 0 };

    var sum = list.reduce(function (n, r) { return n + r.rating; }, 0);
    var fit = {};
    FIT_VERDICTS.forEach(function (v) {
      fit[v] = list.filter(function (r) { return r.fit === v; }).length;
    });

    /* Only reviews that actually answered the fit question count towards the
       true-to-size share. Dividing by every review instead would read a
       missing answer as "not true to size" — which is how a piece with ten
       glowing reviews and no fit question ends up advertising 0%. */
    var answered = fit.small + fit['true'] + fit.large;

    return {
      count: list.length,
      average: sum / list.length,
      tts: answered ? fit['true'] / answered : null,
      trueCount: fit['true'],
      fitCount: answered,
      fit: fit
    };
  };

  /* Site-wide, for the reviews page header. */
  window.VOLA.reviewTotals = function () {
    if (!REVIEWS.length) return { count: 0, average: null, products: 0 };
    var sum = REVIEWS.reduce(function (n, r) { return n + r.rating; }, 0);
    var seen = {};
    REVIEWS.forEach(function (r) { seen[r.product] = 1; });
    return { count: REVIEWS.length, average: sum / REVIEWS.length, products: Object.keys(seen).length };
  };
  window.VOLA.disciplines = DISCIPLINES;
  window.VOLA.commissionSteps = COMMISSION_STEPS;

  /* Each regimen with the pieces it actually applies to. A rule with no piece
     behind it is dropped rather than printed — the care page should describe
     this collection, not a hypothetical one. */
  window.VOLA.careGroups = CARE_GROUPS.map(function (g) {
    return {
      id: g.id, label: g.label, rule: g.rule, detail: g.detail,
      pieces: PRODUCTS.filter(g.test)
    };
  }).filter(function (g) { return g.pieces.length; });
  window.VOLA.denimVocab = { hand: HAND, fade: FADE };

  /* Which weight band a piece falls in — the same answer the collection page
     filters on. The product page used to carry its own thresholds, which put
     the 13.5oz Trucker in "mid-weight" on its own page and under "Heavy" in
     the rail. One function, one answer. */
  window.VOLA.weightBand = function (product) {
    return window.VOLA.clothWeights.filter(function (w) { return w.test(product); })[0] || null;
  };

  window.VOLA.clothWeights = CLOTH_WEIGHTS.map(function (w) {
    var b = band(w,
      function (n) { return n + 'oz'; },
      function (lo, hi) { return lo + '–' + hi + 'oz'; });
    return {
      id: w.id, name: w.name, copy: w.copy,
      range: b.label,
      test: function (p) { return p.denim && b.test(p.denim.oz); }
    };
  });

  window.VOLA.priceBands = PRICE_BANDS.map(function (p) {
    var b = band(p, function (n) { return '$' + n.toLocaleString('en-US'); });
    return {
      id: p.id, label: b.label,
      test: function (prod) { return b.test(prod.price); }
    };
  });
})();
