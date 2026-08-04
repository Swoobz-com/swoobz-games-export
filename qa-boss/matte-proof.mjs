// Matte proof: composite keyed frames over BLACK and over WHITE (CHARACTER-CONTRACT §6).
// Black hides dark smoke; white hides chalk bodies and reveals chewed mattes — so BOTH must
// be looked at. Also reports the max green-dominance found (halo detector).
// Usage: node qa-boss/matte-proof.mjs <keyedDir> <outPrefix> <f1,f2,f3...>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');

const [dir, outPrefix, list] = process.argv.slice(2);
const idxs = list.split(',').map(Number);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();

for (const bg of [0, 255]) {
  const srcs = idxs.map((i) => PNG.sync.read(fs.readFileSync(path.join(dir, files[i]))));
  const w = srcs[0].width; const h = srcs[0].height;
  const out = new PNG({ width: w * srcs.length, height: h });
  out.data.fill(bg);
  for (let k = 0; k < srcs.length; k += 1) {
    const s = srcs[k];
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const si = (y * s.width + x) * 4;
        const di = (y * out.width + (k * w + x)) * 4;
        const a = s.data[si + 3] / 255;
        for (let c = 0; c < 3; c += 1) out.data[di + c] = Math.round(s.data[si + c] * a + bg * (1 - a));
        out.data[di + 3] = 255;
      }
    }
  }
  const f = `${outPrefix}-${bg === 0 ? 'black' : 'white'}.png`;
  fs.writeFileSync(f, PNG.sync.write(out));
  console.log('wrote', f, out.width + 'x' + out.height);
}

// halo scan across ALL frames
let worst = { g: 0, f: -1, n: 0 };
for (let n = 0; n < files.length; n += 1) {
  const p = PNG.sync.read(fs.readFileSync(path.join(dir, files[n])));
  let cnt = 0; let mx = 0;
  for (let i = 0; i < p.data.length; i += 4) {
    if (p.data[i + 3] < 16) continue;
    const g = p.data[i + 1] - Math.max(p.data[i], p.data[i + 2]);
    if (g > 12) { cnt += 1; if (g > mx) mx = g; }
  }
  if (cnt > worst.n) worst = { g: mx, f: n, n: cnt };
}
console.log(`green-dominant(>12) worst frame f${worst.f}: ${worst.n} px, max dominance ${worst.g}`);
