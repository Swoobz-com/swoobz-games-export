import sys, os, json
from PIL import Image
import numpy as np

def rel_lum(rgb):
    def f(c):
        cs = c / 255.0
        return cs/12.92 if cs <= 0.03928 else ((cs+0.055)/1.055) ** 2.4
    r, g, b = rgb
    rl, gl, bl = f(r), f(g), f(b)
    return 0.2126*rl + 0.7152*gl + 0.0722*bl

def contrast(c1, c2):
    L1, L2 = rel_lum(c1), rel_lum(c2)
    hi, lo = max(L1, L2), min(L1, L2)
    return (hi + 0.05) / (lo + 0.05)

def analyze(path, top_n=12):
    img = Image.open(path).convert('RGB')
    arr = np.array(img).reshape(-1, 3)
    # Quantize lightly to merge anti-aliasing noise into clusters.
    q = (arr // 8 * 8)
    colors, counts = np.unique(q.reshape(-1,3), axis=0, return_counts=True)
    order = np.argsort(-counts)
    colors = colors[order][:top_n]
    counts = counts[order][:top_n]
    total = arr.shape[0]
    clusters = [{'rgb': tuple(int(x) for x in c), 'frac': float(cnt)/total} for c, cnt in zip(colors, counts)]
    return clusters

def main():
    path = sys.argv[1]
    min_frac = float(sys.argv[2]) if len(sys.argv) > 2 else 0.006
    clusters = analyze(path)
    # Background = most frequent cluster (text occupies a minority of a padded crop).
    bg = clusters[0]
    # Foreground = among non-trivial clusters (>=min_frac, excludes single-pixel/
    # AA-fringe noise), the one with MAXIMUM luminance distance from the
    # background — the true glyph-fill color, not just "2nd most frequent"
    # (which on a gradient background is often just another background shade).
    fg_candidates = [c for c in clusters[1:] if c['frac'] >= min_frac]
    if not fg_candidates:
        fg_candidates = clusters[1:]
    best = None
    for c in fg_candidates:
        r = contrast(bg['rgb'], c['rgb'])
        if best is None or r > best[1]:
            best = (c, r)
    result = {
        'file': path,
        'bg': bg,
        'clusters': clusters,
        'fg_best': best[0] if best else None,
        'contrast': best[1] if best else None,
    }
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
