# Studio turf photos (6000 x 4000) -> vivid, natural daylight grade, 4:5 crops at 2160 x 2700 for the feed.
import sys, numpy as np
from PIL import Image, ImageOps
SRC = '/Users/meidis/Documents/garden mark turfs/'
OUT = 'public/img/studio/'
def grade(im):
    a = np.asarray(im).astype(np.float32) / 255
    a = a ** 0.93                                   # gentle lift, keeps depth
    lum = a.mean(2, keepdims=True)
    a = lum + (a - lum) * 1.28                      # richer, livelier greens
    a = np.clip((a - .5) * 1.06 + .5, 0, 1)         # a little more contrast
    a[..., 0] *= 1.01; a[..., 2] *= 0.97            # slightly warm, like daylight
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
JOBS = {  # name: (file, crop centre x, centre y as fractions, zoom: fraction of image height used)
  'profile':  ('_14A9675.jpg', .50, .50, 1.00),
  'thatch':   ('_14A9549.jpg', .50, .58, .80),
  'curl':     ('_14A9705.jpg', .62, .52, 1.00),
  'hand':     ('_14A9595.jpg', .40, .55, 1.00),
  'roll':     ('_14A9614.jpg', .60, .58, .95),
  'putting':  ('_14A9773.jpg', .58, .55, .95),
}
for name, (f, cx, cy, z) in JOBS.items():
    im = ImageOps.exif_transpose(Image.open(SRC + f)).convert('RGB')
    W, H = im.size; h = int(H * z); w = int(h * 4 / 5)
    x0 = int(min(max(cx * W - w / 2, 0), W - w)); y0 = int(min(max(cy * H - h / 2, 0), H - h))
    c = grade(im.crop((x0, y0, x0 + w, y0 + h))).resize((2160, 2700), Image.LANCZOS)
    c.save(OUT + name + '.jpg', quality=90); print(name, c.size)

# Website crops (webp, 1x and 2x). Turf type -> product: _14A9549-9614 Montana (tan curly thatch),
# _14A9639-9750 Kentucky (tall straight blades), _14A9758-9832 Augusta putting turf (golf only).
import os
WEB = 'public/img/studio/web/'
os.makedirs(WEB, exist_ok=True)
WEBJOBS = {  # name: (file, cx, cy, zoom (fraction of height), aspect w/h, 2x width)
  'hero-wide':   ('_14A9549.jpg', .50, .62, .52, 2.72, 2560),
  'hero-tall':   ('_14A9549.jpg', .45, .60, .80, 1.25, 1200),
  'thatch':      ('_14A9549.jpg', .55, .70, .55, .80, 1400),
  'hand':        ('_14A9595.jpg', .42, .55, 1.00, .80, 1400),
  'backing':     ('_14A9566.jpg', .55, .50, 1.00, 1.50, 1800),
  'montana':     ('_14A9604.jpg', .40, .55, .95, 10/11, 1200),
  'kentucky':    ('_14A9639.jpg', .52, .58, .90, 10/11, 1200),
  'augusta':     ('_14A9761.jpg', .55, .55, .95, 10/11, 1200),
}
for name, (f, cx, cy, z, ar, w2) in WEBJOBS.items():
    im = ImageOps.exif_transpose(Image.open(SRC + f)).convert('RGB')
    W, H = im.size; h = int(H * z); w = int(h * ar)
    if w > W: w = W; h = int(w / ar)
    x0 = int(min(max(cx * W - w / 2, 0), W - w)); y0 = int(min(max(cy * H - h / 2, 0), H - h))
    c = grade(im.crop((x0, y0, x0 + w, y0 + h)))
    assert w >= w2, (name, w, w2)                    # never upscale
    for suf, ww in (('@2x', w2), ('', w2 // 2)):
        r = c.resize((ww, round(ww / ar)), Image.LANCZOS); r.save(WEB + name + suf + '.webp', quality=84, method=6)
    print(name, w2, round(w2 / ar))
