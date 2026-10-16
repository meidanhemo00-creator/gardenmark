import sharp from 'sharp';
import fs from 'node:fs';
const R='research/img/';
const gm = ['surf-city-2_uniform','surf-city-1-uniform','surf-city-3-uniform','surf-city-4-uniform','jc-1-uniform','jc-3-uniform','jc-4_uniform','jc-5_uniform','jc-7_uniform','jc-8_uniform','jc-9_uniform','jc-10_uniform','hoboken-1-uniform','nyc-1_uniform','rooftop-1-uniform','rooftop_deck','lbi-pool-1_uniform','lbi-pool-2_uniform','lbi','long_beach_island','putting-green_uniform','bocce-court-uniform','soccer-1-uniform','dog-run-uniform','commercial-1_uniform','commercial-2_uniform','angel-park-amphitheatre-uniform','nyc_daycare','residential-1_uniform','residential-2_uniform','residential-3_uniform','residential-4_uniform','SafeMark_2'];
for (const n of gm) {
  const src = R+n+'.jpg'; if(!fs.existsSync(src)) { console.log('missing',n); continue; }
  const m = await sharp(src).metadata();
  await sharp(src).webp({quality:80}).toFile(`public/img/gm/${n}.webp`);
  await sharp(src).resize({width:Math.round(m.width*1.6), kernel:'lanczos3'}).sharpen({sigma:0.6}).webp({quality:78}).toFile(`public/img/gm/${n}@2x.webp`);
}
// product swatches (small originals) — crop off the label band
for (const n of ['montana','kentucky','augusta','canine-thumb']) {
  await sharp(R+n+'.jpg').extract({left:0,top:0,width:289,height:220}).webp({quality:88}).toFile(`public/img/gm/${n}.webp`);
}
for (const n of ['tapemark','weedmark','bondmark','nailmark']) await sharp(R+n+'.jpg').webp({quality:85}).toFile(`public/img/gm/${n}.webp`);
await sharp(R+'Sweeper-2023_4-copy-1024x737.png').resize({width:700}).webp({quality:85}).toFile('public/img/gm/sweeper.webp');
await sharp(R+'SafeMark-ilustration3png.png').resize({width:1200}).webp({quality:85}).toFile('public/img/gm/safemark-layers.webp');
fs.copyFileSync(R+'logo-gardenmark.png','public/img/gm/logo-original.png');
fs.copyFileSync(R+'gardenmarkicon.png','public/img/gm/icon-original.png');
console.log('ok');
