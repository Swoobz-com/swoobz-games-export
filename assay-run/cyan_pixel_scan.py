import sys, glob
from PIL import Image
import numpy as np

files = sys.argv[1:] if len(sys.argv) > 1 else sorted(glob.glob('shots-FINAL-0704/0*.png'))

# Loose "cyan family" mask matching the accent-API cyan/volt tokens
# volt #00F0FF = (0,240,255), cyan #29E6FF = (41,230,255)
# Loose test: G and B both high, R distinctly lower than G and B, G/B reasonably close (blue-green, not pure blue, not green, not white)
def cyan_mask(arr):
    r = arr[..., 0].astype(int)
    g = arr[..., 1].astype(int)
    b = arr[..., 2].astype(int)
    a = arr[..., 3].astype(int) if arr.shape[-1] == 4 else np.full(r.shape, 255)
    mask = (
        (a > 20) &
        (g > 140) & (b > 140) &
        (r < g - 40) & (r < b - 40) &
        (np.abs(g.astype(int) - b.astype(int)) < 70)
    )
    return mask

results = []
for f in files:
    im = Image.open(f).convert('RGBA')
    arr = np.array(im)
    mask = cyan_mask(arr)
    count = int(mask.sum())
    total = arr.shape[0] * arr.shape[1]
    ys, xs = np.where(mask)
    sample_pixels = []
    if count > 0:
        # sample up to 8 distinct hit locations + their RGB
        idxs = np.linspace(0, count - 1, min(8, count)).astype(int)
        for i in idxs:
            y, x = ys[i], xs[i]
            sample_pixels.append({'xy': (int(x), int(y)), 'rgb': tuple(int(v) for v in arr[y, x][:3])})
    results.append((f, count, total, round(100*count/total, 5), sample_pixels))

for f, count, total, pct, samples in results:
    print(f"{f}: cyan-family pixels={count}/{total} ({pct}%)")
    for s in samples:
        print(f"    at {s['xy']} rgb={s['rgb']}")
