# Approved lifestyle images (public/img/ai/*.jpg, 1856 x 2304) -> lively web crops (webp). Never upscales.
import os, numpy as np
from PIL import Image, ImageFilter
SRC, OUT = 'public/img/ai/', 'public/img/ai/web/'
os.makedirs(OUT, exist_ok=True)
def grade(im, seed=7):
    # Photographic, not AI-smooth: clear the haze, real blacks, an S-curve, a touch of sharpening and fine grain.
    im = im.filter(ImageFilter.UnsharpMask(radius=2.2, percent=35, threshold=2))
    a = np.asarray(im).astype(np.float32) / 255
    lo = np.percentile(a, 0.6, axis=(0, 1)); hi = np.percentile(a, 99.7, axis=(0, 1))
    a = np.clip((a - lo) / (hi - lo), 0, 1)
    a = np.clip(a + .5 * a * (1 - a) * (a - .5), 0, 1) ** 1.02
    lum = a.mean(2, keepdims=True); a = lum + (a - lum) * 1.1
    a[..., 0] *= .99; a[..., 2] *= 1.01
    g = np.random.default_rng(seed).normal(0, .009, a.shape[:2])[..., None]
    a = a + g * (1 - np.abs(a - .5))
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
JOBS = {  # name: (file, centre y as fraction, aspect w/h, output widths)
  'family-wide':   ('family.jpg',   .50, 16/9, (1856, 1200)),
  'family-tall':   ('family.jpg',   .58, 4/5,  (1200, 600)),
  'backyard-wide': ('backyard.jpg', .55, 16/9, (1856, 1200)),
  'backyard-tall': ('backyard.jpg', .55, 4/5,  (1200, 600)),
  'home-wide':     ('home.jpg',     .50, 16/9, (1856, 1200)),
  'home-tall':     ('home.jpg',     .55, 4/5,  (1200, 600)),
  'rooftop':       ('rooftop.jpg',  .55, 3/2,  (1440, 720)),
  'shade':         ('shade.jpg',    .55, 3/2,  (1440, 720)),
  'dog':           ('dog.jpg',      .62, 3/2,  (1440, 720)),
}
for name, (f, cy, ar, widths) in JOBS.items():
    im = Image.open(SRC + f).convert('RGB'); W, H = im.size
    w = W; h = round(w / ar)
    if h > H: h = H; w = round(h * ar)
    x0 = (W - w) // 2; y0 = int(min(max(cy * H - h / 2, 0), H - h))
    c = grade(im.crop((x0, y0, x0 + w, y0 + h)))
    for ww in widths:
        assert ww <= w, (name, ww, w)
        suf = '' if ww == widths[-1] else '@2x'
        c.resize((ww, round(ww / ar)), Image.LANCZOS).save(f'{OUT}{name}{suf}.webp', quality=84, method=6)
    print(name, w, h)

# Hero background: the family photo gradient-mapped to the beige tones, faded toward off-white.
STOPS = [(0, (120, 108, 86)), (.45, (196, 184, 160)), (.75, (226, 219, 204)), (1, (246, 244, 238))]
def gradient_map(im, fade=.5, ground=(243, 243, 240)):
    a = np.asarray(im.convert('L')).astype(np.float32) / 255
    xs = [p for p, _ in STOPS]; out = np.zeros(a.shape + (3,), np.float32)
    for ch in range(3):
        out[..., ch] = np.interp(a, xs, [c[ch] for _, c in STOPS])
    out = out * fade + np.array(ground, np.float32) * (1 - fade)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))
for name, ar, widths in (('family-map-wide', 16/9, (1856, 1200)), ('family-map-tall', 3/4, (1200, 600))):
    im = Image.open(SRC + 'family.jpg').convert('RGB'); W, H = im.size
    w = W; h = round(w / ar)
    if h > H: h = H; w = round(h * ar)
    x0 = (W - w) // 2; y0 = int(min(max(.5 * H - h / 2, 0), H - h))
    c = gradient_map(im.crop((x0, y0, x0 + w, y0 + h)))
    for ww in widths:
        suf = '' if ww == widths[-1] else '@2x'
        c.resize((ww, round(ww / ar)), Image.LANCZOS).save(f'{OUT}{name}{suf}.webp', quality=82, method=6)
    print(name, w, h)
