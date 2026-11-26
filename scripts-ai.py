# Approved lifestyle images (public/img/ai/*.jpg, 1856 x 2304) -> lively web crops (webp). Never upscales.
import os, numpy as np
from PIL import Image
SRC, OUT = 'public/img/ai/', 'public/img/ai/web/'
os.makedirs(OUT, exist_ok=True)
def grade(im):
    a = np.asarray(im).astype(np.float32) / 255
    lum = a.mean(2, keepdims=True)
    a = lum + (a - lum) * 1.2                  # livelier color
    a = np.clip((a - .5) * 1.04 + .5, 0, 1)    # a touch more contrast
    a[..., 0] *= 1.015; a[..., 2] *= .975      # warm daylight
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
