// Rendered turf samples: a rectangular swatch drawn in true perspective.
// Inputs are documented attributes only: pile height (in inches), three blade greens,
// thatch color where the product has one. Everything else is presentation.
// The geometry is generated once per sample and re-projected for any camera angle,
// so samples can be orbited interactively.

export const MODELS = {
  montana: { pile: 1.75, greens: ['#3c5a20', '#678c2c', '#9dba50'], thatch: '#a99057', bw: [0.07, 0.13], density: 92 },
  kentucky: { pile: 1.75, greens: ['#2f5520', '#52842a', '#87b343'], thatch: '#6f8c35', bw: [0.07, 0.13], density: 92 },
  augusta: { pile: 0.7, greens: ['#43742a', '#528532', '#62953a'], thatch: null, bw: [0.035, 0.06], density: 260, ball: true },
  canine: { pile: 1, greens: ['#385f26', '#4f8330', '#6c9c40'], thatch: null, bw: [0.06, 0.1], density: 140 },
};

const BT = 0.25; // backing thickness, inches
const CAM_DIST = 24.7;

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (c, t, k) => c.map((v, i) => Math.round(v + (t[i] - v) * k));
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const LIGHT = hex('#f3e6b8');
const SHADE = hex('#0d1108');

// ---------- Geometry (world space, generated once) ----------
const geoCache = new Map();
function geometry(key, SW, SD, seed) {
  const id = `${key}|${SW}|${SD}|${seed}`;
  if (geoCache.has(id)) return geoCache.get(id);
  const m = MODELS[key];
  const r = rng(key.length * 9973 + seed);
  const L = -SW / 2, F = -SD / 2;
  const greens = m.greens.map(hex);
  const blades = [];
  const count = Math.round(SW * SD * m.density);
  for (let i = 0; i < count; i++) {
    const x = L + r() * SW, z = F + r() * SD;
    const h = m.pile * (0.78 + r() * 0.24);
    blades.push({
      x, z, h,
      lx: (r() - 0.5) * m.pile * 0.38, lz: (r() - 0.5) * m.pile * 0.34,
      bw: m.bw[0] + r() * (m.bw[1] - m.bw[0]),
      c: greens[Math.floor(r() * 3)], curl: r() - 0.5, lod: r(),
    });
  }
  const thatch = [];
  if (m.thatch) {
    const tc = hex(m.thatch);
    for (let i = 0; i < SW * SD * 58; i++) {
      // Bias part of the thatch toward the four cut edges so it reads from any angle.
      let x = L + 0.15 + r() * (SW - 0.3), z = F + 0.12 + r() * (SD - 0.24);
      if (r() < 0.12) {
        const e = Math.floor(r() * 4), d = 0.45 + r() * 0.6;
        if (e === 0) z = F + d; else if (e === 1) z = F + SD - d; else if (e === 2) x = L + d; else x = L + SW - d;
      }
      thatch.push({
        x, z, y: r() * m.pile * 0.36,
        c: mix(tc, r() < 0.5 ? LIGHT : SHADE, r() * 0.35), a: r() * Math.PI * 2, n: 4 + Math.floor(r() * 7), lod: r(),
      });
    }
  }
  const g = { blades, thatch };
  geoCache.set(id, g);
  return g;
}

// ---------- Camera ----------
function camera(yawDeg, pitchDeg) {
  const yaw = yawDeg * Math.PI / 180, pitch = pitchDeg * Math.PI / 180;
  const camH = CAM_DIST * Math.sin(pitch), camD = CAM_DIST * Math.cos(pitch);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return (x, y, z) => {
    const xr = x * cy - z * sy, zr = x * sy + z * cy;
    const dy = y - camH, dz = zr + camD;
    const vy = dy * cp + dz * sp, vz = -dy * sp + dz * cp;
    return [xr / vz, -vy / vz, vz];
  };
}

function corners(m, SW, SD) {
  const pts = [];
  for (const x of [-SW / 2, SW / 2]) for (const z of [-SD / 2, SD / 2]) for (const y of [-BT, m.pile * 1.05]) pts.push([x, y, z]);
  if (m.ball) pts.push([2.4, 2.2, 0.6]);
  return pts;
}

// A scale and origin that keep the sample fully in frame for every angle in a range,
// so it doesn't zoom in and out while being rotated.
const fitCache = new Map();
function stableFit(key, m, SW, SD, w, h, padX, padY, pitchRange) {
  const id = `${key}|${SW}|${SD}|${w}|${h}|${padX}|${padY}|${pitchRange}`;
  if (fitCache.has(id)) return fitCache.get(id);
  let halfW = 0, up = 0, down = 0;
  const pts = corners(m, SW, SD);
  for (let p = pitchRange[0]; p <= pitchRange[1] + 0.01; p += (pitchRange[1] - pitchRange[0]) / 4) {
    for (let yaw = 0; yaw < 360; yaw += 15) {
      const proj = camera(yaw, p);
      for (const q of pts) {
        const [x, y] = proj(...q);
        halfW = Math.max(halfW, Math.abs(x));
        up = Math.max(up, -y);
        down = Math.max(down, y);
      }
    }
  }
  const S = Math.min((w / 2 - w * padX) / halfW, (h - 2 * h * padY) / (up + down));
  const fit = { S, ox: w / 2, oy: h * padY + up * S + ((h - 2 * h * padY) - (up + down) * S) / 2 };
  fitCache.set(id, fit);
  return fit;
}

function tightFit(m, SW, SD, proj, w, h, padX, padY, shiftY) {
  const pts = corners(m, SW, SD).map((q) => proj(...q));
  const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]));
  const px = w * padX, py = h * padY;
  const S = Math.min((w - 2 * px) / (maxX - minX), (h - 2 * py) / (maxY - minY));
  return { S, ox: (w - (maxX - minX) * S) / 2 - minX * S, oy: (h - (maxY - minY) * S) / 2 - minY * S + shiftY * h };
}

export function renderSample(canvas, key, opts = {}) {
  const m = MODELS[key];
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!m || !w || !h) return null;
  const low = opts.quality === 'low';
  const dpr = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2);
  const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
  if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const SW = opts.width || 12, SD = opts.depth || 9;
  const yawDeg = opts.yaw ?? -16;
  const pitchDeg = opts.pitch ?? Math.atan2(opts.camH ?? 13, opts.camD ?? 21) * 180 / Math.PI;
  const proj = camera(yawDeg, pitchDeg);
  const padX = opts.padX ?? 0.08, padY = opts.padY ?? 0.12;
  const fit = opts.pitchRange
    ? stableFit(key, m, SW, SD, w, h, padX, padY, opts.pitchRange)
    : tightFit(m, SW, SD, proj, w, h, padX, padY, opts.shiftY || 0);
  const { S, ox, oy } = fit;
  const P = (x, y, z) => { const p = proj(x, y, z); return [ox + p[0] * S, oy + p[1] * S, p[2]]; };
  const ppi = (z3) => S / z3;
  const L = -SW / 2, Rx = SW / 2, F = -SD / 2, B = SD / 2;

  // Contact shadow.
  ctx.save();
  ctx.filter = `blur(${Math.round(h * 0.035)}px)`;
  ctx.fillStyle = 'rgba(0, 0, 0, .55)';
  ctx.beginPath();
  [[L, F], [Rx, F], [Rx, B], [L, B]].forEach(([x, z], i) => {
    const p = P(x * 1.02, -BT - 0.15, z * 1.02);
    if (i) ctx.lineTo(p[0], p[1] + h * 0.02); else ctx.moveTo(p[0], p[1] + h * 0.02);
  });
  ctx.fill();
  ctx.restore();

  // Backing: top plus whichever side edges face the camera.
  const quad = (list) => list.map((q) => P(...q));
  const area = (pts) => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0);
  const fillPts = (pts, fill, stroke) => {
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  };
  fillPts(quad([[L, 0, F], [Rx, 0, F], [Rx, 0, B], [L, 0, B]]), '#20251a');
  const sides = [
    [[L, -BT, F], [Rx, -BT, F], [Rx, 0, F], [L, 0, F]],
    [[Rx, -BT, F], [Rx, -BT, B], [Rx, 0, B], [Rx, 0, F]],
    [[Rx, -BT, B], [L, -BT, B], [L, 0, B], [Rx, 0, B]],
    [[L, -BT, B], [L, -BT, F], [L, 0, F], [L, 0, B]],
  ];
  sides.forEach((s, i) => {
    const pts = quad(s);
    if (area(pts) < 0) fillPts(pts, i % 2 ? '#14170e' : '#191d13', 'rgba(255,255,255,.07)');
  });

  // Project and depth-sort blades, thatch and the optional golf ball.
  const geo = geometry(key, SW, SD, opts.seed || 7);
  const keep = low ? 0.42 : 1;
  const items = [];
  for (const b of geo.blades) {
    if (b.lod > keep) continue;
    const base = P(b.x, 0, b.z);
    items.push({ t: 0, z: base[2], base, tip: P(b.x + b.lx, b.h, b.z + b.lz), b });
  }
  for (const t of geo.thatch) {
    if (t.lod > (low ? 0.35 : 1)) continue;
    const p = P(t.x, t.y, t.z);
    items.push({ t: 1, z: p[2], p, d: t });
  }
  if (m.ball) {
    const rad = 1.68 / 2;
    const c = P(2.4, m.pile * 0.5 + rad, 0.6);
    items.push({ t: 2, z: c[2] - 0.01, c, rad, sh: P(2.55, m.pile * 0.9, 0.95) });
  }
  items.sort((a, b) => b.z - a.z);

  const zs = [P(L, 0, F)[2], P(Rx, 0, F)[2], P(Rx, 0, B)[2], P(L, 0, B)[2]];
  const zNear = Math.min(...zs), zFar = Math.max(...zs);
  const widthK = low ? 1.35 : 1; // fewer blades in the preview, slightly wider so it reads as full

  const drawItem = (o, it) => {
    const depthK = Math.min(1, Math.max(0, (it.z - zNear) / (zFar - zNear)));
    if (it.t === 0) {
      const { b } = it;
      const [bx, by] = it.base, [tx, ty] = it.tip;
      const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const ws = Math.max(0.6, b.bw * ppi(it.z) * widthK);
      const cx = bx + dx * 0.55 + nx * b.curl * ws * 3, cy = by + dy * 0.55 + ny * b.curl * ws * 3;
      const fog = depthK * 0.35;
      o.fillStyle = rgb(mix(mix(b.c, SHADE, 0.45), SHADE, fog));
      o.beginPath();
      o.moveTo(bx - nx * ws / 2, by - ny * ws / 2);
      o.quadraticCurveTo(cx - nx * ws * 0.3, cy - ny * ws * 0.3, tx, ty);
      o.quadraticCurveTo(cx + nx * ws * 0.3, cy + ny * ws * 0.3, bx + nx * ws / 2, by + ny * ws / 2);
      o.fill();
      const mx = bx + dx * 0.42, my = by + dy * 0.42;
      o.fillStyle = rgb(mix(mix(b.c, LIGHT, 0.12 + (1 - depthK) * 0.1), SHADE, fog * 0.6));
      o.beginPath();
      o.moveTo(mx - nx * ws * 0.36, my - ny * ws * 0.36);
      o.quadraticCurveTo(cx - nx * ws * 0.22, cy - ny * ws * 0.22, tx, ty);
      o.quadraticCurveTo(cx + nx * ws * 0.22, cy + ny * ws * 0.22, mx + nx * ws * 0.36, my + ny * ws * 0.36);
      o.fill();
    } else if (it.t === 1) {
      const t = it.d;
      const s = ppi(it.z) * 0.06;
      o.strokeStyle = rgb(mix(t.c, SHADE, depthK * 0.4), 0.9);
      o.lineWidth = Math.max(0.7, ppi(it.z) * 0.021);
      o.beginPath();
      let [px, py] = it.p;
      o.moveTo(px, py);
      const ca = Math.cos(t.a), sa = Math.sin(t.a) * 0.45;
      for (let k = 0; k < t.n; k++) {
        const side = k % 2 ? 1 : -1;
        const nx2 = px + ca * s, ny2 = py + sa * s;
        o.quadraticCurveTo(px + ca * s / 2 - sa * s * 0.55 * side, py + sa * s / 2 + ca * s * 0.38 * side, nx2, ny2);
        px = nx2; py = ny2;
      }
      o.stroke();
    } else {
      const R = it.rad * ppi(it.z);
      const [cx, cy] = it.c;
      o.save();
      o.fillStyle = 'rgba(5,8,2,.55)';
      if (!low) o.filter = `blur(${R * 0.22}px)`;
      o.beginPath(); o.ellipse(it.sh[0], it.sh[1], R * 1.05, R * 0.34, 0, 0, Math.PI * 2); o.fill();
      o.restore();
      const g = o.createRadialGradient(cx - R * 0.35, cy - R * 0.45, R * 0.05, cx, cy, R * 1.05);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#e7e8df'); g.addColorStop(1, '#8e917f');
      o.fillStyle = g;
      o.beginPath(); o.arc(cx, cy, R, 0, Math.PI * 2); o.fill();
      o.save(); o.clip();
      const n = low ? 160 : 360, dr = R * 0.075;
      for (let i = 0; i < n; i++) {
        const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), th = i * 2.399963;
        const x = Math.cos(th) * rr, zz = Math.sin(th) * rr;
        if (zz < 0.08) continue;
        o.fillStyle = `rgba(60,64,50,${0.08 + 0.2 * (1 - zz)})`;
        o.beginPath(); o.ellipse(cx + x * R, cy + y * R, dr * zz, dr, Math.atan2(y, x), 0, Math.PI * 2); o.fill();
      }
      o.restore();
    }
  };

  if (low) {
    // Interactive preview: draw straight to the canvas, no depth-of-field passes.
    for (const it of items) drawItem(ctx, it);
  } else {
    const focus = zNear + (zFar - zNear) * (opts.focus ?? 0.18);
    const bands = 9;
    const layers = Array.from({ length: bands }, () => []);
    items.forEach((it) => layers[Math.min(bands - 1, Math.max(0, Math.floor(((it.z - zNear) / (zFar - zNear + 1e-6)) * bands)))].push(it));
    const off = document.createElement('canvas');
    off.width = canvas.width; off.height = canvas.height;
    const o = off.getContext('2d');
    for (let bi = bands - 1; bi >= 0; bi--) {
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.clearRect(0, 0, off.width, off.height);
      o.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const it of layers[bi]) drawItem(o, it);
      const bz = zNear + ((bi + 0.5) / bands) * (zFar - zNear);
      const blur = Math.max(0, (bz - focus) / (zFar - zNear)) * (opts.dof ?? 3.2);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (blur > 0.4) ctx.filter = `blur(${(blur * dpr).toFixed(1)}px)`;
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    }
  }

  // Warm key light from the far left corner (in screen space), falling off to the near right.
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const lg = ctx.createLinearGradient(w * 0.15, h * 0.1, w * 0.85, h * 0.9);
  lg.addColorStop(0, 'rgba(255, 228, 160, .2)');
  lg.addColorStop(0.5, 'rgba(255, 228, 160, 0)');
  lg.addColorStop(1, 'rgba(8, 10, 4, .26)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  canvas.dataset.drawn = String(w);
  return {
    tip: P(L + SW * 0.22, m.pile, F),
    thatch: P(L + SW * 0.5, m.pile * 0.15, F),
    edge: P(Rx * 0.55, m.pile * 0.92, F + SD * 0.22),
    w, h,
  };
}
