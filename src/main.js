import { renderSample } from './sample.js';
import { buildSafeMark, layerOffsets } from './safemark.js';
import { buildInstall } from './safemark-build.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Header ---------- */
const header = $('.site-header');
const onScrollHeader = () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
  const under = document.elementFromPoint(window.innerWidth / 2, 74);
  header.classList.toggle('over-dark', !!under?.closest('[data-dark]'));
};
onScrollHeader();
window.addEventListener('load', onScrollHeader);
window.addEventListener('scroll', onScrollHeader, { passive: true });

/* ---------- Mobile nav ---------- */
const mnav = $('#mobile-nav');
$('.site-header .menu-btn').addEventListener('click', () => mnav.showModal());
$('[data-close]', mnav).addEventListener('click', () => mnav.close());
$$('a', mnav).forEach((a) => a.addEventListener('click', () => mnav.close()));

/* ---------- Hero: rendered Montana sample with pinned labels ---------- */
const heroStage = $('.hero-stage');
const heroCanvas = $('.hero-stage canvas');
function paintHero() {
  const mobile = window.innerWidth < 760;
  const anchors = renderSample(heroCanvas, 'montana', mobile
    ? { yaw: -14, camH: 12, camD: 20, padX: 0.1, padY: 0.1, dof: 2.4, seed: 3, width: 11, depth: 8 }
    : { yaw: -17, camH: 10.5, camD: 23, padX: 0.17, padY: 0.04, dof: 2.4, seed: 3, width: 14, depth: 8 });
  if (!anchors) return;
  const place = (name, pt) => {
    const el = $(`.hl[data-anchor="${name}"]`, heroStage);
    if (el) { el.style.left = `${pt[0]}px`; el.style.top = `${pt[1]}px`; }
  };
  place('tip', anchors.tip);
  place('thatch', anchors.thatch);
  place('edge', anchors.edge);
  heroStage.classList.add('is-drawn');
}
document.fonts?.ready.then(paintHero) ?? paintHero();
let heroTimer;
window.addEventListener('resize', () => { clearTimeout(heroTimer); heroTimer = setTimeout(paintHero, 200); });
// Gentle parallax as the hero scrolls away.
let heroTick = false;
window.addEventListener('scroll', () => {
  if (reduceMotion.matches || heroTick) return;
  heroTick = true;
  requestAnimationFrame(() => {
    heroTick = false;
    const y = window.scrollY;
    if (y < window.innerHeight * 1.2) heroStage.style.transform = `translateY(${(-y * 0.06).toFixed(1)}px)`;
  });
}, { passive: true });

/* ---------- Tabs (ARIA, arrow keys) ---------- */
function initTabs(list, onChange) {
  const tabs = $$('[role="tab"]', list);
  const select = (tab, focus = true) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) {
        panel.hidden = !on;
        if (on && !reduceMotion.matches) {
          panel.classList.remove('panel-enter');
          void panel.offsetWidth;
          panel.classList.add('panel-enter');
        }
      }
    });
    if (focus) tab.focus();
    onChange?.(tab);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t, false));
    t.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (e.key in keys) { e.preventDefault(); select(tabs[(i + keys[e.key] + tabs.length) % tabs.length]); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0]); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1]); }
    });
  });
  return select;
}
initTabs($('[data-tabs="spaces"]'));

/* ---------- Products: flagship panels ---------- */
const productsSec = $('#products');
const pileItems = $$('.pile-scale li');
// Each product sample can be orbited: drag (mouse or touch), arrow keys, double-click to reset.
const SAMPLE_OPTS = {
  montana: { yaw: -26, pitch: 32, seed: 11 },
  kentucky: { yaw: -26, pitch: 32, seed: 12 },
  augusta: { yaw: -30, pitch: 36, seed: 13 },
  canine: { yaw: -22, pitch: 32, seed: 14 },
};
const PITCH_RANGE = [8, 78];
const orbit = new Map(); // canvas -> { yaw, pitch }
function drawModel(c, quality = 'high') {
  const key = c.dataset.model;
  if (!orbit.has(c)) orbit.set(c, { yaw: SAMPLE_OPTS[key].yaw, pitch: SAMPLE_OPTS[key].pitch });
  const v = orbit.get(c);
  renderSample(c, key, { width: 10, depth: 8, padX: 0.025, padY: 0.04, dof: 2.6, pitchRange: PITCH_RANGE, seed: SAMPLE_OPTS[key].seed, yaw: v.yaw, pitch: v.pitch, quality });
}
function paintVisibleTurf() {
  $$('.model:not([hidden]) .sample-canvas').forEach((c) => {
    if (c.dataset.drawn !== String(c.clientWidth)) drawModel(c);
  });
}
$$('.model-visual').forEach((fig) => {
  const c = $('.sample-canvas', fig);
  if (!c) return;
  fig.tabIndex = 0;
  fig.setAttribute('aria-label', `${c.getAttribute('aria-label')} Drag, or use the arrow keys, to rotate the sample. Double-click to reset.`);
  fig.insertAdjacentHTML('beforeend', '<span class="rotate-hint" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Drag to rotate</span>');
  let raf = 0, idle = 0, vel = 0, last = null, dragging = false;
  const state = () => orbit.get(c) || (drawModel(c), orbit.get(c));
  const preview = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; drawModel(c, 'low'); });
    clearTimeout(idle);
    idle = setTimeout(() => { if (!dragging && Math.abs(vel) < 0.05) drawModel(c, 'high'); }, 180);
  };
  const used = () => fig.classList.add('rotated');
  const glide = () => {
    if (dragging || Math.abs(vel) < 0.05 || reduceMotion.matches) { vel = 0; preview(); return; }
    state().yaw += vel;
    vel *= 0.92;
    preview();
    requestAnimationFrame(glide);
  };
  fig.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true; vel = 0; last = [e.clientX, e.clientY];
    fig.setPointerCapture(e.pointerId);
    fig.classList.add('dragging'); used();
  });
  fig.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - last[0], dy = e.clientY - last[1];
    last = [e.clientX, e.clientY];
    const st = state();
    st.yaw += dx * 0.45;
    st.pitch = clamp(st.pitch + dy * 0.3, PITCH_RANGE[0], PITCH_RANGE[1]);
    vel = dx * 0.45;
    preview();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; fig.classList.remove('dragging');
    requestAnimationFrame(glide);
  };
  fig.addEventListener('pointerup', end);
  fig.addEventListener('pointercancel', end);
  fig.addEventListener('dblclick', () => {
    const d = SAMPLE_OPTS[c.dataset.model];
    Object.assign(state(), { yaw: d.yaw, pitch: d.pitch });
    vel = 0; drawModel(c, 'high');
  });
  fig.addEventListener('keydown', (e) => {
    const st = state();
    const map = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] };
    if (!(e.key in map)) return;
    e.preventDefault(); used();
    st.yaw += map[e.key][0];
    st.pitch = clamp(st.pitch + map[e.key][1], PITCH_RANGE[0], PITCH_RANGE[1]);
    preview();
  });
});
const selectProduct = initTabs($('[data-tabs="products"]'), (tab) => {
  const key = tab.dataset.key;
  productsSec.dataset.model = key;
  pileItems.forEach((li) => li.classList.toggle('on', li.dataset.key === key));
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  if (!reduceMotion.matches) {
    panel.classList.remove('enter');
    void panel.offsetWidth;
    panel.classList.add('enter');
  }
  paintVisibleTurf();
});
pileItems.forEach((li) => li.addEventListener('click', () => {
  selectProduct(document.querySelector(`[data-tabs="products"] [data-key="${li.dataset.key}"]`), false);
}));
pileItems[0]?.classList.add('on');
$$('[data-product]').forEach((a) => a.addEventListener('click', () => {
  const tab = document.querySelector(`[data-tabs="products"] [data-key="${a.dataset.product}"]`);
  if (tab) selectProduct(tab, false);
}));
if ('IntersectionObserver' in window) {
  const pio = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { paintVisibleTurf(); pio.disconnect(); } }, { rootMargin: '600px 0px' });
  pio.observe(productsSec);
} else paintVisibleTurf();
let turfTimer;
window.addEventListener('resize', () => { clearTimeout(turfTimer); turfTimer = setTimeout(paintVisibleTurf, 150); });

$$('[data-interest]').forEach((a) => a.addEventListener('click', () => {
  const msg = $('#d-msg');
  if (msg && !msg.value.trim()) msg.value = `Interested in ${a.dataset.interest}.`;
}));

/* ---------- SafeMark: exploded layers on scroll ---------- */
const sm = $('#safemark');
const smLayers = buildSafeMark($('#sm-svg'));

/* ---------- SafeMark: installation sequence ---------- */
(() => {
  const root = $('#sm-build');
  if (!root) return;
  const parts = buildInstall($('.sm-build-stage svg', root));
  const items = $$('.sm-steps li', root);
  const play = $('.sm-play', root);
  const LAST = items.length - 1;
  let cur = -1, timer = 0, playing = false;
  const show = (i) => {
    cur = i;
    parts.forEach((el) => {
      const only = el.dataset.only;
      el.classList.toggle('in', only !== undefined ? Number(only) === i : Number(el.dataset.step) <= i);
    });
    items.forEach((li, k) => { li.classList.toggle('on', k === i); li.classList.toggle('done', k < i); });
  };
  const stop = () => { clearInterval(timer); playing = false; play.textContent = cur >= LAST ? 'Replay' : 'Play'; play.setAttribute('aria-pressed', 'false'); };
  const start = () => {
    if (cur >= LAST) show(-1);
    playing = true; play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
    clearInterval(timer);
    const tick = () => { if (cur >= LAST) { stop(); return; } show(cur + 1); };
    tick();
    timer = setInterval(tick, 3400);
  };
  items.forEach((li, k) => $('button', li).addEventListener('click', () => { stop(); show(k); play.textContent = k >= LAST ? 'Replay' : 'Play'; }));
  play.addEventListener('click', () => (playing ? stop() : start()));
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    show(LAST); play.textContent = 'Replay';
  } else {
    show(-1);
    let started = false;
    new IntersectionObserver((en) => {
      en.forEach((e) => {
        if (e.isIntersecting && !started) { started = true; start(); }
        else if (!e.isIntersecting && playing) stop();
      });
    }, { threshold: 0.45 }).observe($('.sm-build-stage', root));
  }
})();
const smNotes = $$('#sm-notes li');
const smOrder = { turf: 0, sand: 1, pad: 2, frame: 3, base: 4 };
let smOn = false;
let smTick = false;
function renderSafeMark() {
  smTick = false;
  let p = 1;
  if (smOn) {
    const rect = $('.sm-stage', sm).getBoundingClientRect();
    p = clamp(-rect.top / (rect.height - window.innerHeight));
  }
  const explode = smOn ? easeInOut(clamp((p - 0.04) / 0.28)) : 1;
  const off = layerOffsets(explode);
  let active = -1;
  if (smOn && p >= 0.3 && p < 0.92) active = Math.min(4, Math.floor((p - 0.3) / 0.12));
  smLayers.forEach((g) => {
    const i = smOrder[g.dataset.key];
    g.setAttribute('transform', `translate(0 ${(-off[i]).toFixed(1)})`);
    g.style.filter = active < 0 || i === active ? '' : 'brightness(.42) saturate(.55)';
  });
  $$('.sm-num', sm).forEach((n) => { n.style.opacity = String(clamp((explode - 0.45) / 0.3)); });
  smNotes.forEach((li, i) => {
    li.classList.toggle('on', smOn ? (active < 0 ? p >= 0.92 : i === active) : false);
    li.classList.toggle('seen', smOn && (active < 0 ? p >= 0.92 : i < active));
  });
  if (smOn && active < 0 && p < 0.3) smNotes[0].classList.add('on');
}
function setSafeMarkMode() {
  smOn = !reduceMotion.matches && window.innerHeight >= 560;
  sm.classList.toggle('is-animated', smOn);
  renderSafeMark();
}
setSafeMarkMode();
window.addEventListener('scroll', () => { if (smOn && !smTick) { smTick = true; requestAnimationFrame(renderSafeMark); } }, { passive: true });
window.addEventListener('resize', setSafeMarkMode);
reduceMotion.addEventListener('change', setSafeMarkMode);

/* ---------- Warranty schedule ---------- */
const schedules = {
  res: [['Years 1–4', 100], ['Years 5–7', 80], ['Years 8–10', 60], ['Years 11–12', 40], ['Years 13–20', 10]],
  com: [['Years 1–4', 100], ['Years 5–7', 50], ['Years 8–10', 25], ['Years 11–12', 15], ['Years 13–20', 5]],
};
const bars = $('#bars');
const schedDesc = $('#sched-desc');
function renderSchedule(key) {
  bars.innerHTML = schedules[key].map(([label, v]) =>
    `<div class="bar-row"><span>${label}</span><span class="track" aria-hidden="true"><span class="fill" style="width:${v}%;display:block"></span></span><span>${v}%</span></div>`
  ).join('');
  schedDesc.textContent = key === 'res'
    ? 'The warranty’s proration schedule for residential landscaping, roof decks and putting greens. Percentages apply to replacement grass, never to labor.'
    : 'The warranty’s proration schedule for playgrounds, pet areas, and highway and street medians. Percentages apply to replacement grass, never to labor.';
}
$$('[data-sched]').forEach((b) => b.addEventListener('click', () => {
  $$('[data-sched]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  renderSchedule(b.dataset.sched);
}));
renderSchedule('res');

/* ---------- Gallery ---------- */
const photos = [
  ['surf-city-3-uniform', 'waterfront', 'A bayside yard where synthetic grass meets a brick paver path and a bulkhead.', 'w'],
  ['lbi', 'waterfront', 'A pool at dusk beside a fire feature, with synthetic grass around the pool deck.', 't'],
  ['hoboken-1-uniform', 'urban', 'A narrow city backyard with synthetic grass, timber fencing and a glass-walled fire pit.', ''],
  ['putting-green_uniform', 'recreation', 'A backyard putting green bordered by flowering shrubs and stone.', ''],
  ['rooftop-1-uniform', 'urban', 'A rooftop deck with synthetic grass and two white loungers facing the water.', 'w'],
  ['commercial-2_uniform', 'commercial', 'A landscaped commercial garden with synthetic grass, stone benches and evergreens.', 't'],
  ['jc-1-uniform', 'urban', 'A courtyard of synthetic grass with planters and an outdoor dining table.', ''],
  ['residential-1_uniform', 'residential', 'A front yard with synthetic grass, a brick path and a planted rock garden.', ''],
  ['surf-city-1-uniform', 'waterfront', 'A canal-front lawn of synthetic grass beside boat docks, with curved planting beds.', 'w'],
  ['bocce-court-uniform', 'recreation', 'A long bocce court surfaced with synthetic grass between timber borders.', ''],
  ['dog-run-uniform', 'commercial', 'A long fenced dog run surfaced with synthetic grass.', ''],
  ['jc-4_uniform', 'urban', 'A formal front garden with synthetic grass panels around a central planter.', 't'],
  ['long_beach_island', 'waterfront', 'A large shore house with a front lawn of synthetic grass and a brick path.', ''],
  ['lbi-pool-1_uniform', 'recreation', 'A strip of synthetic grass between a swimming pool and a row of evergreens.', ''],
  ['residential-4_uniform', 'residential', 'A side yard of synthetic grass beside a grey shingled house.', 'w'],
  ['jc-7_uniform', 'urban', 'A city garden of synthetic grass with a curved bed, seating and white railings.', ''],
  ['nyc_daycare', 'commercial', 'A daycare play yard with synthetic grass and colorful play houses.', ''],
  ['jc-10_uniform', 'urban', 'A brick townhouse garden with synthetic grass, white railings, a stone patio and flowering planters.', ''],
];
const albumName = { urban: 'Urban', residential: 'Residential', waterfront: 'Waterfront', recreation: 'Recreation', commercial: 'Commercial & schools' };
const grid = $('#grid-gallery');
grid.innerHTML = photos.map(([f, alb, alt, cls], i) =>
  `<li class="${cls}" data-album="${alb}"><button type="button" data-i="${i}" aria-label="Open photo: ${alt}"><img src="/img/gm/${f}.webp" alt="${alt}" loading="lazy" width="960" height="573"><span class="lbl">${albumName[alb]}</span></button></li>`
).join('');
let visible = photos.map((_, i) => i);
$$('.filters button').forEach((b) => b.addEventListener('click', () => {
  $$('.filters button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const f = b.dataset.filter;
  visible = [];
  $$('li', grid).forEach((li, i) => {
    const show = f === 'all' || li.dataset.album === f;
    li.hidden = !show;
    if (show) visible.push(i);
  });
}));
const lb = $('#lightbox');
const lbImg = $('#lb-img');
const lbCap = $('#lb-cap');
let current = 0;
function showPhoto(i) {
  current = i;
  const [f, alb, alt] = photos[i];
  lbImg.src = `/img/gm/${f}@2x.webp`;
  lbImg.alt = alt;
  lbCap.textContent = `${albumName[alb]} album, GardenMark project gallery. ${visible.indexOf(i) + 1} of ${visible.length}`;
}
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-i]');
  if (!btn) return;
  showPhoto(Number(btn.dataset.i));
  lb.showModal();
});
const step = (d) => { const k = visible.indexOf(current); showPhoto(visible[(k + d + visible.length) % visible.length]); };
lb.addEventListener('click', (e) => {
  const a = e.target.closest('[data-lb]')?.dataset.lb;
  if (a === 'prev') step(-1);
  else if (a === 'next') step(1);
  else if (a === 'close' || e.target === lb) lb.close();
});
lb.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'ArrowRight') step(1);
});

/* ---------- Cost comparison ---------- */
const money = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const num = (id) => { const v = parseFloat($(id).value); return Number.isFinite(v) && v >= 0 ? v : null; };
const yearsInput = $('#c-years');
function renderCalc() {
  const years = Number(yearsInput.value);
  $('#c-years-out').textContent = years;
  const area = num('#c-area');
  const quote = num('#c-quote');
  const care = num('#c-care') ?? 0;
  const water = num('#c-water') ?? 0;
  const upkeep = num('#c-upkeep') ?? 0;
  const verdict = $('#verdict');
  const chart = $('#chart');
  if (quote === null || quote === 0 || (care + water) === 0) {
    verdict.textContent = 'Enter a quote and at least one current lawn cost to see the comparison.';
    $('#tot-lawn').textContent = '—';
    $('#tot-turf').textContent = '—';
    chart.innerHTML = '';
    return;
  }
  const lawnYear = care + water;
  const lawnTotal = lawnYear * years;
  const turfTotal = quote + upkeep * years;
  const saving = lawnYear - upkeep;
  $('#tot-lawn').textContent = money(lawnTotal);
  $('#tot-turf').textContent = money(turfTotal);
  let text;
  if (saving <= 0) {
    text = `At these numbers, synthetic grass doesn’t break even. Its expected upkeep (${money(upkeep)} a year) is at least as much as what you spend on the lawn now (${money(lawnYear)}).`;
  } else {
    const be = quote / saving;
    if (be <= years) {
      text = `Over ${years} years, synthetic grass comes out ${money(lawnTotal - turfTotal)} lower at these numbers. It breaks even after about ${be.toFixed(1)} years.`;
    } else {
      text = `Over ${years} years, keeping the current lawn costs ${money(turfTotal - lawnTotal)} less. At these numbers, synthetic grass would take about ${be.toFixed(1)} years to break even.`;
      if (be > 20) text += ' That’s longer than the warranty period.';
    }
  }
  verdict.textContent = text + (area ? ` Your quote works out to $${(quote / area).toFixed(2)} per sq ft.` : '');
  drawChart(chart, years, (y) => lawnYear * y, (y) => quote + upkeep * y);
}
function drawChart(svg, years, lawnFn, turfFn) {
  const W = 560, H = 240, L = 58, R = 12, T = 12, B = 30;
  const max = Math.max(lawnFn(years), turfFn(years)) * 1.08;
  const x = (y) => L + (y / years) * (W - L - R);
  const yy = (v) => T + (1 - v / max) * (H - T - B);
  const path = (fn) => Array.from({ length: years + 1 }, (_, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yy(fn(i)).toFixed(1)}`).join('');
  const ticks = 4;
  let grid = '';
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i;
    grid += `<line x1="${L}" x2="${W - R}" y1="${yy(v)}" y2="${yy(v)}"/><text x="${L - 8}" y="${yy(v) + 4}" text-anchor="end">${v >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + Math.round(v)}</text>`;
  }
  const xt = [0, Math.round(years / 2), years].filter((v, i, a) => a.indexOf(v) === i)
    .map((v) => `<text x="${x(v)}" y="${H - 8}" text-anchor="${v === 0 ? 'start' : v === years ? 'end' : 'middle'}">${v === 0 ? 'Today' : 'Year ' + v}</text>`).join('');
  svg.innerHTML = `<g class="grid">${grid}</g>${xt}
    <path d="${path(lawnFn)}" fill="none" stroke="#8a5a2b" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="${path(turfFn)}" fill="none" stroke="#3c7417" stroke-width="2.5" stroke-linejoin="round"/>`;
  svg.setAttribute('aria-label', `Cumulative cost over ${years} years. Current lawn reaches ${money(lawnFn(years))}. Synthetic grass reaches ${money(turfFn(years))}.`);
}
$('#calc').addEventListener('input', renderCalc);
$('#calc').addEventListener('submit', (e) => e.preventDefault());
renderCalc();

/* ---------- Dealer enquiry (prototype: composes an email, sends nothing) ---------- */
const form = $('#dealer-form');
const ready = $('#ready');
const fields = {
  zip: [$('#d-zip'), (v) => /^\d{5}(-\d{4})?$/.test(v.trim())],
  name: [$('#d-name'), (v) => v.trim().length > 1],
  email: [$('#d-email'), (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())],
};
function validate() {
  let first = null;
  for (const [key, [el, ok]] of Object.entries(fields)) {
    const valid = ok(el.value);
    el.setAttribute('aria-invalid', String(!valid));
    $(`#d-${key}-err`).hidden = valid;
    if (!valid && !first) first = el;
  }
  return first;
}
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const bad = validate();
  if (bad) { bad.focus(); ready.hidden = true; return; }
  const zip = $('#d-zip').value.trim();
  const body = [
    'Hello GardenMark,',
    '',
    `I'm looking for a GardenMark dealer near ZIP ${zip}.`,
    `Project: ${$('#d-type').value}`,
    $('#d-msg').value.trim() ? `Notes: ${$('#d-msg').value.trim()}` : null,
    '',
    `Name: ${$('#d-name').value.trim()}`,
    `Email: ${$('#d-email').value.trim()}`,
  ].filter((l) => l !== null).join('\n');
  $('#ready-text').textContent = body;
  $('#ready-mail').href = `mailto:info@gardenmark.com?subject=${encodeURIComponent(`Dealer enquiry, ZIP ${zip}`)}&body=${encodeURIComponent(body)}`;
  ready.hidden = false;
  ready.focus();
});
$$('input', form).forEach((el) => el.addEventListener('blur', () => { if (el.getAttribute('aria-invalid') === 'true') validate(); }));
$('#ready-copy').addEventListener('click', async (e) => {
  try { await navigator.clipboard.writeText($('#ready-text').textContent); e.target.textContent = 'Copied'; }
  catch { e.target.textContent = 'Select the text above to copy'; }
});
$('#ready-edit').addEventListener('click', () => { ready.hidden = true; $('#d-zip').focus(); });

/* ---------- Gentle image reveals ---------- */
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));
} else {
  $$('.reveal').forEach((el) => el.classList.add('in'));
}
