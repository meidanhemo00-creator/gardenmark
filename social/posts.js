// Carousel content. Every line follows the site's claims register:
// no "maintenance-free", no "stays cool", exact PFAS wording, qualifiers beside claims.

export const POSTS = {
  colors: {
    theme: 'dark',
    slides: [
      { layout: 'hook', h: 'Good lawns<br>aren’t <em>one<br>color.</em>', body: 'Look closer.', visual: { type: 'sample', model: 'montana', yaw: -24, pitch: 26 } },
      { layout: 'split', label: 'Montana', h: 'Three greens<br>in every patch.', body: 'Deep, mid and light green blades,<br>blended through every patch.', visual: { type: 'sample', model: 'montana', yaw: 32, pitch: 20, swatches: true } },
      { layout: 'split', label: 'Underneath', h: 'A brown,<br>curly thatch.', body: 'It sits low between the blades and gives the green a warmer, lived-in depth.', visual: { type: 'sample', model: 'montana', yaw: 215, pitch: 64 } },
      { layout: 'split', label: 'Pile height', h: '1.75 in.<br>Drawn to scale.', body: 'Montana and Kentucky stand at the same height. Kentucky swaps the brown thatch for green.', visual: { type: 'scale', on: ['montana', 'kentucky'] } },
      { layout: 'text', theme: 'light', label: 'Before you choose', h: 'See it<br>in <em>daylight.</em>', body: 'Screens flatten color. Ask your dealer for a sample and look at it outside, next to your stone and planting.' },
      { layout: 'cta', h: 'A lawn worth<br>coming home to.' },
    ],
  },

  saturdays: {
    theme: 'light',
    slides: [
      { layout: 'hook', h: '52 Saturdays.<br><em>How many<br>go to the<br>mower?</em>', visual: { type: 'weeks' } },
      { layout: 'photo', src: '/img/gm/hoboken-1-uniform@2x.webp', h: 'No mowing.<br>No edging.<br>No reseeding.', body: 'The installed area never needs it.' },
      { layout: 'photo', src: '/img/gm/jc-8_uniform@2x.webp', h: 'Less mud at<br>the back door.', body: 'Built on a well-drained stone base, the turfed area doesn’t turn to mud after rain.' },
      { layout: 'photo', src: '/img/gm/nyc-1_uniform@2x.webp', h: 'Green where<br>grass gives up.', body: 'Shade, foot traffic, dry spells.' },
      { layout: 'text', theme: 'dark', label: 'Upkeep', h: 'A little care<br>keeps it<br><em>looking<br>its best.</em>', body: 'A rinse, a brush and clearing leaves now and then.' },
      { layout: 'cta', h: 'Less lawn work.<br>More room<br>for weekends.' },
    ],
  },

  questions: {
    theme: 'light',
    slides: [
      { layout: 'text', label: 'Save this before you get quotes', h: '5 questions<br>smart buyers<br><em>ask first.</em>', swipe: true },
      { layout: 'q', n: '01', h: 'What is it<br>made without?', body: 'GardenMark identifies its synthetic grass as PFAS-free. Ask your dealer for the product documentation.' },
      { layout: 'q', n: '02', h: 'Will it look real<br>up close?', body: 'Look for depth. Montana blends three greens over a brown, curly thatch, so it doesn’t read as one flat color.', visual: { type: 'sample', model: 'montana', yaw: -24, pitch: 22 } },
      { layout: 'q', n: '03', h: 'What’s<br>underneath?', body: 'A compacted crushed-stone base with a slight slope. It’s what keeps the lawn flat and draining.', visual: { type: 'stack' } },
      { layout: 'q', n: '04', h: 'Who installs it?', body: 'A professional installer, through your local GardenMark dealer. GardenMark supplies the turf and every part that holds it down.' },
      { layout: 'q', n: '05', h: 'What does<br>the warranty<br>cover?', body: 'GardenMark grass comes with a 20-year limited warranty.' },
      { layout: 'cta', theme: 'dark', h: 'Share this<br>with whoever<br>plans the yard.' },
    ],
  },

  paws: {
    theme: 'dark',
    slides: [
      { layout: 'hook', h: 'Muddy paw<br>season<br><em>is here.</em>', visual: { type: 'paws' } },
      { layout: 'photo', src: '/img/gm/dog-run-uniform@2x.webp', h: 'No mud patch<br>where they run.', body: 'On its stone base, the turfed area doesn’t turn to mud under paws.' },
      { layout: 'split', label: 'Canine', h: '1 in pile.<br>Made for pets.', body: 'With antimicrobial, antibacterial and anti-static additives, designed to reduce bacteria and mildew compared with regular turf.', visual: { type: 'sample', model: 'canine', yaw: -20, pitch: 24 } },
      { layout: 'list', label: 'The routine', h: 'Simple care.', items: ['Pick up', 'Rinse with water', 'Brush the pile now and then'] },
      { layout: 'text', theme: 'light', label: 'After the rain', h: 'Clean paws<br><em>back inside.</em>', body: 'No mud patch by the back door means less to wipe up.' },
      { layout: 'cta', h: 'Built for<br>the whole family.<br><em>Paws included.</em>' },
    ],
  },
};
