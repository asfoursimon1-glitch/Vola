#!/usr/bin/env python3
"""
VOLA - editorial placeholder art generator.

Produces 4:5 portrait SVGs: a studio-lit field of draped denim folds, a woven
twill overlay and a selvedge edge. Each plate is seeded from its filename, so
every product gets a distinct but consistent image.

These are art-directed stand-ins, not product photographs. Replace them with
real photography using the same filenames and nothing will shift: the aspect
ratio is fixed by CSS and width/height are declared on every <img>.

    python assets/img/_generate.py
"""
import math
import os

W, H = 800, 1000
OUT = os.path.dirname(os.path.abspath(__file__))

# colourway: (shadow, mid, light, selvedge thread)
WAYS = {
    "raw":    ("#0D1421", "#1C2942", "#3B5480", "#C8A24A"),
    "washed": ("#4A607F", "#71879F", "#A8BACD", "#F7F4EE"),
    "ecru":   ("#B3A793", "#D6CDBC", "#EFE9DD", "#8A6D3B"),
    "noir":   ("#0C0B0A", "#211F1C", "#3A3630", "#A37B3C"),
    "stone":  ("#7C7466", "#A69D8E", "#CAC3B6", "#F5F1E9"),
    "indigo": ("#141D30", "#26375A", "#48659A", "#D4B571"),
}


class Rng(object):
    """Tiny deterministic LCG so plates are stable across runs."""

    def __init__(self, seed):
        self.s = seed & 0x7FFFFFFF or 1

    def next(self):
        self.s = (self.s * 1103515245 + 12345) & 0x7FFFFFFF
        return self.s / 0x7FFFFFFF

    def between(self, a, b):
        return a + (b - a) * self.next()


def seed_of(name):
    s = 7
    for ch in name:
        s = (s * 131 + ord(ch)) & 0x7FFFFFFF
    return s


def mix(c1, c2, t):
    """Blend two #rrggbb colours."""
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return "#%02x%02x%02x" % tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def folds(rng, shadow, mid, light):
    """A run of vertical fabric folds, each a closed curve from top to bottom."""
    out = []
    n = int(rng.between(6, 9))
    edges = [(-90.0, )]
    x = -90.0
    step = (W + 180.0) / n
    xs = [x]
    for i in range(n):
        x += step * rng.between(0.72, 1.3)
        xs.append(x)
    # normalise so the folds always span the frame
    span = xs[-1] - xs[0]
    xs = [(v - xs[0]) * ((W + 180.0) / span) - 90.0 for v in xs]

    for i in range(n):
        x0, x1 = xs[i], xs[i + 1]
        # each fold drifts as it falls, like cloth off a bolt
        drift_a = rng.between(-46, 46)
        drift_b = rng.between(-46, 46)
        bow_a = rng.between(0.28, 0.52)
        bow_b = rng.between(0.48, 0.74)

        d = (
            "M%.1f 0 C%.1f %.1f %.1f %.1f %.1f %d "
            "L%.1f %d C%.1f %.1f %.1f %.1f %.1f 0 Z"
        ) % (
            x0,
            x0 + drift_a, H * bow_a, x0 + drift_a * 1.6, H * bow_b, x0 + drift_a * 0.5, H,
            x1 + drift_b * 0.5,
            H, x1 + drift_b * 1.6, H * bow_b, x1 + drift_b, H * bow_a, x1,
        )

        # light falls from the upper left: lit ribbons alternate with shadowed ones
        t = 0.5 + 0.5 * math.sin(i * 1.7 + rng.between(0, 1.2))
        lit = 1.0 - abs((x0 + x1) / 2.0 - W * 0.34) / (W * 1.15)
        tone = max(0.0, min(1.0, 0.32 * t + 0.68 * lit))
        col = mix(shadow, mid, min(1.0, tone * 1.55)) if tone < 0.62 \
            else mix(mid, light, (tone - 0.62) / 0.38)
        out.append('<path d="%s" fill="%s"/>' % (d, col))

        # the crease line where two folds meet
        out.append(
            '<path d="M%.1f 0 C%.1f %.1f %.1f %.1f %.1f %d" fill="none" '
            'stroke="%s" stroke-opacity="0.5" stroke-width="%.1f"/>'
            % (x1, x1 + drift_b, H * bow_a, x1 + drift_b * 1.6, H * bow_b,
               x1 + drift_b * 0.5, H, shadow, rng.between(1.2, 3.4))
        )
    return "\n    ".join(out)


TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{label}">
  <title>{label}</title>
  <defs>
    <linearGradient id="ground" x1="0.1" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="{mid}"/>
      <stop offset="1" stop-color="{shadow}"/>
    </linearGradient>
    <linearGradient id="key" x1="0.05" y1="0" x2="0.85" y2="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.20"/>
      <stop offset="0.42" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.22"/>
    </linearGradient>
    <pattern id="twill" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-26)">
      <path d="M0 0v7" stroke="#ffffff" stroke-opacity="0.07" stroke-width="2.2"/>
      <path d="M3.5 0v7" stroke="#000000" stroke-opacity="0.07" stroke-width="1.8"/>
    </pattern>
    <radialGradient id="vig" cx="0.44" cy="0.36" r="0.82">
      <stop offset="0.5" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.42"/>
    </radialGradient>
    <clipPath id="frame"><rect width="{w}" height="{h}"/></clipPath>
  </defs>

  <rect width="{w}" height="{h}" fill="url(#ground)"/>
  <g clip-path="url(#frame)">
    {folds}
  </g>
  <rect width="{w}" height="{h}" fill="url(#twill)"/>
  <rect width="{w}" height="{h}" fill="url(#key)"/>
  <rect width="{w}" height="{h}" fill="url(#vig)"/>

  <!-- selvedge edge -->
  <rect x="{sx}" y="0" width="16" height="{h}" fill="#F3EEE3" fill-opacity="0.1"/>
  <rect x="{sxl}" y="0" width="2.5" height="{h}" fill="{thread}" fill-opacity="0.8"/>

  <text x="{w2}" y="{ty}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="24" letter-spacing="15" fill="#ffffff" fill-opacity="0.42">VOL&#192;</text>
</svg>
"""


def build(way, label, seed):
    shadow, mid, light, thread = WAYS[way]
    rng = Rng(seed)
    sx = rng.between(58, W - 90)
    return TEMPLATE.format(
        w=W, h=H, w2=W // 2, ty=H - 52,
        shadow=shadow, mid=mid, thread=thread,
        folds=folds(rng, shadow, mid, light),
        sx=round(sx, 1), sxl=round(sx + 6, 1),
        label=label,
    )


def catmull_rom_path(points, close_with=None):
    """Smooth cubic-bezier path through a list of (x, y) points, computed
    automatically (Catmull-Rom -> Bezier) rather than hand-picked control
    points - the reliable way to get a natural curve through a fixed set
    of anchors without visually iterating on it."""
    pts = [points[0]] + list(points) + [points[-1]]
    d = "M%.1f %.1f" % points[0]
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6.0, p1[1] + (p2[1] - p0[1]) / 6.0)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6.0, p2[1] - (p3[1] - p1[1]) / 6.0)
        d += " C%.1f %.1f %.1f %.1f %.1f %.1f" % (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1])
    if close_with:
        for x, y in close_with:
            d += " L%.1f %.1f" % (x, y)
        d += " Z"
    return d


def build_hero_silhouette(way="indigo"):
    """A cropped shoulder-to-thigh figure silhouette in denim, for the hero
    banner. Deliberately not a literal illustration of a face or hands -
    a headless, cropped editorial crop (the same framing real denim
    campaigns use) reads as 'a person in denim' without needing to draw
    anatomy that's hard to get right without a live preview to check it
    against. Transparent canvas: this sits inside .hero__media, above the
    existing CSS gradient, which stays the atmospheric backdrop."""
    w, h = 1920, 1200
    shadow, mid, light, thread = WAYS[way]

    # left boundary of the figure - shoulder, then an elbow kicked out
    # (arm bent, hand tucked at the waist), then hip, then thigh - monotonic
    # in y so the curve can't loop back on itself
    boundary = [
        (1280, 0), (1255, 60), (1220, 130), (1150, 230),
        (1175, 330), (1200, 400), (1250, 460), (1222, 600),
        (1204, 800), (1188, 1000), (1175, h),
    ]
    body_d = catmull_rom_path(boundary, close_with=[(w, h), (w, 0)])

    # a second, slightly-inset curve just for the rim-light stroke, so the
    # highlight reads as light wrapping the edge rather than a hard outline
    rim = [(x - 3, y) for x, y in boundary]
    rim_d = "M%.1f %.1f" % rim[0]
    for i in range(1, len(rim) - 2):
        p0, p1, p2, p3 = ([rim[0]] + rim + [rim[-1]])[i - 1:i + 3]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6.0, p1[1] + (p2[1] - p0[1]) / 6.0)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6.0, p2[1] - (p3[1] - p1[1]) / 6.0)
        rim_d += " C%.1f %.1f %.1f %.1f %.1f %.1f" % (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1])

    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"
     role="img" aria-label="Cropped silhouette of a figure in a VOLA denim jacket and jeans">
  <title>Cropped silhouette of a figure in a VOLA denim jacket and jeans</title>
  <defs>
    <linearGradient id="figure" x1="0.2" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="{mid}"/>
      <stop offset="1" stop-color="{shadow}"/>
    </linearGradient>
    <pattern id="ftwill" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-26)">
      <path d="M0 0v7" stroke="#ffffff" stroke-opacity="0.06" stroke-width="2.2"/>
      <path d="M3.5 0v7" stroke="#000000" stroke-opacity="0.08" stroke-width="1.8"/>
    </pattern>
    <clipPath id="figureClip"><path d="{body_d}"/></clipPath>
    <linearGradient id="edgeLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <path d="{body_d}" fill="url(#figure)"/>
  <rect width="{w}" height="{h}" fill="url(#ftwill)" clip-path="url(#figureClip)"/>

  <!-- belt - deliberately NOT full width: on a narrow (mobile) crop, a
       bar reaching the canvas edge would cross straight through whatever
       text sits there. Containing it near the figure keeps that from
       ever being possible, on any crop. -->
  <path d="M1195,455 C1330,470 1450,477 1560,476 C1580,489 1580,490 1560,498 C1450,499 1325,494 1188,478 Z"
        fill="{thread}" fill-opacity="0.9"/>
  <!-- topstitch accents on the jean leg -->
  <path d="M1215,560 C1205,720 1195,900 1182,1090" fill="none" stroke="{thread}"
        stroke-opacity="0.55" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round"/>
  <path d="M1650,520 C1660,700 1668,900 1672,1120" fill="none" stroke="{thread}"
        stroke-opacity="0.3" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round"/>
  <!-- collar notch -->
  <path d="M1230,18 L1265,58 L1300,15" fill="none" stroke="{thread}" stroke-opacity="0.6" stroke-width="2.5"/>

  <!-- rim light: the edge catching a single soft backlight, the one
       deliberately "modern" cue that reads as a lighting decision rather
       than a flat cutout -->
  <path d="{rim_d}" fill="none" stroke="url(#edgeLight)" stroke-width="7" stroke-linecap="round"/>
</svg>
""".format(w=w, h=h, shadow=shadow, mid=mid, thread=thread, body_d=body_d, rim_d=rim_d)


# (filename, colourway, alt/label)
PLATES = [
    ("jeans-sculpt-raw",    "raw",    "Sculpted raw-denim trouser by VOLA, deep indigo selvedge"),
    ("jeans-column-washed", "washed", "Wide column jean in washed indigo by VOLA"),
    ("jeans-noir",          "noir",   "Coated black denim jean by VOLA"),
    ("shirt-atelier",       "washed", "Oversized atelier denim shirt by VOLA"),
    ("shirt-ecru",          "ecru",   "Ecru selvedge denim shirt by VOLA"),
    ("corset-cinch",        "indigo", "Boned indigo denim corset by VOLA"),
    ("corset-noir",         "noir",   "Black denim corset with satin binding by VOLA"),
    ("jacket-trucker",      "raw",    "Deconstructed trucker jacket by VOLA"),
    ("jacket-opera",        "stone",  "Long opera denim coat by VOLA in stone wash"),
    ("dress-monolith",      "indigo", "Bias-cut denim column dress by VOLA"),
    ("dress-ecru",          "ecru",   "Ecru panelled denim dress by VOLA"),
    ("belt-obi",            "noir",   "Denim obi belt with brass buckle by VOLA"),
    ("belt-raw",            "raw",    "Raw denim waist belt by VOLA"),
    ("bag-atelier",         "raw",    "Structured denim top-handle bag by VOLA"),
    ("bag-ecru",            "ecru",   "Ecru canvas-denim shoulder bag by VOLA"),
    ("shoe-derby",          "indigo", "Denim-panelled derby by VOLA"),
    ("shoe-stone",          "stone",  "Stone-wash low boot by VOLA"),
    ("heel-vertige",        "noir",   "Sculpted denim stiletto by VOLA"),
    ("heel-indigo",         "indigo", "Indigo slingback heel by VOLA"),
    ("editorial-01",        "raw",    "VOLA campaign image: denim column dress"),
    ("editorial-02",        "stone",  "VOLA campaign image: corset in stone wash"),
    ("editorial-03",        "indigo", "VOLA campaign image: indigo tailoring"),
]

if __name__ == "__main__":
    for name, way, label in PLATES:
        with open(os.path.join(OUT, name + ".svg"), "w", encoding="utf-8") as fh:
            fh.write(build(way, label, seed_of(name)))
    with open(os.path.join(OUT, "hero-model.svg"), "w", encoding="utf-8") as fh:
        fh.write(build_hero_silhouette("noir"))
    print("generated %d plates + hero-model.svg" % len(PLATES))
