"""GardenMark reel audio: Apple Loops music bed, synthesized sound design, Kokoro VO.
Usage: python mix.py safemark|models  -> out/<reel>.wav (48 kHz stereo, -14 LUFS, -1 dBTP)
"""
import sys, json
import numpy as np
import soundfile as sf
import scipy.signal as ss
import pyloudnorm as pyln

SR = 48000
rng = np.random.default_rng(7)
LOOPS = "loops/"


def silence(sec):
    return np.zeros((int(round(sec * SR)), 2), np.float32)


def load_loop(name, beats, bpm):
    a, sr = sf.read(LOOPS + name + ".wav", dtype="float32", always_2d=True)
    n = int(round(beats * 60 / bpm * SR))
    if len(a) < n:
        a = np.concatenate([a, np.zeros((n - len(a), 2), np.float32)])
    return a[:n]


def place(bus, clip, t, gain=1.0):
    i = int(round(t * SR))
    if i >= len(bus):
        return
    j = min(len(bus), i + len(clip))
    bus[i:j] += clip[: j - i] * gain


def loop_region(bus, clip, t0, t1, gain=1.0, fade_in=0.0, fade_out=0.02):
    seg = np.tile(clip, (int(np.ceil((t1 - t0) * SR / len(clip))) + 1, 1))[: int(round((t1 - t0) * SR))].copy()
    n = len(seg)
    if fade_in > 0:
        k = min(n, int(fade_in * SR)); seg[:k] *= np.linspace(0, 1, k)[:, None] ** 2
    if fade_out > 0:
        k = min(n, int(fade_out * SR)); seg[n - k:] *= np.linspace(1, 0, k)[:, None]
    place(bus, seg, t0, gain)


def lp_sweep(x, f_start, f_end, block=512):
    """Time-varying low-pass (exponential sweep), state carried across blocks."""
    out = np.empty_like(x)
    nb = int(np.ceil(len(x) / block))
    zi = None
    for b in range(nb):
        f = f_start * (f_end / f_start) ** (b / max(1, nb - 1))
        sos = ss.butter(2, min(f, SR * 0.45), "low", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2, 2))
        seg = x[b * block:(b + 1) * block]
        y = np.empty_like(seg)
        for c in range(2):
            y[:, c], zi[:, :, c] = ss.sosfilt(sos, seg[:, c], zi=zi[:, :, c])
        out[b * block:(b + 1) * block] = y
    return out


def bandpass(x, lo, hi, order=2):
    sos = ss.butter(order, [lo, hi], "band", fs=SR, output="sos")
    return ss.sosfilt(sos, x, axis=0)


def hp(x, f, order=2):
    return ss.sosfilt(ss.butter(order, f, "high", fs=SR, output="sos"), x, axis=0)


def lp(x, f, order=2):
    return ss.sosfilt(ss.butter(order, f, "low", fs=SR, output="sos"), x, axis=0)


def env_exp(n, decay):
    return np.exp(-np.arange(n) / (decay * SR))


def stereo(m, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([m * l * 1.414, m * r * 1.414], 1).astype(np.float32)


def attack(n, ms=3):
    k = int(ms / 1000 * SR); e = np.ones(n); e[:k] = np.linspace(0, 1, k); return e


# ---------------- Sound design ----------------
def thud(f0=58, dur=0.45, gain=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 + f0 * 1.6 * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.11)
    click = lp(rng.standard_normal(n) * env_exp(n, 0.006), 2500)
    return stereo((body * 0.9 + click * 0.35) * attack(n, 1) * gain)


def knock(gain=1.0, pan=0.0):
    n = int(0.25 * SR); t = np.arange(n) / SR
    m = sum(a * np.sin(2 * np.pi * f * t) * env_exp(n, d) for f, a, d in [(170, 1, .06), (410, .6, .035), (760, .35, .02)])
    m += bandpass(rng.standard_normal(n), 800, 3000) * env_exp(n, .008) * .4
    return stereo(m * attack(n, 1) * gain * .8, pan)


def pluck(freq, gain=1.0, pan=0.0):
    """Soft marimba-like note: the pad sheets 'land' on a scale."""
    n = int(0.55 * SR); t = np.arange(n) / SR
    m = np.sin(2 * np.pi * freq * t) * env_exp(n, .16) + .35 * np.sin(2 * np.pi * freq * 4.0 * t) * env_exp(n, .03) + .12 * np.sin(2 * np.pi * freq * 9.9 * t) * env_exp(n, .01)
    thump = np.sin(2 * np.pi * 90 * t) * env_exp(n, .03) * .5
    return stereo((m + thump) * attack(n, 2) * gain * .55, pan)


def drip(gain=1.0, pan=0.0, f0=650):
    n = int(0.16 * SR); t = np.arange(n) / SR
    f = f0 * (2.6 ** (np.clip(t / 0.045, 0, 1)))
    m = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, .035) * attack(n, 1)
    return stereo(m * gain * .5, pan)


def whoosh(dur=0.6, rise=True, gain=1.0, lo=250, hi=4000):
    n = int(dur * SR)
    noise = rng.standard_normal((n, 2))
    sweep = lp_sweep(noise, lo if rise else hi, hi if rise else lo, block=256)
    sweep = hp(sweep, 150)
    shape = np.sin(np.pi * np.linspace(0, 1, n)) ** (1.6 if rise else 2.4)
    if rise:
        shape = shape * np.linspace(.3, 1, n)
    return (sweep * shape[:, None] * gain * .22).astype(np.float32)


def suck(dur=0.7, gain=1.0):
    w = whoosh(dur, True, gain)
    ramp = np.linspace(0, 1, len(w)) ** 3
    return (w * ramp[:, None] * 1.6).astype(np.float32)


def squelch(dur=0.9, gain=1.0):
    n = int(dur * SR); out = np.zeros(n)
    noise = rng.standard_normal(n)
    for k, c in enumerate(np.geomspace(380, 1300, 6)):
        seg = slice(int(k * n / 6), int((k + 1) * n / 6))
        out[seg] = bandpass(noise[seg], c * .8, c * 1.25, 2)
    wob = .55 + .45 * np.sin(2 * np.pi * 9 * np.arange(n) / SR)
    return stereo(out * wob * np.sin(np.pi * np.linspace(0, 1, n)) * gain * .5)


def nope(gain=1.0):
    def tone(f, d):
        n = int(d * SR); t = np.arange(n) / SR
        sq = np.sign(np.sin(2 * np.pi * f * t))
        return lp(sq, 1800) * env_exp(n, d * .6) * attack(n, 2)
    m = np.concatenate([tone(560, .09), np.zeros(int(.02 * SR)), tone(400, .14)])
    return stereo(m * gain * .22)


def rustle(dur=0.8, gain=1.0):
    n = int(dur * SR); out = np.zeros((n, 2))
    for _ in range(int(dur * 70)):
        g = int(rng.uniform(.004, .02) * SR); i = rng.integers(0, n - g)
        burst = hp(rng.standard_normal(g), 2200) * np.hanning(g)
        p = rng.uniform(-.6, .6)
        out[i:i + g] += stereo(burst * rng.uniform(.2, 1), p)
    shape = np.sin(np.pi * np.linspace(0, 1, n)) ** .7
    return (out * shape[:, None] * gain * .35).astype(np.float32)


def shimmer(dur=1.4, gain=1.0):
    n = int(dur * SR); out = np.zeros((n, 2))
    for _ in range(int(dur * 260)):
        g = int(rng.uniform(.002, .007) * SR); i = rng.integers(0, n - g)
        grain = bandpass(rng.standard_normal(g), 4500, 11000) * np.hanning(g)
        out[i:i + g] += stereo(grain * rng.uniform(.1, .9), rng.uniform(-.8, .8))
    shape = np.minimum(1, np.linspace(0, 3, n)) * np.linspace(1, .4, n)
    return (out * shape[:, None] * gain * .3).astype(np.float32)


def impact(gain=1.0):
    n = int(1.6 * SR); t = np.arange(n) / SR
    f = 46 + 70 * np.exp(-t * 14)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, .35)
    crack = lp(rng.standard_normal(n), 3500) * env_exp(n, .05)
    return stereo((sub * 1.0 + crack * .5) * attack(n, 1) * gain * .9)


def bell(freq, dur=1.2, gain=1.0, pan=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    mod = 2.4 * env_exp(n, .2) * np.sin(2 * np.pi * freq * 3.5 * t)
    m = np.sin(2 * np.pi * freq * t + mod) * env_exp(n, dur / 3.5)
    return stereo(m * attack(n, 2) * gain * .3, pan)


def tink(gain=1.0):
    n = int(.4 * SR); t = np.arange(n) / SR
    m = np.sin(2 * np.pi * 2650 * t) * env_exp(n, .07) + .6 * np.sin(2 * np.pi * 4170 * t) * env_exp(n, .04) + .3 * np.sin(2 * np.pi * 6900 * t) * env_exp(n, .02)
    return stereo(m * attack(n, .5) * gain * .35, .25)


def squeak(gain=1.0):
    def one(d, f0, f1):
        n = int(d * SR); t = np.arange(n) / SR
        f = f0 + (f1 - f0) * np.sin(np.pi * np.linspace(0, 1, n)) + 25 * np.sin(2 * np.pi * 32 * t)
        ph = 2 * np.pi * np.cumsum(f) / SR
        m = np.sin(ph) + .35 * np.sin(2 * ph) + .2 * np.sin(3 * ph)
        return m * np.sin(np.pi * np.linspace(0, 1, n)) ** .5
    m = np.concatenate([one(.16, 950, 1500), np.zeros(int(.07 * SR)), one(.22, 1000, 1650)])
    return stereo(lp(m, 5000) * gain * .22, -.2)


def pop(gain=1.0):
    n = int(.09 * SR); t = np.arange(n) / SR
    f = 320 * (3 ** (t / .05))
    m = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, .03) * attack(n, 1)
    return stereo(m * gain * .45)


def reverb(x, wet=0.2, length=1.3):
    n = int(length * SR)
    ir = rng.standard_normal((n, 2)) * env_exp(n, length / 6)[:, None]
    ir = lp(ir, 6000); ir /= np.sqrt((ir ** 2).sum(0))
    y = np.stack([ss.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return (x + y * wet).astype(np.float32)


# ---------------- Voice ----------------
def peaking(f0, gain_db, q):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return np.array(b) / a[0], np.array(a) / a[0]


def compress(m, thresh_db=-22, ratio=3.0, att=.004, rel=.08):
    env = np.zeros_like(m); e = 0.0
    ca, cr = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    for i, v in enumerate(np.abs(m)):
        e = ca * e + (1 - ca) * v if v > e else cr * e + (1 - cr) * v
        env[i] = e
    db = 20 * np.log10(env + 1e-9)
    gr = np.minimum(0, (thresh_db - db) * (1 - 1 / ratio))
    return m * 10 ** (gr / 20)


def voice(path):
    a, sr = sf.read(path, dtype="float32")
    a = ss.resample_poly(a, SR // 1000, sr // 1000).astype(np.float64)
    a = hp(a, 85)
    b, c = peaking(3800, 3.0, .9); a = ss.lfilter(b, c, a)
    b, c = peaking(220, 1.5, 1.0); a = ss.lfilter(b, c, a)
    a = compress(a)
    a /= np.max(np.abs(a)) + 1e-9
    return stereo(a * .5)


# ---------------- Master ----------------
def vo_activity(vo_bus):
    act = np.abs(vo_bus).max(1)
    act = ss.sosfilt(ss.butter(1, 5, "low", fs=SR, output="sos"), (act > .015).astype(float))
    return np.clip(act * 1.8, 0, 1)


def duck(music, vo_bus, depth_db=12.0, mid_extra_db=6.0):
    """Broadband duck plus an extra dip in the speech band (1-4 kHz) while the voice talks."""
    act = vo_activity(vo_bus)
    mid = bandpass(music, 1000, 4000, 2)
    rest = music - mid
    g = 10 ** (-depth_db * act / 20)
    gm = 10 ** (-(depth_db + mid_extra_db) * act / 20)
    return rest * g[:, None] + mid * gm[:, None]


def limiter(x, ceiling_db=-1.0, look=.005, rel=.06):
    c = 10 ** (ceiling_db / 20); la = int(look * SR)
    peak = np.abs(x).max(1)
    need = np.minimum(1, c / (peak + 1e-9))
    need = ss.minimum_filter1d(need, la * 2 + 1) if hasattr(ss, "minimum_filter1d") else np.array([need[max(0, i - la):i + la + 1].min() for i in range(len(need))])
    g = np.empty_like(need); cur = 1.0; cr = np.exp(-1 / (rel * SR))
    for i, v in enumerate(need):
        cur = v if v < cur else cr * cur + (1 - cr) * v
        g[i] = cur
    return (x * g[:, None]).clip(-c, c)


def master(music, sfx, vo, dur):
    music = duck(music, vo) * 0.7
    sfx = reverb(sfx, .18) * 0.35
    sfx = sfx * (10 ** (-5 * vo_activity(vo) / 20))[:, None]
    mix = music + sfx + vo * 2.2
    meter = pyln.Meter(SR)
    lufs = meter.integrated_loudness(mix)
    mix = mix * 10 ** ((-14.0 - lufs) / 20)
    for _ in range(2):
        mix = limiter(mix, -1.0)
        lufs = meter.integrated_loudness(mix)
        mix = mix * 10 ** ((-14.0 - lufs) / 20)
    mix = limiter(mix, -1.0)
    n = int(dur * SR); mix = mix[:n]
    f = int(.35 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None]
    return mix, meter.integrated_loudness(mix)


# ---------------- Reels ----------------
def reel_safemark():
    BPM, B = 120, .5
    D = 24.0
    music, sfx, vo = silence(D + 2), silence(D + 2), silence(D + 2)
    L = lambda n, beats: load_loop(n, beats, BPM)
    beat, bass, chords = L("Glitter Nights Beat", 16), L("Glitter Nights Synth Bass 01", 16), L("Glitter Nights Synth Chords 01", 4)
    pad, hats, gtr = L("Glitter Nights Synth Pad", 16), L("Glitter Nights Hi-Hat Topper", 16), L("Glitter Nights Funk Guitar 01", 8)
    riser = L("80s Synth FX Riser 01", 8)
    # Intro: filtered pad opening up, hats creeping in, riser into the drop at 4.0
    intro = np.tile(pad, (1, 1))[: int(4 * SR)]
    place(music, lp_sweep(intro, 250, 5000) * np.linspace(.4, 1, len(intro))[:, None], 0, .75)
    place(music, lp_sweep(np.tile(hats, (1, 1))[int(2 * SR): int(4 * SR)], 800, 9000), 2.0, .35)
    place(music, riser[: int(4 * SR)] * np.linspace(0, 1, int(4 * SR))[:, None] ** 1.5, 0, .45)
    # Build
    loop_region(music, beat, 4.0, 19.5, .9)
    loop_region(music, bass, 4.0, 19.5, .8)
    loop_region(music, chords, 4.0, 19.5, .5)
    loop_region(music, hats, 12.0, 19.5, .45, fade_in=.05)
    loop_region(music, gtr, 12.0, 19.5, .45, fade_in=.05)
    loop_region(music, pad, 16.5, 19.5, .35, fade_in=.6)
    # Half-beat stop before the end hit, then the full groove for the end card
    loop_region(music, beat, 20.0, D + .5, .9)
    loop_region(music, bass, 20.0, D + .5, .8)
    loop_region(music, chords, 20.0, D + .5, .55)
    loop_region(music, pad, 20.0, D + .5, .4)
    loop_region(music, hats, 20.0, D + .5, .4)

    # Sound design, tied to the animation timeline
    place(sfx, whoosh(.55, True, .9), 0.0)
    place(sfx, suck(.7, .9), 3.3)
    S = [4.0, 6.5, 8.5, 12.0, 14.5, 16.5, 18.5, 20.0]
    place(sfx, thud(52, .5, 1.0), S[0] + .38)
    place(sfx, knock(.9, -.4), S[0] + .12 + .38)
    place(sfx, knock(.9, .4), S[0] + .24 + .38)
    A = [440.0, 554.37, 659.25, 739.99, 880.0, 987.77, 1108.73, 1318.5, 1479.98, 1760.0]  # A major pentatonic
    for i in range(10):
        place(sfx, pluck(A[i], .9, -.5 + i * .11), S[1] + i * .07 + .36)
    for k, tt in enumerate([8.75, 9.3, 9.65, 10.2, 10.55, 11.05, 11.4, 11.75]):
        place(sfx, drip(.9, rng.uniform(-.6, .6), rng.uniform(560, 760)), tt)
    for i in range(6):
        place(sfx, pluck(A[i + 2] * 2 / 2, .8, -.3 + i * .12), S[3] + i * .06 + .36)
    place(sfx, squelch(.95, 1.0), S[4] + .05)
    place(sfx, nope(1.0), S[4] + .55)
    place(sfx, whoosh(.5, True, .8, 300, 3000), S[5] - .25)
    place(sfx, thud(62, .4, .7), S[5] + .38)
    place(sfx, rustle(.9, 1.0), S[5] + .3)
    place(sfx, shimmer(1.4, 1.0), S[6] + .05)
    place(sfx, suck(.5, .6), S[7] - .5)
    place(sfx, impact(1.0), S[7])
    for k, f in enumerate([1318.5, 1760.0, 2217.5]):
        place(sfx, bell(f, 1.4, .8, -.3 + k * .3), S[7] + .25 + k * .09)

    # Voice
    for key, t in [("hook", .25), ("s1", 4.1), ("s2", 6.6), ("s3", 8.6), ("s4", 12.1), ("s5", 14.6), ("s6", 16.6), ("s7", 18.5), ("end", 20.15)]:
        place(vo, voice(f"vo/safemark-{key}.wav"), t)
    return master(music, sfx, vo, D)


def reel_models():
    BPM = 116; B = 60 / BPM
    HOOK, PER = 8 * B, 6 * B
    D = HOOK + 4 * PER + 8 * B
    music, sfx, vo = silence(D + 2), silence(D + 2), silence(D + 2)
    L = lambda n, beats: load_loop(n, beats, BPM)
    beat, bass, arp = L("Hang Tight Beat 01", 16), L("Hang Tight Synth Bass 02", 16), L("Hang Tight Synth Arp 01", 16)
    chords, hats, gtr = L("Hang Tight Chords 01", 8), L("Hang Tight Hi-Hat Topper", 8), L("Hang Tight Guitar 01", 16)
    rz, _ = sf.read(LOOPS + "Hang Tight Synth Riser FX.wav", dtype="float32", always_2d=True)
    intro = np.tile(chords, (2, 1))[: int(HOOK * SR)]
    place(music, lp_sweep(intro, 300, 6000) * np.linspace(.5, 1, len(intro))[:, None], 0, .7)
    seg = rz[-int(HOOK * SR):]
    place(music, seg * np.linspace(0, 1, len(seg))[:, None] ** 1.3, 0, .5)
    END = HOOK + 4 * PER
    loop_region(music, beat, HOOK, D + .5, .85)
    loop_region(music, bass, HOOK, D + .5, .75)
    loop_region(music, arp, HOOK, END, .45)
    loop_region(music, chords, HOOK, D + .5, .45)
    loop_region(music, hats, HOOK + 2 * PER, D + .5, .4, fade_in=.05)
    loop_region(music, gtr, HOOK + 2 * PER, D + .5, .35, fade_in=.05)

    place(sfx, whoosh(.6, True, .9), 0.0)
    place(sfx, impact(.7), HOOK)
    for k in range(4):
        t = HOOK + k * PER
        if k:
            place(sfx, whoosh(.45, True, .8, 300, 4000), t - .3)
        place(sfx, pop(.8), t + .02)
        if k in (0, 1):
            place(sfx, rustle(.7, .8), t + .1)
    place(sfx, tink(1.0), HOOK + 2 * PER + .45)
    place(sfx, tink(.5), HOOK + 2 * PER + .62)
    place(sfx, squeak(1.0), HOOK + 3 * PER + .55)
    place(sfx, suck(.5, .6), END - .5)
    place(sfx, impact(1.0), END)
    for k, f in enumerate([1318.5, 1661.2, 1975.5]):
        place(sfx, bell(f, 1.3, .8, -.3 + k * .3), END + .25 + k * .09)
    place(sfx, pop(.9), END + 1.1)

    for key, t in [("hook", .25), ("m1", HOOK + .15), ("m2", HOOK + PER + .15), ("m3", HOOK + 2 * PER + .15), ("m4", HOOK + 3 * PER + .15), ("end", END + .2)]:
        place(vo, voice(f"vo/models-{key}.wav"), t)
    return master(music, sfx, vo, D)


if __name__ == "__main__":
    which = sys.argv[1]
    mix, lufs = {"safemark": reel_safemark, "models": reel_models}[which]()
    import os; os.makedirs("out", exist_ok=True)
    sf.write(f"out/{which}.wav", mix, SR, subtype="PCM_24")
    print(which, "len", round(len(mix) / SR, 2), "LUFS", round(lufs, 2), "peak dB", round(20 * np.log10(np.abs(mix).max()), 2))
