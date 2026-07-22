import { PNG } from 'pngjs'
import fs from 'node:fs'
function load(p) { return PNG.sync.read(fs.readFileSync(p)) }
function lum(r,g,b){ return 0.2126*r+0.7152*g+0.0722*b }
function patchMean(png, x0, y0, w, h) {
  let sum=0, n=0
  for (let y=y0; y<y0+h; y++) for (let x=x0; x<x0+w; x++) {
    const i=(y*png.width+x)*4
    sum += lum(png.data[i],png.data[i+1],png.data[i+2]); n++
  }
  return sum/n
}
const A = load('shots-evenboard-visreg-0706/desktop-flare-A-before.png')
const B = load('shots-evenboard-visreg-0706/desktop-flare-B-peak.png')
const C = load('shots-evenboard-visreg-0706/desktop-flare-C-settled.png')
// crop is 6 tiles wide/tall, clicked tile center approx at crop-local (94.5,94.5), tile~37.8px
const tile = 227/6
const cx = 2*tile + tile/2, cy = 2*tile + tile/2
// sample rings at several radii (in px) around the click point, EXCLUDING the
// immediate clicked-tile cell itself (persistent ring/seal live there) —
// SUB_FLARE_R_MULT=2.6 means its radius = 2.6*tile ~ 98px, so probe at 1.3-1.8 tiles out.
const offsets = [1.0, 1.3, 1.6, 1.9, 2.2, 2.6, 3.0].map(m => Math.round(m*tile))
for (const off of offsets) {
  const x0 = Math.max(0, Math.round(cx+off-6)), y0 = Math.max(0, Math.round(cy-6))
  const w = 12, h = 12
  const a = patchMean(A, x0, y0, w, h), b = patchMean(B, x0, y0, w, h), c = patchMean(C, x0, y0, w, h)
  console.log(`offset=${off}px (~${(off/tile).toFixed(1)} tiles)  before=${a.toFixed(2)}  peak=${b.toFixed(2)} (Δ=${(b-a).toFixed(2)})  settled=${c.toFixed(2)} (Δvsbefore=${(c-a).toFixed(2)})`)
}
