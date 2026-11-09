// Builds the SVG cards for Pruthvi Panchal's GitHub profile README (../assets/*.svg).
//
// The cards wear pruthvip.tech's look: deep-space #04060D, Earth-blue #5AA9FF, sunrise amber
// #FFB547, Archivo (wide for headings) and IBM Plex Mono. GitHub shows README images with <img>,
// which can't load web fonts, so every word is drawn as outlines from the font files in ./fonts.
// Motion is CSS inside each SVG, and it stops for visitors who ask for reduced motion.
//
// The hero's dotted Earth uses the same Natural Earth land data as the portfolio
// (../../pruthvip.tech/assets/js/earth-data.js), so pruthvip.tech must sit next to this folder.
//
// Run: npm install, then npm run build (from this folder).

import * as fk from 'fontkit';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'assets');
const EARTH_DATA = path.join(HERE, '..', '..', 'pruthvip.tech', 'assets', 'js', 'earth-data.js');

// pruthvip.tech's dark theme
const C = {
  bg: '#04060d', text: '#eef2ff', text2: '#aab5d1', text3: '#7682a1',
  blue: '#5aa9ff', amber: '#ffb547', amberInk: '#1d1404', green: '#4ade9b',
  line: 'rgba(140,170,255,.12)', line2: 'rgba(140,170,255,.24)', edge: 'rgba(140,170,255,.18)',
  amberSoft: 'rgba(255,181,71,.13)', amberLine: 'rgba(255,181,71,.45)',
  greenSoft: 'rgba(74,222,155,.13)', greenLine: 'rgba(74,222,155,.4)', ghost: 'rgba(255,255,255,.03)',
};

/* Type ------------------------------------------------------------------------------------- */

const FONT_FILES = { archivo: 'Archivo.ttf', mono: 'IBMPlexMono-Medium.ttf', deva: 'NotoSansDevanagari.ttf' };
for (const f of Object.values(FONT_FILES)) {
  if (!existsSync(path.join(HERE, 'fonts', f))) throw new Error(`Missing tools/fonts/${f}; see BUILD.md`);
}
const BASE = Object.fromEntries(Object.entries(FONT_FILES).map(([k, f]) => [k, fk.openSync(path.join(HERE, 'fonts', f))]));
const faces = new Map();
function face(name, wght, wdth) {
  const key = `${name}:${wght}:${wdth}`;
  if (!faces.has(key)) {
    const b = BASE[name];
    faces.set(key, wght && Object.keys(b.variationAxes || {}).length ? b.getVariation({ wght, wdth }) : b);
  }
  return faces.get(key);
}

// The site's text styles. ls is letter-spacing in em.
const T = {
  name: { font: 'archivo', wght: 720, wdth: 112, ls: -0.04 },
  tag: { font: 'archivo', wght: 650, wdth: 106, ls: -0.025 },
  head: { font: 'archivo', wght: 720, wdth: 110, ls: -0.025 },
  num: { font: 'archivo', wght: 720, wdth: 110, ls: -0.035, features: ['tnum'] },
  body: { font: 'archivo', wght: 400, wdth: 100, ls: 0 },
  bold: { font: 'archivo', wght: 650, wdth: 100, ls: 0 },
  btn: { font: 'archivo', wght: 620, wdth: 100, ls: 0 },
  mono: { font: 'mono', ls: 0 },
  kicker: { font: 'mono', ls: 0.16 },
  deva: { font: 'deva', wght: 600, wdth: 100, ls: 0 },
};

const r1 = (n) => { const v = Math.round(n * 10) / 10; return Object.is(v, -0) ? 0 : v; };
const r2 = (n) => { const v = Math.round(n * 100) / 100; return Object.is(v, -0) ? 0 : v; };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout(str, t, size) {
  const f = face(t.font, t.wght, t.wdth);
  const run = f.layout(str, t.features);
  const s = size / f.unitsPerEm;
  const key = `${t.font}:${t.wght}:${t.wdth}`;
  let x = 0;
  const parts = run.glyphs.map((g, i) => {
    const p = run.positions[i];
    const part = { g, key, x: x + p.xOffset * s, y: p.yOffset * s };
    x += p.xAdvance * s + (p.xAdvance ? t.ls * size : 0);
    return part;
  });
  return { parts, s, width: run.glyphs.length ? x - t.ls * size : 0 };
}
const measure = (str, t, size) => layout(str, t, size).width;

// Each glyph's outline is stored once per image (in font units) and placed with <use>,
// so repeated letters cost a few bytes instead of a whole outline.
let glyphs = new Map();
function glyphId(part) {
  const key = `${part.key}#${part.g.id}`;
  let g = glyphs.get(key);
  if (!g) {
    const d = part.g.path.mapPoints((px, py) => [px, -py]).toSVG().replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (m) => String(Math.round(+m)));
    g = { id: `g${glyphs.size.toString(36)}`, d };
    glyphs.set(key, g);
  }
  return g.id;
}
/** The glyph outlines used so far, as <path> defs; starts a fresh set for the next image. */
function takeGlyphs() {
  const out = [...glyphs.values()].map((g) => `<path id="${g.id}" d="${g.d}"/>`).join('');
  glyphs = new Map();
  return out;
}

/** One run of text. anchor: start | middle | end. */
function text(str, t, size, x, y, fill, anchor = 'start', attrs = '') {
  const L = layout(str, t, size);
  const ox = anchor === 'middle' ? x - L.width / 2 : anchor === 'end' ? x - L.width : x;
  let uses = '';
  for (const p of L.parts) {
    if (!p.g.path.commands.length) continue;
    const ux = Math.round(p.x / L.s);
    const uy = Math.round(-p.y / L.s);
    uses += `<use href="#${glyphId(p)}"${ux ? ` x="${ux}"` : ''}${uy ? ` y="${uy}"` : ''}/>`;
  }
  return uses ? `<g${attrs} fill="${fill}" transform="translate(${r2(ox)} ${r2(y)}) scale(${+L.s.toFixed(5)})">${uses}</g>` : '';
}

/** Several runs on one line: [[str, style, fill], ...]. */
function rich(runs, size, x, y, anchor = 'start') {
  const widths = runs.map(([s, t]) => measure(s, t, size));
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = anchor === 'middle' ? x - total / 2 : anchor === 'end' ? x - total : x;
  return runs.map(([s, t, fill], i) => { const out = text(s, t, size, cx, y, fill); cx += widths[i]; return out; }).join('');
}

/** Greedy word wrap. Returns lines of text. */
function wrap(str, t, size, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of str.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, t, size) > maxWidth) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/* Shared bits ----------------------------------------------------------------------------- */

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A starfield; a few stars twinkle (class tw, staggered). */
function stars(w, h, count, seed, twinkle = 0) {
  const rand = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = r1(rand() * w);
    const y = r1(rand() * h);
    const r = r2(0.4 + rand() * rand() * 1.1);
    const o = r2(0.18 + rand() * 0.55);
    const warm = rand() < 0.12;
    const fill = warm ? '#ffd6aa' : rand() < 0.3 ? '#aacdff' : '#ecf1ff';
    if (i < twinkle) out += `<circle class="tw" cx="${x}" cy="${y}" r="${r2(r + 0.35)}" fill="${fill}" style="animation-delay:-${r1(rand() * 6)}s"/>`;
    else out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${o}"/>`;
  }
  return out;
}
const TWINKLE_CSS = '.tw{animation:tw 6s ease-in-out infinite}@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}';

/** A card: the dark rounded panel every image sits on, so it reads the same in GitHub's light and dark themes. */
function card(w, h, title, body, { css = '', defs = '', reduced = '*{animation:none!important}' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">` +
    `<title>${esc(title)}</title>` +
    `<defs>${takeGlyphs()}<clipPath id="panel"><rect width="${w}" height="${h}" rx="22"/></clipPath>` +
    `<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1530"/><stop offset="1" stop-color="${C.bg}"/></linearGradient>${defs}</defs>` +
    `<style>${css}@media (prefers-reduced-motion:reduce){${reduced}}</style>` +
    `<g clip-path="url(#panel)"><rect width="${w}" height="${h}" fill="url(#sheen)"/>${body}</g>` +
    `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="21.5" fill="none" stroke="${C.edge}"/></svg>`;
}

/** Points around a tilted ellipse, as CSS keyframes that move an element along it. */
function ellipseKeyframes(name, a, b, tilt, steps, extra = () => '') {
  let k = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const ex = a * Math.cos(t);
    const ey = b * Math.sin(t);
    const x = ex * Math.cos(tilt) - ey * Math.sin(tilt);
    const y = ex * Math.sin(tilt) + ey * Math.cos(tilt);
    k += `${r2((i / steps) * 100)}%{transform:translate(${r1(x)}px,${r1(y)}px)${extra(t)}}`;
  }
  return `@keyframes ${name}{${k}}`;
}

function moonBall(id, r) {
  return `<radialGradient id="${id}" cx="${-r * 0.35}" cy="${-r * 0.4}" r="${r * 1.25}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#f2f4f8"/><stop offset=".55" stop-color="#aeb4c2"/><stop offset="1" stop-color="#3b4150"/></radialGradient>`;
}
function moonShape(id, r) {
  const craters = [[0.25, -0.15, 0.22], [-0.3, 0.22, 0.16], [0.05, 0.45, 0.12], [-0.12, -0.42, 0.1]]
    .map(([dx, dy, s]) => `<circle cx="${r1(dx * r)}" cy="${r1(dy * r)}" r="${r1(s * r)}" fill="rgba(66,72,88,.35)"/>`).join('');
  return `<circle r="${r}" fill="url(#${id})"/>${craters}`;
}

// Icons from pruthvip.tech's sprite (24×24, stroked).
const ICON = {
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7.5 7.5 6 7.5-6"/>',
  download: '<path d="M12 4v11.5M7.5 11 12 15.5 16.5 11M5 19.5h14"/>',
  arrow: '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
  linkedin: '<path fill="currentColor" stroke="none" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45Z"/>',
  earth: '<ellipse cx="12" cy="12" rx="10.2" ry="4.1" transform="rotate(-24 12 12)"/><circle cx="12" cy="12" r="3.6" fill="currentColor" stroke="none"/><circle cx="21.2" cy="8.3" r="1.7" fill="currentColor" stroke="none"/>',
};
const icon = (name, x, y, size, color) =>
  `<g transform="translate(${x} ${y}) scale(${size / 24})" color="${color}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</g>`;

/* Hero: the dotted Earth, spinning --------------------------------------------------------- */

const RAD = Math.PI / 180;

/** Land dots on a latitude grid (one CSS animation per row), from the portfolio's land mask. */
function landRows(step) {
  const src = readFileSync(EARTH_DATA, 'utf8');
  const data = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));
  const bits = Buffer.from(data.land, 'base64');
  const n = data.n;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const fine = new Float64Array(n * 3);
  const land = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) * 2) / n;
    const r = Math.sqrt(1 - y * y);
    fine[i * 3] = r * Math.cos(golden * i);
    fine[i * 3 + 1] = y;
    fine[i * 3 + 2] = r * Math.sin(golden * i);
    land[i] = (bits[i >> 3] >> (i & 7)) & 1;
  }
  const isLand = (v) => {
    // The fine points run from north to south, so only a narrow band of indices can be nearest.
    const centre = Math.round(((1 - v[1]) * n) / 2);
    let best = -2;
    let bestI = 0;
    for (let i = Math.max(0, centre - 260); i < Math.min(n, centre + 260); i++) {
      const d = fine[i * 3] * v[0] + fine[i * 3 + 1] * v[1] + fine[i * 3 + 2] * v[2];
      if (d > best) { best = d; bestI = i; }
    }
    return land[bestI] === 1;
  };
  const rows = [];
  for (let lat = -90 + step / 2; lat < 90; lat += step) {
    const count = Math.max(1, Math.round((360 * Math.cos(lat * RAD)) / step));
    const lons = [];
    for (let k = 0; k < count; k++) {
      const lon = -180 + ((k + 0.5) * 360) / count;
      const v = [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)];
      if (isLand(v)) lons.push(lon);
    }
    if (lons.length) rows.push({ lat, lons });
  }
  return rows;
}

function hero() {
  const W = 1200;
  const H = 520;
  const cx = 925;
  const cy = 255;
  const R = 205;
  const TILT = 18 * RAD; // the north pole leans towards us, as on the site
  const VIEW_LON = 74; // India faces you when the page opens
  const PERIOD = 90; // seconds per turn
  // The globe turns twice (three minutes, longer than most visits), then rests facing India while
  // the Moon, the pin and the stars keep moving. Spinning ~1,800 dots keeps a browser busy, so
  // it shouldn't run forever on a page someone leaves open.
  const TURNS = 2;
  const DOT = 2.5;
  // Sunlight from the upper left, in front: where it lands on the disc lights the shading layer.
  const SUN = (() => { const v = [-0.62, 0.34, 0.71]; const l = Math.hypot(...v); return v.map((x) => x / l); })();

  // Where a point at (lat, θ from the facing meridian) lands on screen, relative to its row's origin.
  const place = (lat, th) => {
    const cl = Math.cos(lat);
    const dx = R * cl * Math.sin(th);
    const dy = R * cl * Math.cos(th) * Math.sin(TILT);
    const z = Math.sin(lat) * Math.sin(TILT) + cl * Math.cos(th) * Math.cos(TILT);
    const yUp = Math.sin(lat) * Math.cos(TILT) - cl * Math.cos(th) * Math.sin(TILT);
    return { dx, dy, z, n: [cl * Math.sin(th), yUp, z] };
  };
  const rowY = (lat) => cy - R * Math.sin(lat) * Math.cos(TILT);
  // θ runs from -π to π over one animation; a point is in front while cos θ > -tan(lat)·tan(tilt).
  const visibleHalfAngle = (lat) => {
    const c = -Math.tan(lat) * Math.tan(TILT);
    return c <= -1 ? Math.PI : c >= 1 ? 0 : Math.acos(c);
  };
  const pct = (th) => r2(((th + Math.PI) / (2 * Math.PI)) * 100);

  /**
   * Keyframes that carry a point once round the globe. Only its position animates (cheap for the
   * browser); on the far side it jumps off the image and waits there. Day, night and the darker
   * edge come from one still shading layer instead, since the Sun doesn't move relative to us.
   * extra(p) adds declarations to the visible frames (the pin uses it to fade at the edge).
   */
  function rowKeyframes(name, lat, extra = null) {
    const half = visibleHalfAngle(lat);
    if (half === 0) return null;
    const away = `{transform:translate(4000px,0)${extra ? ';opacity:0' : ''}}`;
    const frame = (th) => { const p = place(lat, th); return `{transform:translate(${r1(p.dx)}px,${r1(p.dy)}px)${extra ? `;${extra(p)}` : ''}}`; };
    let k = '';
    if (half >= Math.PI) {
      const steps = 24;
      for (let i = 0; i <= steps; i++) { const th = -Math.PI + (i / steps) * 2 * Math.PI; k += `${pct(th)}%${frame(th)}`; }
    } else {
      const from = pct(-half);
      const to = pct(half);
      k += `0%,${r2(Math.max(0, from - 0.01))}%${away}`;
      const steps = Math.max(4, Math.ceil((2 * half) / (15 * RAD)));
      for (let i = 0; i <= steps; i++) { const th = -half + (i / steps) * 2 * half; k += `${pct(th)}%${frame(th)}`; }
      k += `${r2(Math.min(100, to + 0.01))}%,100%${away}`;
    }
    return `@keyframes ${name}{${k}}`;
  }
  const fade = (from) => (p) => `opacity:${r2(Math.min(1, Math.max(0, (p.z - from) * 5)))}`;
  const delayFor = (lon) => {
    const th = ((((lon - VIEW_LON) * RAD + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); // 0..2π from -π
    return r1((th / (2 * Math.PI)) * PERIOD);
  };

  // Each point starts part-way round (a negative delay) and runs TURNS turns from there: its
  // iteration count is TURNS plus that head start, so every point stops where it began.
  const spin = (delay) => `animation-delay:-${delay}s;animation-iteration-count:${+(TURNS + delay / PERIOD).toFixed(5)}`;
  let css = `.g circle{animation:${PERIOD}s linear both}`;
  let dots = '';
  let rowIndex = 0;
  for (const row of landRows(2.6)) {
    const lat = row.lat * RAD;
    const kf = rowKeyframes(`r${rowIndex}`, lat);
    if (!kf) continue;
    css += `${kf}.r${rowIndex} circle{animation-name:r${rowIndex}}`;
    dots += `<g class="r${rowIndex}" transform="translate(${cx} ${r1(rowY(lat))})">`;
    for (const lon of row.lons) dots += `<circle r="${DOT}" style="${spin(delayFor(lon))}"/>`;
    dots += '</g>';
    rowIndex++;
  }

  // Gandhinagar, home: an amber pin that rides with the globe.
  const HOME = { lat: 23.2156 * RAD, lon: 72.6369 };
  css += rowKeyframes('pin', HOME.lat, fade(0.12));
  css += rowKeyframes('pintag', HOME.lat, fade(0.62));
  css += `.pin,.pintag{animation:${PERIOD}s linear both;${spin(delayFor(HOME.lon))}}.pin{animation-name:pin}.pintag{animation-name:pintag}`;
  css += '.pulse{animation:pulse 2.6s ease-out infinite;transform-box:fill-box;transform-origin:center}@keyframes pulse{0%{transform:scale(.4);opacity:.95}100%{transform:scale(2.6);opacity:0}}';
  const tagW = measure('Gandhinagar', T.bold, 13) + 22;
  const pin =
    `<g transform="translate(${cx} ${r1(rowY(HOME.lat))})">` +
    `<g class="pin"><circle r="11" fill="rgba(255,181,71,.22)"/><circle class="pulse" r="7" fill="none" stroke="${C.amber}" stroke-width="1.4"/><circle r="4.6" fill="${C.amber}"/><circle r="1.8" fill="#fff6e6"/></g>` +
    `<g class="pintag"><rect x="14" y="-27" width="${r1(tagW)}" height="24" rx="12" fill="rgba(8,12,26,.88)" stroke="rgba(255,181,71,.6)"/>${text('Gandhinagar', T.bold, 13, 25, -10.5, C.text)}</g>` +
    '</g>';

  // The Moon: two copies on the same path, one behind the globe and one in front.
  const MOON_PERIOD = 46;
  const a = R * 1.28;
  const b = R * 0.34;
  const mTilt = -0.22;
  css += ellipseKeyframes('orbit', a, b, mTilt, 48, (t) => ` scale(${r2(1 + 0.14 * Math.sin(t))})`);
  const half = (front) => {
    let k = '';
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * 2 * Math.PI;
      const isFront = Math.sin(t) > 0;
      k += `${r2((i / 48) * 100)}%{opacity:${isFront === front ? 1 : 0}}`;
    }
    return k;
  };
  css += `@keyframes mfront{${half(true)}}@keyframes mback{${half(false)}}`;
  css += `.moon{animation:orbit ${MOON_PERIOD}s linear infinite;animation-delay:-${MOON_PERIOD * 0.82}s}`;
  css += `.mf{animation:mfront ${MOON_PERIOD}s steps(1,end) infinite;animation-delay:-${MOON_PERIOD * 0.82}s}.mb{animation:mback ${MOON_PERIOD}s steps(1,end) infinite;animation-delay:-${MOON_PERIOD * 0.82}s}`;
  const mr = R * 0.072;
  const moon = (cls) => `<g class="${cls}"><g transform="translate(${cx} ${cy})"><g class="moon">${moonShape('moonfill', r1(mr))}</g></g></g>`;
  const orbitArc = (front) => {
    // The near half of the orbit is the lower arc (sin t > 0).
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const t = (front ? 0 : Math.PI) + (i / 60) * Math.PI;
      const ex = a * Math.cos(t);
      const ey = b * Math.sin(t);
      pts.push(`${r1(cx + ex * Math.cos(mTilt) - ey * Math.sin(mTilt))} ${r1(cy + ex * Math.sin(mTilt) + ey * Math.cos(mTilt))}`);
    }
    return `<path class="orb" d="M${pts.join('L')}" fill="none" stroke="rgba(160,190,255,.2)" stroke-width="1" stroke-dasharray="3 5"/>`;
  };
  css += '.orb{animation:orb 8s linear infinite}@keyframes orb{to{stroke-dashoffset:-64}}';

  // The dots gather into the globe once, as on the site.
  css += `.g{transform-origin:${cx}px ${cy}px;animation:gather 1.8s cubic-bezier(.2,.7,.2,1) both}@keyframes gather{from{opacity:0;transform:scale(1.18)}to{opacity:1;transform:none}}`;
  css += TWINKLE_CSS;

  const defs =
    `<radialGradient id="halo" cx="${cx}" cy="${cy}" r="${R * 1.34}" gradientUnits="userSpaceOnUse"><stop offset=".69" stop-color="rgb(90,169,255)" stop-opacity=".36"/><stop offset=".79" stop-color="rgb(90,169,255)" stop-opacity=".12"/><stop offset="1" stop-color="rgb(90,169,255)" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="ocean" cx="${cx}" cy="${cy}" r="${R}" fx="${cx - R * 0.35}" fy="${cy - R * 0.4}" fr="${R * 0.1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#11305e"/><stop offset=".7" stop-color="#0a1d3d"/><stop offset="1" stop-color="#06132b"/></radialGradient>` +
    `<radialGradient id="sky" cx="${cx}" cy="${cy}" r="${R * 2.4}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="rgb(52,120,255)" stop-opacity=".17"/><stop offset="1" stop-color="rgb(52,120,255)" stop-opacity="0"/></radialGradient>` +
    moonBall('moonfill', mr) +
    // Day to night across the disc, lit from where the Sun is overhead, then a darker edge.
    `<radialGradient id="shade" cx="${r1(cx + R * SUN[0])}" cy="${r1(cy - R * SUN[1])}" r="${R * 2.1}" gradientUnits="userSpaceOnUse"><stop offset=".18" stop-color="#030816" stop-opacity="0"/><stop offset=".52" stop-color="#030816" stop-opacity=".34"/><stop offset=".8" stop-color="#030816" stop-opacity=".7"/><stop offset="1" stop-color="#030816" stop-opacity=".82"/></radialGradient>` +
    `<radialGradient id="limb" cx="${cx}" cy="${cy}" r="${R}" gradientUnits="userSpaceOnUse"><stop offset=".7" stop-color="#030816" stop-opacity="0"/><stop offset="1" stop-color="#030816" stop-opacity=".55"/></radialGradient>`;

  const X = 72;
  const words =
    `<circle cx="${X + 5}" cy="95" r="4.5" fill="${C.amber}"/>` +
    text('GO · DISTRIBUTED SYSTEMS · LOW-LATENCY INFRASTRUCTURE', T.kicker, 14.5, X + 22, 100, C.amber) +
    text('Pruthvi', T.name, 106, X - 4, 206, C.text) +
    text('Panchal', T.name, 106, X - 4, 300, C.text) +
    text('Engineering systems where', T.tag, 37, X - 1, 368, C.text) +
    rich([['every microsecond', T.tag, C.amber], [' matters.', T.tag, C.text]], 37, X - 1, 412) +
    rich([['Software engineer at ', T.body, C.text2], ['Greeksoft Technologies', T.bold, C.text], [', GIFT City, India', T.body, C.text2]], 19.5, X, 462);
  const hint = rich([['पृथ्वी', T.deva, C.amber], [' Pruthvi', T.bold, C.text], [' means Earth.', T.body, C.text2]], 17, cx, 497, 'middle');

  const body =
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    stars(W, H, 150, 7, 16) +
    `<circle cx="${cx}" cy="${cy}" r="${R * 1.34}" fill="url(#halo)"/>` +
    orbitArc(false) + moon('mb') +
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#ocean)"/>` +
    `<g class="g" fill="rgb(176,220,255)">${dots}</g>` +
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#shade)"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#limb)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(150,205,255,.3)"/>` +
    pin + orbitArc(true) + moon('mf') + words + hint;

  return card(W, H, 'Pruthvi Panchal. Engineering systems where every microsecond matters. Go, distributed systems and low-latency infrastructure. Software engineer at Greeksoft Technologies, GIFT City, India. Beside the name, a dotted Earth spins with Gandhinagar lit up and the Moon in orbit.', body, {
    css, defs,
    // Without motion the globe simply holds still, turned to India.
    reduced: '*{animation-play-state:paused!important}.g{animation:none!important}',
  });
}

/* Stats: four numbers that roll up like an odometer -------------------------------------- */

function stats() {
  const W = 1200;
  const H = 170;
  const items = [
    { value: '4', unit: '', label: 'Years in fintech' },
    { value: '17', unit: '', label: 'Microservices in production' },
    { value: '20,000', unit: '+', label: 'People online at once' },
    { value: '250', unit: 'µs', label: 'Average order time' },
  ];
  const size = 54;
  const pitch = size * 1.15;
  const colW = W / items.length;
  const baseY = 86;
  let css = '';
  let body = '';
  const digitW = measure('0', T.num, size);
  let clipN = 0;
  let digitN = 0;
  items.forEach((it, i) => {
    const x0 = i * colW + 44;
    if (i) body += `<path d="M${r1(i * colW)} 30V${H - 30}" stroke="${C.line}"/>`;
    let x = x0;
    for (const ch of it.value) {
      if (!/[0-9]/.test(ch)) { body += text(ch, T.num, size, x, baseY, C.text); x += measure(ch, T.num, size); continue; }
      const d = +ch;
      const id = `c${clipN++}`;
      body += `<clipPath id="${id}"><rect x="${r1(x - 2)}" y="${r1(baseY - size * 0.86)}" width="${r1(digitW + 4)}" height="${r1(pitch)}"/></clipPath>`;
      let strip = '';
      for (let k = 0; k <= 9; k++) strip += text(String(k), T.num, size, x, baseY + k * pitch, C.text);
      const delay = r2(0.15 + digitN++ * 0.07);
      body += `<g clip-path="url(#${id})"><g class="roll" transform="translate(0 ${r1(-d * pitch)})" style="animation-name:d${d};animation-delay:${delay}s">${strip}</g></g>`;
      x += digitW;
    }
    if (it.unit) body += text(it.unit, T.num, size * 0.55, x + 4, baseY, C.amber);
    body += text(it.label, T.body, 19.5, x0, baseY + 44, C.text2);
  });
  for (let d = 0; d <= 9; d++) css += `@keyframes d${d}{from{transform:translateY(0)}to{transform:translateY(${r1(-d * pitch)}px)}}`;
  css += '.roll{animation-duration:1.6s;animation-timing-function:cubic-bezier(.2,.7,.2,1);animation-fill-mode:both}';
  return card(W, H, '4 years in fintech. 17 microservices in production. 20,000+ people online at once. 250 µs average order time.', body, { css });
}

/* Buttons ----------------------------------------------------------------------------------- */

function button(label, iconName, primary) {
  const H = 50;
  const size = 17;
  const tw = measure(label, T.btn, size);
  const W = Math.round(24 + 22 + 10 + tw + 24);
  const fg = primary ? C.amberInk : C.text;
  const bg = primary ? `<rect width="${W}" height="${H}" rx="14" fill="${C.amber}"/>` : `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="13.5" fill="#0b1224" stroke="${C.line2}"/>`;
  const words = text(label, T.btn, size, 56, 31, fg);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>` +
    `<defs>${takeGlyphs()}</defs>` + bg + icon(iconName, 24, 14, 22, fg) + words + '</svg>';
}

/* Pruthvi's Universe ----------------------------------------------------------------------- */

function universeHeader() {
  const W = 1200;
  const H = 200;
  const ecx = 1040;
  const ecy = 100;
  let css = TWINKLE_CSS;
  const orbits = [
    { a: 52, b: 17, c: '#d6dae4', p: 16, r: 4.2 },
    { a: 74, b: 25, c: '#e6f2ff', p: 22, r: 3.2 },
    { a: 96, b: 32, c: '#ff8fd0', p: 28, r: 3.6 },
    { a: 118, b: 40, c: '#ffaa50', p: 36, r: 3.6 },
    { a: 140, b: 47, c: '#8fe9ff', p: 44, r: 3.4 },
  ];
  let body = stars(W, H, 70, 21, 8);
  const tilt = -0.2;
  orbits.forEach((o, i) => {
    body += `<ellipse cx="${ecx}" cy="${ecy}" rx="${o.a}" ry="${o.b}" transform="rotate(${r1(tilt / RAD)} ${ecx} ${ecy})" fill="none" stroke="rgba(160,190,255,.16)" stroke-dasharray="3 5"/>`;
    css += ellipseKeyframes(`o${i}`, o.a, o.b, tilt, 36);
    css += `.o${i}{animation:o${i} ${o.p}s linear infinite;animation-delay:-${r1(o.p * (0.15 + i * 0.17))}s}`;
  });
  body += `<circle cx="${ecx}" cy="${ecy}" r="26" fill="url(#earthball)"/><circle cx="${ecx}" cy="${ecy}" r="26" fill="none" stroke="rgba(150,205,255,.35)"/>`;
  orbits.forEach((o, i) => {
    body += `<g transform="translate(${ecx} ${ecy})"><g class="o${i}"><circle r="${o.r * 2.4}" fill="${o.c}" opacity=".18"/><circle r="${o.r}" fill="${o.c}"/></g></g>`;
  });
  const defs = `<radialGradient id="earthball" cx="${ecx - 9}" cy="${ecy - 10}" r="34" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3f86e8"/><stop offset=".6" stop-color="#1a4b94"/><stop offset="1" stop-color="#0a1d3d"/></radialGradient>`;
  body +=
    `<circle cx="49" cy="55" r="4.5" fill="${C.amber}"/>` + text('SIDE PROJECTS', T.kicker, 14.5, 66, 60, C.amber) +
    text("Pruthvi's Universe", T.head, 54, 42, 122, C.text) +
    text('My name means Earth, so my side projects orbit around it.', T.body, 19.5, 44, 160, C.text2) +
    text('Each one is named after something in space.', T.body, 19.5, 44, 186, C.text2);
  return card(W, H, "Pruthvi's Universe. My name means Earth, so my side projects orbit around it. Each one is named after something in space.", body, { css, defs });
}

// Each world, drawn as on the site's orbit. (x, y) is its centre; s scales it.
const BODIES = {
  moon(x, y, s) {
    const r = 26 * s;
    const defs = moonBall('mball', r) + `<clipPath id="mclip"><circle r="${r}"/></clipPath>` +
      '<radialGradient id="mglow"><stop offset=".35" stop-color="rgb(220,226,240)" stop-opacity=".16"/><stop offset="1" stop-color="rgb(220,226,240)" stop-opacity="0"/></radialGradient>';
    // A shadow slides across: the Moon runs through its phases.
    const css = `.phase{animation:phase 14s linear infinite}@keyframes phase{from{transform:translateX(${r1(-2.1 * r)}px)}to{transform:translateX(${r1(2.1 * r)}px)}}`;
    const svg = `<g transform="translate(${x} ${y})"><circle r="${r * 2.4}" fill="url(#mglow)"/>${moonShape('mball', r)}<g clip-path="url(#mclip)"><circle class="phase" r="${r1(r * 1.02)}" fill="rgba(4,6,13,.82)"/></g></g>`;
    return { svg, defs, css };
  },
  star(x, y, s) {
    const r = 9 * s;
    const defs = `<radialGradient id="sglow"><stop offset="0" stop-color="rgb(200,228,255)" stop-opacity=".75"/><stop offset="1" stop-color="rgb(200,228,255)" stop-opacity="0"/></radialGradient>`;
    const css = '.spk{animation:spk 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes spk{0%,100%{transform:scale(.86) rotate(0deg);opacity:.75}50%{transform:scale(1.12) rotate(8deg);opacity:1}}';
    const L = r * 4.6;
    const svg = `<g transform="translate(${x} ${y})"><circle r="${r * 5}" fill="url(#sglow)"/>` +
      `<path class="spk" d="M${-L} 0H${L}M0 ${-L}V${L}M${-L * 0.45} ${-L * 0.45}L${L * 0.45} ${L * 0.45}M${-L * 0.45} ${L * 0.45}L${L * 0.45} ${-L * 0.45}" stroke="rgba(225,240,255,.8)" stroke-width="1.2" stroke-linecap="round"/>` +
      `<circle r="${r * 0.75}" fill="#fff"/></g>`;
    return { svg, defs, css };
  },
  nebula(x, y, s) {
    const r = 22 * s;
    const blobs = [[-0.45, -0.2, 1.6, '255,120,200'], [0.5, 0.1, 1.4, '140,110,255'], [0, 0.4, 1.25, '90,220,230'], [0.1, -0.4, 1.05, '255,170,120']];
    let defs = '';
    let g = '';
    blobs.forEach(([dx, dy, k, c], i) => {
      defs += `<radialGradient id="nb${i}"><stop offset="0" stop-color="rgb(${c})" stop-opacity=".6"/><stop offset="1" stop-color="rgb(${c})" stop-opacity="0"/></radialGradient>`;
      g += `<circle cx="${r1(dx * r)}" cy="${r1(dy * r)}" r="${r1(k * r * 1.6)}" fill="url(#nb${i})"/>`;
    });
    const specks = [[0.2, -0.1], [-0.35, 0.25], [0.45, 0.35], [-0.1, -0.45], [0.6, -0.3]].map(([dx, dy]) => `<circle cx="${r1(dx * r)}" cy="${r1(dy * r)}" r="1.1" fill="#fff"/>`).join('');
    const css = '.neb{animation:neb 40s linear infinite}@keyframes neb{to{transform:rotate(360deg)}}.sp{animation:tw 4s ease-in-out infinite}';
    return { svg: `<g transform="translate(${x} ${y})"><g class="neb">${g}</g><g class="sp">${specks}</g></g>`, defs, css };
  },
  hole(x, y, s) {
    const r = 13 * s;
    const defs = `<radialGradient id="hglow"><stop offset=".25" stop-color="rgb(255,150,60)" stop-opacity=".5"/><stop offset="1" stop-color="rgb(255,120,40)" stop-opacity="0"/></radialGradient>`;
    const rx = r * 2.4;
    const ry = r * 0.72;
    const arc = (front) => `M${-rx} 0A${rx} ${ry} 0 0 ${front ? 0 : 1} ${rx} 0`;
    const disk = (front, alpha) =>
      `<path d="${arc(front)}" fill="none" stroke="rgba(255,170,80,${alpha})" stroke-width="${r1(r * 0.55)}"/>` +
      `<path class="swirl" d="${arc(front)}" fill="none" stroke="rgba(255,236,190,.9)" stroke-width="${r1(r * 0.22)}" stroke-dasharray="${r1(r * 0.8)} ${r1(r * 2.6)}" stroke-linecap="round"/>`;
    const css = `.swirl{animation:swirl 2.6s linear infinite}@keyframes swirl{to{stroke-dashoffset:${r1(-r * 3.4)}}}`;
    const svg = `<g transform="translate(${x} ${y}) rotate(-14)"><circle r="${r * 3.4}" fill="url(#hglow)"/>${disk(false, 0.7)}` +
      `<circle r="${r}" fill="#000"/><circle r="${r1(r * 1.07)}" fill="none" stroke="rgba(255,225,175,.95)" stroke-width="1.3"/>${disk(true, 0.95)}</g>`;
    return { svg, defs, css };
  },
  quasar(x, y, s) {
    const r = 8 * s;
    const defs = `<linearGradient id="jet" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgb(150,235,255)" stop-opacity=".95"/><stop offset="1" stop-color="rgb(150,235,255)" stop-opacity="0"/></linearGradient>` +
      `<radialGradient id="qcore"><stop offset="0" stop-color="rgb(190,240,255)" stop-opacity=".85"/><stop offset="1" stop-color="rgb(190,240,255)" stop-opacity="0"/></radialGradient>`;
    const css = '.jet{animation:jet 2.4s ease-in-out infinite;transform-origin:0 0}@keyframes jet{0%,100%{opacity:.55;transform:scaleX(.82)}50%{opacity:1;transform:scaleX(1.08)}}';
    const L = r * 5.4;
    const jet = (deg) => `<g transform="rotate(${deg})"><rect class="jet" x="0" y="${-r * 0.2}" width="${L}" height="${r1(r * 0.4)}" rx="${r1(r * 0.2)}" fill="url(#jet)"/></g>`;
    const svg = `<g transform="translate(${x} ${y})"><ellipse rx="${r * 2.8}" ry="${r * 1.3}" transform="rotate(20)" fill="rgba(140,170,255,.12)"/>${jet(-66)}${jet(114)}` +
      `<circle r="${r * 2.6}" fill="url(#qcore)"/><circle r="${r1(r * 0.6)}" fill="#fff"/></g>`;
    return { svg, defs, css };
  },
};

const PROJECTS = [
  {
    id: 'moonsplit', name: 'Moonsplit', body: 'moon', status: 'Private beta',
    named: ['Named after the Moon.', "It has phases. So do your flatmates' excuses. Rent doesn't."],
    about: 'Splits flat rent and bills to the paisa. Every month has to add up to ₹0.',
    chips: ['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL'],
  },
  {
    id: 'sirius', name: 'Sirius', body: 'star', status: 'Open source', live: true,
    named: ['Named after the brightest star in the night sky.', "It isn't the biggest, just well placed."],
    about: 'My interview-prep notebook: notes, flashcards that return before you forget, instant search.',
    chips: ['Go', 'Fiber', 'SQLite', 'React'],
  },
  {
    id: 'codenebula', name: 'CodeNebula', body: 'nebula', status: 'Live', live: true,
    named: ['Named after a nebula, where stars are born.', 'This is where programmers start.'],
    about: 'Learn C++, Go and Python one concept at a time, with 968 C++ concepts you can run.',
    chips: ['C++', 'Go', 'Python', 'Next.js', 'Three.js'],
  },
  {
    id: 'gravitone', name: 'Gravitone', body: 'hole', status: 'Private beta',
    named: ['Named after gravity + tone.', 'Gravity holds planets in one orbit; this holds every phone on one beat.'],
    about: 'Every phone and laptop in a room becomes one speaker, in sync to the millisecond.',
    chips: ['Go', 'WebSocket', 'Web Audio', 'Next.js'],
  },
  {
    id: 'quasar', name: 'Quasar', body: 'quasar', status: 'Private MVP',
    named: ['Named after quasars,', 'the brightest beacons in the universe.'],
    about: 'Scan a QR code and links from your phone land on your laptop, end-to-end encrypted.',
    chips: ['Go', 'WebRTC', 'WebCrypto', 'React'],
  },
];

// Cards sit two to a row in the README (about 410px each on a laptop), so they are drawn
// narrow with large type: 18px here shows as about 14px there.
const CARD_W = 520;
const PAD = 34;
const NAMED = 17.5;
const NAMED_LH = 25;
const ABOUT = 18;
const ABOUT_LH = 27;
const CHIP = 16;
const chipH = (size) => Math.round(size * 2.1);

function chipRow(chips, x, y, size = CHIP, maxW = CARD_W - PAD * 2) {
  const h = chipH(size);
  let out = '';
  let cx = x;
  let cy = y;
  for (const c of chips) {
    const label = typeof c === 'string' ? c : c.label;
    const key = typeof c === 'object' && c.key;
    const w = measure(label, key ? T.bold : T.body, size) + size * 1.8;
    if (cx + w > x + maxW) { cx = x; cy += h + 9; }
    out += `<rect x="${r1(cx + 0.5)}" y="${r1(cy + 0.5)}" width="${r1(w - 1)}" height="${h - 1}" rx="${(h - 1) / 2}" fill="${key ? C.amberSoft : C.ghost}" stroke="${key ? C.amberLine : C.line2}"/>`;
    out += text(label, key ? T.bold : T.body, size, cx + size * 0.9, cy + h * 0.67, key ? C.text : C.text2);
    cx += w + 8;
  }
  return { svg: out, bottom: cy + h };
}

const BOX_TOP = 146;
const namedLines = (p) => wrap(`${p.named[0]} ${p.named[1]}`, T.body, NAMED, CARD_W - PAD * 2 - 32);
const aboutLines = (p) => wrap(p.about, T.body, ABOUT, CARD_W - PAD * 2);
const boxHeight = (p) => 22 + namedLines(p).length * NAMED_LH;

function projectCard(p, H) {
  const art = BODIES[p.body](CARD_W - 74, 66, 1);
  let body = stars(CARD_W, H, 30, p.name.length * 13 + 5, 5) + art.svg;
  body += text(p.name, T.head, 38, PAD - 1, 84, C.text);
  // status chip, under the name like a badge
  const sw = measure(p.status, T.mono, 13.5) + 26;
  body += `<rect x="${PAD + 0.5}" y="101.5" width="${r1(sw - 1)}" height="27" rx="13.5" fill="${p.live ? C.greenSoft : 'none'}" stroke="${p.live ? C.greenLine : C.line2}"/>` +
    text(p.status, T.mono, 13.5, PAD + 13, 119.5, p.live ? C.green : C.text2);
  // "Named after…" box, in amber as on the site
  const boxW = CARD_W - PAD * 2;
  const lines = namedLines(p);
  const boxH = boxHeight(p);
  body += `<rect x="${PAD}" y="${BOX_TOP}" width="${boxW}" height="${boxH}" rx="14" fill="${C.amberSoft}"/>`;
  let first = p.named[0];
  lines.forEach((line, i) => {
    const y = BOX_TOP + 29 + i * NAMED_LH;
    if (first && line.startsWith(first)) {
      body += rich([[first, T.bold, C.amber], [line.slice(first.length), T.body, C.text]], NAMED, PAD + 16, y);
      first = '';
    } else if (first) {
      // the amber part itself wraps onto this line
      body += text(line, T.bold, NAMED, PAD + 16, y, C.amber);
      first = first.slice(line.length).trim();
    } else body += text(line, T.body, NAMED, PAD + 16, y, C.text);
  });
  let y = BOX_TOP + boxH + 36;
  for (const line of aboutLines(p)) { body += text(line, T.body, ABOUT, PAD, y, C.text2); y += ABOUT_LH; }
  body += chipRow(p.chips, PAD, H - PAD - chipH(CHIP)).svg;
  return card(CARD_W, H, `${p.name}: ${p.named.join(' ')} ${p.about} ${p.status}. Built with ${p.chips.join(', ')}.`, body, { css: art.css + TWINKLE_CSS, defs: art.defs });
}

function projectHeight(p) {
  return BOX_TOP + boxHeight(p) + 36 + (aboutLines(p).length - 1) * ABOUT_LH + 26 + chipH(CHIP) + PAD;
}

function exploreCard(H) {
  const ex = CARD_W / 2;
  const ey = 112;
  let css = TWINKLE_CSS;
  let body = stars(CARD_W, H, 40, 99, 6);
  const tilt = -0.2;
  const rings = [
    { a: 70, b: 22, c: '#d6dae4', p: 14, r: 5 },
    { a: 102, b: 32, c: '#e6f2ff', p: 20, r: 3.6 },
    { a: 134, b: 42, c: '#ff8fd0', p: 26, r: 4 },
    { a: 166, b: 52, c: '#ffaa50', p: 33, r: 4 },
    { a: 198, b: 62, c: '#8fe9ff', p: 40, r: 3.8 },
  ];
  rings.forEach((o, i) => {
    body += `<ellipse cx="${ex}" cy="${ey}" rx="${o.a}" ry="${o.b}" transform="rotate(${r1(tilt / RAD)} ${ex} ${ey})" fill="none" stroke="rgba(160,190,255,.16)" stroke-dasharray="3 5"/>`;
    css += ellipseKeyframes(`e${i}`, o.a, o.b, tilt, 36);
    css += `.e${i}{animation:e${i} ${o.p}s linear infinite;animation-delay:-${r1(o.p * (0.3 + i * 0.21))}s}`;
  });
  body += `<circle cx="${ex}" cy="${ey}" r="34" fill="url(#eball)"/><circle cx="${ex}" cy="${ey}" r="34" fill="none" stroke="rgba(150,205,255,.35)"/>`;
  rings.forEach((o, i) => { body += `<g transform="translate(${ex} ${ey})"><g class="e${i}"><circle r="${o.r * 2.4}" fill="${o.c}" opacity=".18"/><circle r="${o.r}" fill="${o.c}"/></g></g>`; });
  const defs = `<radialGradient id="eball" cx="${ex - 12}" cy="${ey - 13}" r="44" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3f86e8"/><stop offset=".6" stop-color="#1a4b94"/><stop offset="1" stop-color="#0a1d3d"/></radialGradient>`;
  body += text('See them orbit the Earth', T.head, 32, ex, H - 122, C.text, 'middle');
  body += text('Spin the globe, pick a world, race 250 µs.', T.body, ABOUT, ex, H - 90, C.text2, 'middle');
  const label = 'pruthvip.tech';
  const bw = measure(label, T.btn, 16) + 24 + 22 + 10 + 22;
  const bx = ex - bw / 2;
  const by = H - PAD - 44;
  body += `<rect x="${r1(bx)}" y="${by}" width="${r1(bw)}" height="44" rx="13" fill="${C.amber}"/>` + icon('arrow', r1(bx + 20), by + 12, 20, C.amberInk) + text(label, T.btn, 16, bx + 50, by + 28, C.amberInk);
  return card(CARD_W, H, 'See every project orbit the Earth on pruthvip.tech: spin the globe, pick a world, race the 250 µs order system.', body, { css, defs });
}

/* Toolbox ------------------------------------------------------------------------------------ */

function toolbox() {
  const W = 1200;
  const groups = [
    ['Languages', [{ label: 'Go (Golang)', key: true }, { label: 'C++', key: true }, 'JavaScript', 'PHP', 'SQL']],
    ['Backend & messaging', [{ label: 'NATS JetStream', key: true }, 'gRPC', 'REST', 'WebSocket', 'FIX', 'TCP/UDP', 'Gin', 'Fasthttp']],
    ['Data', ['PostgreSQL', 'Redis', 'RediSearch', 'MySQL']],
    ['Cloud & DevOps', [{ label: 'Kubernetes', key: true }, 'Docker', 'CI/CD', 'GitLab', 'Vault', 'Consul', 'KrakenD']],
    ['Speed & monitoring', ['io_uring', 'CPU pinning', 'perf', 'pprof', 'Prometheus', 'OpenTelemetry', 'Grafana']],
    ['AI', ['Claude API', 'OpenAI API', 'Claude Code', 'Cursor', 'AI agents']],
  ];
  const top = 150;
  const gap = 16;
  const colW = (W - 44 * 2 - gap * 2) / 3;
  // measure each panel's height first so a row lines up
  const panels = groups.map(([title, chips]) => {
    const inner = chipRow(chips, 0, 0, 16.5, colW - 44);
    return { title, chips, h: 66 + inner.bottom + 24 };
  });
  const rowH = [Math.max(...panels.slice(0, 3).map((p) => p.h)), Math.max(...panels.slice(3).map((p) => p.h))];
  const H = top + rowH[0] + gap + rowH[1] + 40;
  let body = stars(W, H, 60, 3, 6);
  body += `<circle cx="49" cy="55" r="4.5" fill="${C.amber}"/>` + text('SKILLS', T.kicker, 14.5, 66, 60, C.amber) + text('My toolbox', T.head, 54, 42, 122, C.text);
  panels.forEach((p, i) => {
    const col = i % 3;
    const row = (i / 3) | 0;
    const x = 44 + col * (colW + gap);
    const y = top + (row ? rowH[0] + gap : 0);
    body += `<rect x="${r1(x + 0.5)}" y="${y + 0.5}" width="${r1(colW - 1)}" height="${rowH[row] - 1}" rx="16" fill="rgba(24,36,70,.4)" stroke="${C.line}"/>`;
    body += text(p.title, T.head, 22, x + 22, y + 42, C.text);
    body += chipRow(p.chips, x + 22, y + 66, 16.5, colW - 44).svg;
  });
  return card(W, H, `My toolbox. ${groups.map(([t, cs]) => `${t}: ${cs.map((c) => (typeof c === 'string' ? c : c.label)).join(', ')}`).join('. ')}.`, body, { css: TWINKLE_CSS });
}

/* Write ---------------------------------------------------------------------------------------- */

mkdirSync(OUT, { recursive: true });
const files = {
  'hero.svg': hero(),
  'stats.svg': stats(),
  'btn-portfolio.svg': button('pruthvip.tech', 'earth', true),
  'btn-linkedin.svg': button('LinkedIn', 'linkedin', false),
  'btn-email.svg': button('Email', 'mail', false),
  'btn-resume.svg': button('Résumé', 'download', false),
  'universe.svg': universeHeader(),
  'toolbox.svg': toolbox(),
};
const H = Math.max(...PROJECTS.map(projectHeight));
for (const p of PROJECTS) files[`${p.id}.svg`] = projectCard(p, H);
files['explore.svg'] = exploreCard(H);

for (const [name, svg] of Object.entries(files)) {
  writeFileSync(path.join(OUT, name), svg);
  console.log(`${name.padEnd(20)} ${(svg.length / 1024).toFixed(1).padStart(6)} KB`);
}
