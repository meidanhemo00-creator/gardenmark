// Shared photo grade for GardenMark project photos: gentler saturation (the originals are
// pushed toward neon green), a touch more contrast, slightly warmer white balance.
// Originals stay untouched in research/img.
import sharp from 'sharp';
import fs from 'node:fs';
const R = 'research/img/';
const keep = ['surf-city-1-uniform','surf-city-2_uniform','surf-city-3-uniform','surf-city-4-uniform','long_beach_island','lbi','lbi-pool-1_uniform','lbi-pool-2_uniform',
  'hoboken-1-uniform','jc-1-uniform','jc-3-uniform','jc-4_uniform','jc-7_uniform','jc-8_uniform','jc-9_uniform','jc-10_uniform','nyc-1_uniform','rooftop-1-uniform','rooftop_deck',
  'putting-green_uniform','bocce-court-uniform','dog-run-uniform','commercial-2_uniform','residential-1_uniform','residential-4_uniform','nyc_daycare'];
fs.rmSync('public/img/gm', { recursive: true, force: true });
fs.mkdirSync('public/img/gm', { recursive: true });
const grade = (img) => img
  .modulate({ saturation: 0.82 })
  .linear(1.05, -5)
  .recomb([[1.03, 0.01, 0], [0, 1.0, 0], [0, 0.01, 0.95]]);
for (const n of keep) {
  const src = R + n + '.jpg';
  const m = await sharp(src).metadata();
  await grade(sharp(src)).webp({ quality: 84 }).toFile(`public/img/gm/${n}.webp`);
  await grade(sharp(src)).resize({ width: Math.round(m.width * 1.5), kernel: 'lanczos3' }).sharpen({ sigma: 0.5, m1: 0.6, m2: 1.2 }).webp({ quality: 80 }).toFile(`public/img/gm/${n}@2x.webp`);
}
// Small product swatches and accessory packshots, ungraded (product color must stay true).
for (const n of ['montana', 'kentucky', 'augusta', 'canine-thumb']) await sharp(R + n + '.jpg').extract({ left: 0, top: 0, width: 289, height: 220 }).webp({ quality: 90 }).toFile(`public/img/gm/${n}.webp`);
for (const n of ['tapemark', 'weedmark', 'bondmark', 'nailmark']) await sharp(R + n + '.jpg').webp({ quality: 88 }).toFile(`public/img/gm/${n}.webp`);
await sharp(R + 'Sweeper-2023_4-copy-1024x737.png').resize({ width: 700 }).webp({ quality: 88 }).toFile('public/img/gm/sweeper.webp');
fs.copyFileSync(R + 'logo-gardenmark.png', 'public/img/gm/logo-original.png');

// Grain tiles: transparent noise, one light (for dark sections) and one dark (for light sections).
const N = 220;
const mk = (light, alpha) => {
  const buf = Buffer.alloc(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const v = Math.random();
    buf[i * 4] = buf[i * 4 + 1] = buf[i * 4 + 2] = light ? 255 : 0;
    buf[i * 4 + 3] = Math.round(Math.pow(v, 4) * alpha);
  }
  return sharp(buf, { raw: { width: N, height: N, channels: 4 } }).png();
};
await mk(true, 22).toFile('public/img/tex/grain-d.png');
await mk(false, 18).toFile('public/img/tex/grain-l.png');
console.log('done');
