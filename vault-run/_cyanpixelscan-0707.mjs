import { PNG } from 'pngjs';
import fs from 'fs';

const files = [
  'shots-brandcohesion-0707/01-betentry-bluechips-1440.png',
  'shots-brandcohesion-0707/02-betentry-altseason-1440.png',
  'shots-brandcohesion-0707/02-betentry-shitcoin-1440.png',
  'shots-brandcohesion-0707b/01-betentry-shitcoin.png',
  'shots-brandcohesion-0707b/02-settled-LOSS-hero-visible.png',
  'shots-brandcohesion-0707c/attempt0-WIN-hero.png',
  'probe-boardxy.png',
];

for (const f of files) {
  if (!fs.existsSync(f)) { console.log(f, 'MISSING'); continue; }
  const png = PNG.sync.read(fs.readFileSync(f));
  let cyanCount = 0;
  const samples = [];
  for (let y = 0; y < png.height; y += 2) {
    for (let x = 0; x < png.width; x += 2) {
      const idx = (png.width * y + x) << 2;
      const r = png.data[idx], g = png.data[idx+1], b = png.data[idx+2];
      // cyan-ish: matches the actual banned tokens (#00F0FF/#29E6FF/#00D0DE family) -
      // near-zero/low red, high green+blue, saturated (not pale sky-blue decoration).
      if (b > 190 && g > 160 && r < 70 && (b - r) > 150 && (g - r) > 90) {
        cyanCount++;
        if (samples.length < 5) samples.push({ x, y, r, g, b });
      }
    }
  }
  console.log(f, '-> cyan-ish px (sampled every 2px):', cyanCount, JSON.stringify(samples));
}
