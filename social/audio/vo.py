import json, soundfile as sf, numpy as np
from kokoro_onnx import Kokoro
k = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
V = "af_heart"
LINES = {
 "safemark": [
  ("hook", "Okay. What's actually under a playground lawn? Let's build one!", 1.08),
  ("s1", "First, a solid base, and a wood frame.", 1.1),
  ("s2", "Then, the shock pad.", 1.1),
  ("s3", "Laid nice and tight. Water drains right through the joints.", 1.12),
  ("s4", "Need more? A second layer goes the other way.", 1.12),
  ("s5", "Glued in place. Never nailed.", 1.08),
  ("s6", "Now, Montana on top...", 1.05),
  ("s7", "and a little sand to finish.", 1.08),
  ("end", "SafeMark. The layer you'll never see. Find your GardenMark dealer.", 1.05),
 ],
 "models": [
  ("hook", "Four surfaces. So, which one is your yard?", 1.1),
  ("m1", "Montana. The natural mix.", 1.05),
  ("m2", "Kentucky. A little greener.", 1.05),
  ("m3", "Augusta. For your short game.", 1.05),
  ("m4", "Canine. Made for the good boys and girls.", 1.08),
  ("end", "Drop your pick in the comments, and we'll find your dealer!", 1.1),
 ],
}
out = {}
for reel, lines in LINES.items():
    out[reel] = {}
    for key, text, spd in lines:
        a, sr = k.create(text, voice=V, speed=spd, lang="en-us")
        a = np.asarray(a, dtype=np.float32)
        # trim silence
        idx = np.where(np.abs(a) > 0.01)[0]
        a = a[max(0, idx[0] - 400): idx[-1] + 1200]
        sf.write(f"vo/{reel}-{key}.wav", a, sr)
        out[reel][key] = round(len(a) / sr, 3)
json.dump(out, open("vo/durations.json", "w"), indent=1)
print(json.dumps(out, indent=1), sr)
