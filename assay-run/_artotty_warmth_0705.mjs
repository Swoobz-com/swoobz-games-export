import fs from 'node:fs'
import { PNG } from 'pngjs'

const png = (p) => PNG.sync.read(fs.readFileSync(p))
// avg RGB + luma over a box
function sample(img, x, y, w, h) {
  let r = 0, g = 0, b = 0, n = 0, maxL = 0
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    const o = (img.width * j + i) * 4
    r += img.data[o]; g += img.data[o + 1]; b += img.data[o + 2]; n++
    const L = 0.299 * img.data[o] + 0.587 * img.data[o + 1] + 0.114 * img.data[o + 2]
    if (L > maxL) maxL = L
  }
  r /= n; g /= n; b /= n
  const L = 0.299 * r + 0.587 * g + 0.114 * b
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), L: Math.round(L), maxL: Math.round(maxL) }
}

const D = 'shots-artotty-dark-0705/'
const plan = png(D + 'd1440-02-planning.png')
console.log('=== DESKTOP 1440 planning (', plan.width, 'x', plan.height, ') ===')
const probes = {
  'L-margin mid (150,400)': [130, 380, 60, 60],
  'L-margin torchpool (140,180)': [110, 150, 60, 60],
  'R-margin mid (1290,400)': [1260, 380, 60, 60],
  'top-center sky (720,10)': [690, 4, 60, 20],
  'TL corner (5,5)': [2, 2, 40, 40],
  'BR corner (1435,895)': [1395, 855, 40, 40],
  'board bed between coins (350,500)': [345, 495, 12, 12],
  'board bed center (580,400)': [575, 395, 10, 10],
  'coin peak (330,120)': [318, 108, 28, 28],
  'temple silhouette L (110,550)': [90, 520, 50, 50],
}
for (const [k, [x, y, w, h]] of Object.entries(probes)) {
  const s = sample(plan, x, y, w, h)
  const warm = s.r - s.b
  console.log(`${k.padEnd(34)} rgb(${s.r},${s.g},${s.b}) L=${s.L} maxL=${s.maxL} warm(r-b)=${warm}`)
}
