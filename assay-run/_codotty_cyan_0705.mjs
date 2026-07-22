import { PNG } from 'pngjs'
import fs from 'node:fs'
// True cyan = blue-dominant blue-green, clearly off-red, real chroma. EXCLUDES
// the intentional §7 jade (green-dominant, g>b) and warm gold/amber.
function scan(file) {
  const png = PNG.sync.read(Buffer.from(fs.readFileSync(file)))
  let cyan = 0, jade = 0
  const sample = []
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2]
    const chroma = Math.max(r, g, b) - Math.min(r, g, b)
    // true cyan: blue at least matches green, both well above red
    if (b > 100 && b >= g - 5 && g > r + 30 && b > r + 45 && chroma > 45 && r < 170) {
      cyan++; if (sample.length < 6) sample.push([r, g, b])
    }
    // intentional jade (green-dominant): reported separately, NOT a violation
    if (g > 110 && g > b + 20 && g > r + 60 && chroma > 60) jade++
  }
  console.log(`${file}: TRUE-CYAN px=${cyan}  (jade §7 px=${jade}, expected>0)`, sample.length ? 'cyan-samples:' + JSON.stringify(sample) : '')
}
for (const f of ['shots-codotty-lum-desktop.png', 'shots-codotty-settled.png', 'shots-codotty-lum-mobile.png', 'shots-codotty-midreveal.png']) {
  try { scan(f) } catch (e) { console.log(f, 'skip', e.message) }
}
