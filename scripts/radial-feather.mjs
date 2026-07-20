// Radial (curved-contour) feather for EFFECT clips whose content wants to exceed the source
// frame. The straight-band edge feather (edge-feather.mjs) softens the cut but keeps a STRAIGHT
// fade contour, which the eye still reads as "the animation ends at an invisible box"
// (phase 14, Tim's outthebox report x2). This tool fades alpha along an ASYMMETRIC ELLIPSE
// centered on the character instead, so a ring/arc effect thins along its own curvature.
//
// alpha *= 1 - smoothstep(bandStart, bandEnd, s) where s = normalized elliptical radius from
// (cx, cy) with rx / ryUp / ryDown (asymmetric vertically so planted feet at bottom-center stay
// protected). A small straight safety ramp (--safety N px, default 12) still zeroes the literal
// frame edge so no pixel ever touches the boundary.
//
// Usage: node scripts/radial-feather.mjs <framesDir> [--cx 0.5] [--cy 0.56] [--rx 0.53]
//        [--ryUp 0.61] [--ryDown 0.68] [--bandStart 0.78] [--bandEnd 1.02] [--safety 12]
//   cx/cy are fractions of W/H; rx fraction of W; ryUp/ryDown fractions of H.
//   Verify after with the inset-ring profile AND a viewed composite over dark: the fade must
//   follow a curve, never a straight line.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const dir = argv[0];
const opt = { cx: 0.5, cy: 0.56, rx: 0.53, ryUp: 0.61, ryDown: 0.68, bandStart: 0.78, bandEnd: 1.02, safety: 12 };
for (let i = 1; i < argv.length; i += 2) {
  const k = argv[i].replace('--', '');
  if (!(k in opt)) throw new Error(`unknown option ${argv[i]}`);
  opt[k] = Number(argv[i + 1]);
}

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
let touched = 0;
for (const f of files) {
  const p = path.join(dir, f);
  const png = PNG.sync.read(fs.readFileSync(p));
  const { width: W, height: H, data: d } = png;
  const cx = opt.cx * W;
  const cy = opt.cy * H;
  const rx = opt.rx * W;
  const ryUp = opt.ryUp * H;
  const ryDown = opt.ryDown * H;
  let changed = false;
  for (let y = 0; y < H; y++) {
    const dy = y - cy;
    const ry = dy < 0 ? ryUp : ryDown;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = d[i + 3];
      if (a === 0) continue;
      const dx = x - cx;
      const s = Math.sqrt((dx / rx) * (dx / rx) + (dy / ry) * (dy / ry));
      // curved falloff
      let m = 1 - smooth((s - opt.bandStart) / (opt.bandEnd - opt.bandStart));
      // straight safety ramp: nothing may touch the literal frame edge
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (edge < opt.safety) m = Math.min(m, smooth(edge / opt.safety));
      if (m < 1) {
        const na = Math.round(a * m);
        if (na !== a) {
          d[i + 3] = na;
          changed = true;
        }
      }
    }
  }
  if (changed) {
    fs.writeFileSync(p, PNG.sync.write(png));
    touched += 1;
  }
}
console.log(`radial-feathered ${touched}/${files.length} frames in ${dir} (${JSON.stringify(opt)})`);
