import numpy as np, soundfile as sf, scipy.signal as ss, mix as M
from faster_whisper import WhisperModel
SR=M.SR
def stats(name, fn):
    # rebuild stems by monkeypatching master
    cap={}
    orig=M.master
    def grab(music,sfx,vo,dur):
        cap.update(music=M.duck(music,vo)*.7, sfx=M.reverb(sfx,.18)*.35*(10**(-5*M.vo_activity(vo)/20))[:,None], vo=vo*2.2); return orig(music,sfx,vo,dur)
    M.master=grab; mix,l=fn(); M.master=orig
    pre = cap['music']+cap['sfx']+cap['vo']
    def rms_db(x, mask=None):
        x = x if mask is None else x[mask]
        return 20*np.log10(np.sqrt((x**2).mean())+1e-9)
    act = np.abs(cap['vo']).max(1) > .02
    print(name, "| VO", round(rms_db(cap['vo'],act),1), "| music under VO", round(rms_db(cap['music'],act),1), "| music no VO", round(rms_db(cap['music'],~act),1), "| sfx", round(rms_db(cap['sfx'][np.abs(cap['sfx']).max(1)>.01]),1))
    # limiter gain reduction estimate: compare normalized pre vs final
    g = np.abs(mix).max()
    print("  pre-limit peak dB", round(20*np.log10(np.abs(pre).max()),1))
    m = WhisperModel("small.en", device="cpu", compute_type="int8")
    a = ss.resample_poly(mix.mean(1), 1, 3).astype("float32")
    segs,_ = m.transcribe(a, beam_size=5)
    for s in segs: print(f"  {s.start:5.1f}-{s.end:5.1f} {s.text.strip()}")
stats("safemark", M.reel_safemark); stats("models", M.reel_models)
