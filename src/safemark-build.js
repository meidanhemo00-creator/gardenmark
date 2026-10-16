// SafeMark installation, built step by step in an isometric 3D view.
// Every step follows GardenMark's shock-pad installation guide and SafeMark spec sheet.
// Conceptual illustration: not to scale, colors illustrative.

const S = 44;
const W = 12, D = 8, T = 0.5;          // frame outer size and rail thickness (units)
const CX = 396, CY = 112;
const iso = (x, y, z) => [CX + (x - z) * 0.866 * S, CY + (x + z) * 0.5 * S - y * S];
const pts = (...p) => p.map((q) => iso(...q).map((n) => n.toFixed(1)).join(',')).join(' ');
const f = (n) => n.toFixed(1);

function box(x0, x1, z0, z1, y0, y1, top, left, right, stroke = 'rgba(255,255,255,.12)') {
  return `<polygon points="${pts([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0])}" fill="${right}"/>`
    + `<polygon points="${pts([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1])}" fill="${left}"/>`
    + `<polygon points="${pts([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1])}" fill="${top}" stroke="${stroke}" stroke-width=".8"/>`;
}

function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

// Fill a rectangle with sheets of a given size and gap, cutting the last row/column to fit.
function tile(x0, x1, z0, z1, sw, sd, gap) {
  const out = [];
  for (let x = x0; x < x1 - 0.05; x += sw + gap) {
    for (let z = z0; z < z1 - 0.05; z += sd + gap) {
      out.push([x, Math.min(x + sw, x1), z, Math.min(z + sd, z1)]);
    }
  }
  return out;
}

export const STEPS = [
  { key: 'base', title: 'Base and frame', text: 'A compacted base, prepared like a paver base, at a depth that lets the finished surface sit flush. A heavy-duty pressure-treated wood frame goes around the edge where there isn’t one.' },
  { key: 'pad1', title: 'First pad layer', text: 'ShockPad sheets, 40 × 60 in and 0.75 in or 1 in thick, laid inside the frame.' },
  { key: 'drain', title: 'Drainage joints', text: 'The sheets aren’t seamed together. Water drains down through the joints between them.' },
  { key: 'pad2', title: 'Second layer, if specified', text: 'Laid perpendicular to the first layer. The two layers aren’t glued to each other.' },
  { key: 'glue', title: 'Glued, never nailed', text: 'Pad edges are glued to the frame with BondMark. Nails are never used in a shock-pad installation.' },
  { key: 'turf', title: 'Montana on top', text: 'The turf is pulled taut, spot-glued to the pad about every 6 in, and glued to the frame along the edges.' },
  { key: 'sand', title: 'Sand infill', text: '3 lb of 20/40 silica sand per sq ft. Infill is required whenever turf goes over a shock pad.' },
];

export function buildInstall(svg) {
  const r = rng(7);
  const yPad1 = 0.35, yPad2 = 0.7, yTurf = 0.86;
  let g = '';
  const group = (step, body, cls = 'b-drop', delay = 0) => `<g class="${cls}" data-step="${step}" style="--d:${delay}ms">${body}</g>`;

  // Defs: textures.
  g += `<defs>
    <pattern id="ib-gravel" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#5c5a48"/><circle cx="2" cy="3" r="1.4" fill="#6c6a56"/><circle cx="7" cy="6.5" r="1.7" fill="#4c4a3c"/><circle cx="4" cy="8.6" r=".9" fill="#7a7862"/></pattern>
    <pattern id="ib-gravel-top" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#77745f"/><circle cx="2" cy="3" r="1.3" fill="#86836c"/><circle cx="7" cy="6" r="1.6" fill="#666450"/></pattern>
    <pattern id="ib-foam" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#3a412d"/><circle cx="2.5" cy="2.5" r="1.3" fill="none" stroke="#4d563b" stroke-width=".7"/><circle cx="6" cy="6.3" r="1" fill="none" stroke="#4d563b" stroke-width=".7"/></pattern>
    <pattern id="ib-foam2" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#4a5236"/><circle cx="2.5" cy="2.5" r="1.3" fill="none" stroke="#5f6a47" stroke-width=".7"/><circle cx="6" cy="6.3" r="1" fill="none" stroke="#5f6a47" stroke-width=".7"/></pattern>
    <pattern id="ib-wood" width="36" height="5" patternUnits="userSpaceOnUse"><rect width="36" height="5" fill="#8a744a"/><path d="M0 2.5h36" stroke="#76623d" stroke-width=".7"/></pattern>
    <pattern id="ib-sand" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="2" r=".9" fill="#d7c99a"/><circle cx="5" cy="5" r=".8" fill="#bfae7c"/></pattern>
  </defs>`;

  // 1. Base and frame (back rails).
  g += group(0, box(0, W, 0, D, -1.1, 0, 'url(#ib-gravel-top)', 'url(#ib-gravel)', 'url(#ib-gravel)'));
  const rail = (x0, x1, z0, z1) => box(x0, x1, z0, z1, 0, 1.0, '#a28c5a', 'url(#ib-wood)', '#66573a');
  g += group(0, rail(0, W, 0, T) + rail(0, T, 0, D), 'b-drop', 120);

  // 2. First pad layer: 40 × 60 sheets (2.1 × 3.4 units), unseamed.
  // Sheets butt tight against each other: unseamed, but with no open gap.
  const J = 0.03, SW1 = (W - 2 * T - 0.1 - 4 * J) / 5, SD1 = (D - 2 * T - 0.1 - J) / 2;
  const sheets1 = tile(T + 0.05, W - T - 0.05, T + 0.05, D - T - 0.05, SW1, SD1, J);
  sheets1.sort((a, b) => (a[0] + a[2]) - (b[0] + b[2]));
  sheets1.forEach((s, i) => { g += group(1, box(s[0], s[1], s[2], s[3], 0, yPad1, 'url(#ib-foam)', '#262b1d', '#1f2318'), 'b-drop', i * 70); });

  // 3. Drainage: droplets falling into the gaps between sheets.
  let drops = '';
  const gapXs = [];
  for (let i = 1; i < 5; i++) gapXs.push(T + 0.05 + i * SW1 + (i - 0.5) * J);
  for (let i = 0; i < 34; i++) {
    const x = gapXs[Math.floor(r() * gapXs.length)], z = T + 0.4 + r() * (D - 2 * T - 0.8);
    const [px, py] = iso(x, yPad1, z);
    drops += `<g class="drop" style="--t:${(r() * 1.6).toFixed(2)}s"><path d="M${f(px)} ${f(py - 11)}q4.6 6.6 0 10q-4.6 -3.4 0 -10z" fill="#e8f0d8"/></g>`;
  }
  g += `<g class="b-fade drops" data-step="2" data-only="2">${drops}</g>`;
  // 4. Second layer, perpendicular (3.4 × 2.1 units).
  // Cut away on the left so the first layer's direction stays visible.
  const sheets2 = tile(4.45, W - T - 0.05, T + 0.05, D - T - 0.05, SD1, SW1, J);
  sheets2.sort((a, b) => (a[0] + a[2]) - (b[0] + b[2]));
  sheets2.forEach((s, i) => { g += group(3, box(s[0], s[1], s[2], s[3], yPad1, yPad2, 'url(#ib-foam2)', '#2f3524', '#272c1e'), 'b-drop', i * 60); });

  // Front rails, drawn over the pad.
  g += group(0, rail(W - T, W, 0, D) + rail(0, W, D - T, D), 'b-drop', 240);

  // 5. Glue bead along the frame, and a "no nails" mark.
  const ring = [[T, yPad2, T], [W - T, yPad2, T], [W - T, yPad2, D - T], [T, yPad2, D - T]].map((q) => iso(...q));
  const ringPath = `M${ring.map((p) => p.map(f).join(' ')).join('L')}Z`;
  g += `<g class="b-fade glue" data-step="4"><path d="${ringPath}" fill="none" stroke="#c5e04b" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 7" pathLength="1000"/></g>`;
  const [nx, ny] = iso(W + 0.2, 1.4, D * 0.55);
  g += `<g class="b-fade nonail" data-step="4" data-only="4" transform="translate(${f(nx + 26)} ${f(ny - 10)})">
    <circle r="30" fill="#12140c" stroke="#afa857" stroke-width="1.5"/>
    <path d="M-2.6 -17h5.2v21l-2.6 8l-2.6 -8z M-8 -20h16v4h-16z" fill="#d9d6c2"/>
    <path d="M-21 21L21 -21" stroke="#c5e04b" stroke-width="4" stroke-linecap="round"/>
    <text y="48" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="500" letter-spacing="1.5" fill="#c5e04b">NO NAILS</text>
  </g>`;
  // Spot-glue dots on the pad top.
  let dots = '';
  for (let x = T + 0.6; x < W - T - 0.3; x += 0.75) for (let z = T + 0.6; z < D - T - 0.3; z += 0.75) {
    const [px, py] = iso(x, yPad2 + 0.01, z);
    dots += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="2.4" ry="1.4"/>`;
  }
  g += `<g class="b-fade" data-step="5" data-only="5" fill="#c5e04b" opacity=".85">${dots}</g>`;

  // 6. Turf: backing plus blades.
  let turf = box(0, W, 0, D, yPad2, yTurf, '#2a3a1b', '#22301a', '#1b2614');
  const greens = ['#3c5a20', '#678c2c', '#9dba50'];
  const blades = [];
  for (let i = 0; i < 3200; i++) blades.push([r() * W, r() * D]);
  blades.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  for (const [x, z] of blades) {
    const [px, py] = iso(x, yTurf, z);
    const len = 15 + r() * 11, lean = (r() - 0.5) * 8;
    turf += `<path d="M${f(px)} ${f(py)}q${f(lean * 0.3)} ${f(-len * 0.6)} ${f(lean)} ${f(-len)}" stroke="${greens[Math.floor(r() * 3)]}" stroke-width="${(1.1 + r() * 1.2).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    if (r() < 0.12) turf += `<path d="M${f(px - 3)} ${f(py - 2)}q2 -3 4 0t4 0" stroke="#a99057" stroke-width=".9" fill="none"/>`;
  }
  g += group(5, turf, 'b-drop turf');

  // 7. Sand: falling grains, then a fine sand layer settling into the pile.
  let grains = '';
  for (let i = 0; i < 90; i++) {
    const [px, py] = iso(1 + r() * (W - 2), yTurf + 0.4, 1 + r() * (D - 2));
    grains += `<circle class="grain" cx="${f(px)}" cy="${f(py)}" r="${(1 + r() * 1.3).toFixed(1)}" style="--t:${(r() * 1.4).toFixed(2)}s"/>`;
  }
  g += `<g class="b-fade sandfall" data-step="6" data-only="6" fill="#d7c99a">${grains}</g>`;
  g += `<g class="b-fade" data-step="6"><polygon points="${pts([0, yTurf + 0.12, 0], [W, yTurf + 0.12, 0], [W, yTurf + 0.12, D], [0, yTurf + 0.12, D])}" fill="url(#ib-sand)" opacity=".7"/></g>`;

  svg.innerHTML += g;
  return [...svg.querySelectorAll('[data-step]')];
}
