// prep-arenas.mjs — transcode Tim's 10 clean per-node arena backgrounds
// (input/characters/background/map 1..10/*.png, 2752x1536, NO baked HUD) to
// public/assets/arenas/<id>.webp (kept at native 2752x1536, libwebp q85).
//
// DETERMINISTIC: fixed source->id mapping, fixed encoder settings, no timestamps.
// Re-running overwrites byte-for-byte-equivalent outputs. Prints per-file KB.
//
// Run: node scripts/prep-arenas.mjs   (ffmpeg must be on PATH)

import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC_DIR = join(ROOT, 'input', 'characters', 'background');
const OUT_DIR = join(ROOT, 'public', 'assets', 'arenas');

// source file (under SRC_DIR/<mapDir>) -> arena id. Order = campaign node order (1..10).
const ARENAS = [
  { mapDir: 'map 1', src: 'KUROHAMA_DOCKS_04_Lantern_Jetty.png', id: 'docks' },
  { mapDir: 'map 2', src: 'ASHEN_TORII_03_Ash_Garden_Court.png', id: 'torii' },
  { mapDir: 'map 3', src: 'WHISPERING_BAMBOO_04_Stream_Through_Bamboo.png', id: 'bamboo' },
  { mapDir: 'map 4', src: 'SNOWFANG_PASS_05_Torchlit_Night_Pass.png', id: 'snowfang' },
  { mapDir: 'map 5', src: 'KAWA_CROSSING_02_Riverbank_Ford.png', id: 'kawa' },
  { mapDir: 'map 6', src: 'HOLLOW_SHRINE_01_Hollow_Bell_Courtyard.png', id: 'shrine' },
  { mapDir: 'map 7', src: 'BURNED_PAGODA_04_Night_Ember_Pagoda.png', id: 'pagoda' },
  { mapDir: 'map 8', src: 'RED_MIST_GORGE_03_Mist_Floor_Basin.png', id: 'gorge' },
  { mapDir: 'map 9', src: 'Abyss Blue Moat Bridge.png', id: 'moat' },
  { mapDir: 'map 10', src: 'Scarlet Banner Inner Sanctum.png', id: 'sanctum' },
];

// q85 unless overridden per-id (Task 10: any single file >~800KB drops to q80).
const QUALITY = { default: 85 };

mkdirSync(OUT_DIR, { recursive: true });

let total = 0;
for (const { mapDir, src, id } of ARENAS) {
  const srcPath = join(SRC_DIR, mapDir, src);
  if (!existsSync(srcPath)) {
    console.error(`MISSING SOURCE: ${srcPath}`);
    process.exitCode = 1;
    continue;
  }
  const outPath = join(OUT_DIR, `${id}.webp`);
  const q = QUALITY[id] ?? QUALITY.default;
  execFileSync(
    'ffmpeg',
    ['-y', '-i', srcPath, '-c:v', 'libwebp', '-lossless', '0', '-q:v', String(q), '-frames:v', '1', outPath],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  const kb = statSync(outPath).size / 1024;
  total += kb;
  console.log(`${id.padEnd(9)} q${q}  ${kb.toFixed(1).padStart(8)} KB   <- ${mapDir}/${src}`);
}
console.log(`------\nTOTAL  ${total.toFixed(1)} KB (${(total / 1024).toFixed(2)} MB) across ${ARENAS.length} arenas`);
