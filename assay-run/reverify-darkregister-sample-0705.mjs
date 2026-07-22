import { PNG } from 'pngjs'
import fs from 'node:fs'

const file = process.argv[2] || 'shots-reverify-darkregister-0705/desktop-1440x900-01-lobby.png'
const png = PNG.sync.read(fs.readFileSync(file))
const { width: w, height: h, data } = png

function px(x, y) {
  const i = (w * y + x) << 2
  return [data[i], data[i + 1], data[i + 2]]
}
function lum(x0, y0, bw, bh) {
  let s = 0, n = 0, mx = 0
  const rgbSum = [0, 0, 0]
  for (let y = y0; y < y0 + bh; y++) {
    for (let x = x0; x < x0 + bw; x++) {
      const [r, g, b] = px(x, y)
      const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      s += L; n++
      if (L > mx) mx = L
      rgbSum[0] += r; rgbSum[1] += g; rgbSum[2] += b
    }
  }
  const avgRGB = rgbSum.map((v) => Math.round(v / n))
  return { mean: +(s / n).toFixed(3), max: +mx.toFixed(3), avgRGB: `rgb(${avgRGB.join(',')})` }
}

console.log('file:', file, 'dims:', w, 'x', h)
console.log('')
console.log('-- MID-FRAME AMBIENT ZONES (gap between temple silhouette and card, no torch flame, no coins) --')
const zones = {
  'L-gap upper (x265-420,y40-140)': lum(265, 40, 155, 100),
  'L-gap mid (x265-420,y300-500)': lum(265, 300, 155, 200),
  'L-gap lower (x265-420,y650-850)': lum(265, 650, 155, 200),
  'R-gap upper (x1010-1170,y40-140)': lum(1010, 40, 160, 100),
  'R-gap mid (x1010-1170,y300-500)': lum(1010, 300, 160, 200),
  'R-gap lower (x1010-1170,y650-850)': lum(1010, 650, 160, 200),
  'top band full-width (x400-1040,y2-18)': lum(400, 2, 640, 16),
  'far outer L-margin (x2-40,y400-700)': lum(2, 400, 38, 300),
  'far outer R-margin (x1398-1438,y400-700)': lum(1398, 400, 40, 300),
}
for (const [k, v] of Object.entries(zones)) {
  console.log(`  ${k.padEnd(48)} mean=${v.mean}  max=${v.max}  ${v.avgRGB}`)
}

console.log('')
console.log('-- TRUE CORNERS (reference darkest) --')
const corners = {
  topLeft: lum(2, 2, 30, 30),
  topRight: lum(w - 32, 2, 30, 30),
  bottomLeft: lum(2, h - 32, 30, 30),
  bottomRight: lum(w - 32, h - 32, 30, 30),
}
for (const [k, v] of Object.entries(corners)) {
  console.log(`  ${k.padEnd(48)} mean=${v.mean}  max=${v.max}  ${v.avgRGB}`)
}

console.log('')
console.log('-- BOUNDED WARM ACCENTS (should be warmer than ambient, this is expected/allowed) --')
const accents = {
  'L torch flame core (x140-165,y175-205)': lum(140, 175, 25, 30),
  'L torch pool glow (x90-210,y140-260)': lum(90, 140, 120, 120),
  'R torch flame core (x1278-1303,y175-205)': lum(1278, 175, 25, 30),
  'board coins sample (x460-985,y110-620)': lum(460, 110, 525, 510),
}
for (const [k, v] of Object.entries(accents)) {
  console.log(`  ${k.padEnd(48)} mean=${v.mean}  max=${v.max}  ${v.avgRGB}`)
}
