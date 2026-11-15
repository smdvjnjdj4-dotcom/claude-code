"""VYBE promo soundtrack + sound design, synthesised from scratch (no samples, no third-party music). 48 kHz stereo."""
import numpy as np, wave, sys
SR = 48000; DUR = 61.0; N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR

def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if j <= i: return
    s = sig[: j - i] * gain
    L[i:j] += s * (1 - max(0, pan)); R[i:j] += s * (1 + min(0, pan))

def env(n, a=0.005, r=0.2, sustain=None):
    e = np.ones(n); ai = max(1, int(a * SR)); e[:ai] = np.linspace(0, 1, ai)
    if sustain is None: e[ai:] = np.exp(-np.arange(n - ai) / (r * SR))
    return e

def lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.empty_like(x); acc = 0.0
    for k in range(len(x)): acc = (1 - a) * x[k] + a * acc; y[k] = acc
    return y

def lp_fast(x, cutoff):  # vectorised-ish one-pole via scipy-free cumulative trick on chunks
    a = np.exp(-2 * np.pi * cutoff / SR)
    from numpy.lib.stride_tricks import sliding_window_view  # noqa
    y = np.empty_like(x); acc = 0.0
    for k in range(0, len(x), 4096):
        seg = x[k:k+4096]; out = np.empty_like(seg)
        for m in range(len(seg)): acc = (1 - a) * seg[m] + a * acc; out[m] = acc
        y[k:k+4096] = out
    return y

hz = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---------------------------------------------------------------- music (120 BPM, Am – F – C – G, 2 s per chord)
CH = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]
ROOT = [45, 41, 48, 43]
def pad_note(m, dur, bright):
    n = int(dur * SR); tt = np.arange(n) / SR; f = hz(m); s = np.zeros(n)
    for h, a in [(1, 1), (2, .45), (3, .22), (4, .1), (5, .06)]:
        for det in (-0.12, 0.12):
            s += a * bright ** (h - 1) * np.sin(2 * np.pi * f * h * (1 + det / 100) * tt + h)
    e = np.minimum(1, tt / 0.6) * np.minimum(1, (dur - tt) / 0.6)
    return s * e * 0.05

def section_level(t):  # music intensity curve
    if t < 2.8: return 0.0
    if t < 5: return 0.35
    if t < 13: return 0.55
    if t < 32: return 0.8
    if t < 35: return 0.5
    if t < 47: return 0.85
    if t < 51: return 0.95
    if t < 54.5: return 1.0
    if t < 55.4: return 0.25
    if t < 58: return 1.0
    return 0.0

for bar in range(30):
    t0 = 1.0 + bar * 2.0
    if t0 >= 58: break
    c = bar % 4; lvl = section_level(t0 + 0.1)
    if lvl == 0: continue
    for m in CH[c]:
        add(pad_note(m, 2.4, 0.55 + 0.25 * lvl), t0, lvl, pan=rng.uniform(-.4, .4))
    # sub bass
    if t0 >= 5:
        n = int(2.0 * SR); tt = np.arange(n) / SR
        b = np.sin(2 * np.pi * hz(ROOT[c] - 12) * tt) * np.minimum(1, tt / .02) * np.minimum(1, (2 - tt) / .05)
        add(b * 0.22 * lvl, t0)

def kick():
    n = int(0.45 * SR); tt = np.arange(n) / SR
    f = 48 + 120 * np.exp(-tt * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9) * 0.9
def hat():
    n = int(0.06 * SR); x = rng.standard_normal(n); x = x - np.concatenate([[0], x[:-1]])
    return x * np.exp(-np.arange(n) / (0.012 * SR)) * 0.08
def snare():
    n = int(0.25 * SR); tt = np.arange(n) / SR
    return (rng.standard_normal(n) * 0.5 + np.sin(2 * np.pi * 190 * tt)) * np.exp(-tt * 18) * 0.25
K, H, SN = kick(), hat(), snare()
beat = 0.5
for i in range(int(60 / beat)):
    t = 1.0 + i * beat
    if t >= 58: break
    lvl = section_level(t)
    if 5 <= t < 13 and i % 2 == 0: add(K, t, 0.55)
    if (13 <= t < 32 or 35 <= t < 51 or 51 <= t < 54.5 or 55.4 <= t < 58): add(K, t, 0.75 * lvl)
    if (13 <= t < 32 or 35 <= t < 54.5) and i % 4 == 2: add(SN, t, 0.6)
    if 23 <= t < 32 or 39 <= t < 54.5:
        add(H, t + 0.25, 1.0, pan=0.3); add(H, t, 0.5, pan=-0.3)

# ---------------------------------------------------------------- sound design
def whoosh(d=0.7, up=True):
    n = int(d * SR); x = rng.standard_normal(n); tt = np.arange(n) / SR
    cut = np.linspace(400, 6000, n) if up else np.linspace(6000, 400, n)
    y = np.empty(n); acc = 0.0
    for k in range(n):
        a = np.exp(-2 * np.pi * cut[k] / SR); acc = (1 - a) * x[k] + a * acc; y[k] = acc
    e = np.sin(np.pi * tt / d) ** 2
    return y * e * 0.5
def impact():
    n = int(1.6 * SR); tt = np.arange(n) / SR
    f = 35 + 90 * np.exp(-tt * 12)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.6)
    return (body + rng.standard_normal(n) * np.exp(-tt * 20) * 0.25) * 0.9
def blip(f=1200, d=0.12):
    n = int(d * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 40) * 0.35
def ding(f=1568):
    n = int(0.6 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.01 * tt)) * np.exp(-tt * 7) * 0.22
def click():
    n = int(0.03 * SR); return rng.standard_normal(n) * np.exp(-np.arange(n) / (0.003 * SR)) * 0.25
def levelup():
    s = np.zeros(int(1.4 * SR))
    for k, m in enumerate([72, 76, 79, 84, 88]):
        d = ding(hz(m)); i = int(k * 0.07 * SR); s[i:i + len(d)] += d[: len(s) - i]
    return s
def riser(d=4.0):
    n = int(d * SR); tt = np.arange(n) / SR
    f = 200 + 1600 * (tt / d) ** 2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.08
    noise = rng.standard_normal(n) * 0.05
    return (tone + noise) * (tt / d) ** 2

add(blip(880, .25), 0.35, 0.6); add(blip(1320, .2), 1.15, 0.35)
add(riser(2.0), 1.35, 0.8)
add(impact(), 3.35, 1.0); add(whoosh(.6), 3.25, .7)
add(whoosh(.5), 4.7, .6)
for k, tk in enumerate([5.7, 7.15, 8.6]):
    add(click(), tk, 1.0); add(ding(1568 + k * 220), tk + 0.08, 0.9, pan=(-.3, 0, .3)[k])
add(blip(1760, .15), 10.4, .5)
for ts in [12.9, 23.0, 32.2, 35.2, 42.0]: add(whoosh(.7), ts - 0.3, .65, pan=rng.uniform(-.3, .3))
for i in range(6): add(blip(900 + i * 140, .1), 16.4 + i * .38, .45, pan=-.5 + i * .2)
add(riser(1.6), 18.7, .6); add(impact(), 20.25, .8); add(levelup(), 20.3, 1.0)
for tk in [23.9, 25.4, 25.9, 27.1, 29.0, 30.8]: add(click(), tk, 1.0); add(ding(1975), tk + 0.05, .55)
add(levelup(), 30.85, .7)
for tk in [32.3, 32.6, 32.9]: add(blip(700, .2), tk, .4)
add(ding(2093), 34.45, .9); add(blip(1400), 34.5, .5)
for tk in [36.8, 38.4, 40.3]: add(whoosh(.35, False), tk - .15, .4)
for tk in [40.9, 41.4]: add(click(), tk, .9)
add(riser(4.0), 47.0, 1.0); add(whoosh(1.0), 50.2, .8)
add(impact(), 51.0, 1.0); add(impact(), 52.5, .7); add(levelup(), 52.5, 1.0)
add(impact(), 55.35, 1.0)
add(impact(), 58.35, .9); add(ding(1047), 58.4, .7); add(ding(1568), 58.75, .5)

# ---------------------------------------------------------------- master
fade = np.ones(N); fi = int(60.2 * SR); fade[fi:] = np.linspace(1, 0, N - fi)
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / peak * 1.4) / np.tanh(1.4) * 0.89; R = np.tanh(R / peak * 1.4) / np.tanh(1.4) * 0.89
out = (np.stack([L, R], 1) * 32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'VYBE_SOUNDTRACK.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('ok', out.shape)
