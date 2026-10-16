// SafeMark exploded diagram. Conceptual, not to scale.
// Layer order and materials follow GardenMark's SafeMark spec sheet (2025)
// and its shock-pad installation guide.

const S = 30;          // px per unit
const W = 9, D = 9;    // footprint in units
const CX = 380, CY = 330;
const iso = (x, y, z) => [CX + (x - z) * 0.866 * S, CY + (x + z) * 0.5 * S - y * S];
const pts = (...p) => p.map((q) => iso(...q).map((n) => n.toFixed(1)).join(',')).join(' ');

function box(x0, x1, z0, z1, y0, y1, top, left, right, extra = '') {
  return `<polygon points="${pts([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0])}" fill="${right}"/>
    <polygon points="${pts([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1])}" fill="${left}"/>
    <polygon points="${pts([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1])}" fill="${top}" stroke="rgba(255,255,255,.16)" stroke-width=".8"/>${extra}`;
}

function rng(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

// Layer thicknesses in units (illustrative).
export const LAYERS = [
  { key: 'turf', h: 0.35 },
  { key: 'sand', h: 0.3 },
  { key: 'pad', h: 0.6 },
  { key: 'frame', h: 0.75 },
  { key: 'base', h: 1.4 },
];

export function buildSafeMark(svg) {
  const r = rng(42);
  const defs = `<defs>
    <pattern id="p-sand" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#c8b98c"/><circle cx="1.5" cy="2" r=".9" fill="#ded3ad"/><circle cx="4.5" cy="4.5" r=".8" fill="#a8996a"/></pattern>
    <pattern id="p-foam" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#33392a"/><circle cx="3" cy="3" r="1.6" fill="none" stroke="#4b5338" stroke-width=".8"/><circle cx="7" cy="7.5" r="1.2" fill="none" stroke="#4b5338" stroke-width=".8"/></pattern>
    <pattern id="p-foam-side" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#23281c"/><circle cx="3" cy="3" r="1.6" fill="none" stroke="#333a27" stroke-width=".8"/><circle cx="7" cy="7.5" r="1.2" fill="none" stroke="#333a27" stroke-width=".8"/></pattern>
    <pattern id="p-wood" width="40" height="5" patternUnits="userSpaceOnUse"><rect width="40" height="5" fill="#8f7a4c"/><path d="M0 2.5h40" stroke="#7b6840" stroke-width=".8"/></pattern>
    <pattern id="p-gravel" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#66644f"/><circle cx="2" cy="3" r="1.5" fill="#75735d"/><circle cx="7" cy="6" r="1.8" fill="#57553f"/><circle cx="4" cy="8.5" r="1" fill="#827f68"/></pattern>
    <pattern id="p-gravel-side" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#47463a"/><circle cx="2" cy="3" r="1.5" fill="#525143"/><circle cx="7" cy="6" r="1.8" fill="#3c3b30"/></pattern>
    <linearGradient id="g-turf-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5c7f2a"/><stop offset="1" stop-color="#1e2215"/></linearGradient>
  </defs>`;

  // Base: compacted, prepared like a paver base.
  const base = box(0, W, 0, D, 0, LAYERS[4].h, '#7a7761', 'url(#p-gravel-side)', 'url(#p-gravel-side)',
    `<polygon points="${pts([0, LAYERS[4].h, 0], [W, LAYERS[4].h, 0], [W, LAYERS[4].h, D], [0, LAYERS[4].h, D])}" fill="url(#p-gravel)" opacity=".55"/>`);

  // Frame: four rails around the perimeter. Back rails first so front rails overlap.
  const t = 0.45, fh = LAYERS[3].h;
  const rail = (x0, x1, z0, z1) => box(x0, x1, z0, z1, 0, fh, '#a68e5a', 'url(#p-wood)', '#6f5f3a');
  const frameBack = rail(0, W, 0, t) + rail(0, t, 0, D);
  const frameFront = rail(W - t, W, 0, D) + rail(0, W, D - t, D);

  // ShockPad: unseamed sheets with drainage gaps between them.
  const ph = LAYERS[2].h, gap = 0.04;
  let pad = '';
  const cols = [[t, 4.5 - gap / 2], [4.5 + gap / 2, W - t]];
  for (const [x0, x1] of cols) for (const [z0, z1] of cols) {
    pad += box(x0, x1, z0, z1, 0, ph, 'url(#p-foam)', 'url(#p-foam-side)', 'url(#p-foam-side)');
  }

  // Sand infill.
  const sand = box(0, W, 0, D, 0, LAYERS[1].h, 'url(#p-sand)', '#a3956a', '#8c7f57');

  // Turf: backing slab plus blades and thatch over the top face.
  const th = LAYERS[0].h;
  let turf = box(0, W, 0, D, 0, th, '#2b3a1c', 'url(#g-turf-side)', 'url(#g-turf-side)');
  const greens = ['#3c5a20', '#678c2c', '#9dba50'];
  const strokes = [];
  for (let i = 0; i < 1500; i++) {
    const x = r() * W, z = r() * D;
    strokes.push([x, z]);
  }
  strokes.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  let blades = '', curls = '';
  for (const [x, z] of strokes) {
    const [sx, sy] = iso(x, th, z);
    const len = 30 + r() * 22;
    const lean = (r() - 0.5) * 14;
    const c = greens[Math.floor(r() * 3)];
    blades += `<path d="M${sx.toFixed(1)} ${sy.toFixed(1)}q${(lean * 0.3).toFixed(1)} ${(-len * 0.6).toFixed(1)} ${lean.toFixed(1)} ${(-len).toFixed(1)}" stroke="${c}" stroke-width="${(1.2 + r() * 1.4).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    if (r() < 0.22) {
      const cs = 3 + r() * 4;
      curls += `<path d="M${sx.toFixed(1)} ${(sy - 3).toFixed(1)}c${cs} -${cs} ${cs * 2} ${cs} ${cs * 0.6} ${cs * 1.4}s-${cs} -${cs * 1.8} ${cs * 1.6} -${cs * 0.4}" stroke="#a99057" stroke-width="1" fill="none" opacity=".9"/>`;
    }
  }
  turf += `<g>${curls}${blades}</g>`;

  // Layer numbers on the right edge, matching the notes list.
  const label = (n, y) => {
    const [x, yy] = iso(W, y, 0);
    return `<g class="sm-num"><line x1="${x + 10}" y1="${yy}" x2="${x + 46}" y2="${yy}" stroke="rgba(197,224,75,.45)"/><text x="${x + 52}" y="${yy + 4}" fill="#c5e04b" font-family="JetBrains Mono, monospace" font-weight="500" font-size="12" letter-spacing="1.5">${n}</text></g>`;
  };

  const groups = [
    ['base', base + label('05', LAYERS[4].h * 0.5)],
    ['frame', frameBack],
    ['pad', pad + label('03', ph * 0.5)],
    ['frame', frameFront + label('04', fh * 0.5)],
    ['sand', sand + label('02', LAYERS[1].h * 0.5)],
    ['turf', turf + label('01', th * 0.5 + 0.6)],
  ];
  svg.insertAdjacentHTML('beforeend', defs + groups.map(([k, g]) => `<g class="layer" data-key="${k}">${g}</g>`).join(''));
  return [...svg.querySelectorAll('.layer')];
}

// Stack positions (in units) for a given explode amount 0..1.
export function layerOffsets(explode) {
  const out = [];
  let y = 0;
  const gap = 1.45 * explode;
  for (let i = LAYERS.length - 1; i >= 0; i--) {
    // frame shares the pad's level when assembled (pad sits inside it).
    out[i] = y;
    if (LAYERS[i].key === 'frame') y += gap + 0.05; else y += LAYERS[i].h + gap;
  }
  return out.map((u) => u * S);
}
