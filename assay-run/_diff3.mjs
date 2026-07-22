import { PNG } from 'pngjs'
import fs from 'node:fs'
function load(p) { return PNG.sync.read(fs.readFileSync(p)) }
function meanAbsDiff(a, b) {
  let sum = 0, n = Math.min(a.data.length, b.data.length)
  for (let i = 0; i < n; i += 4) {
    sum += Math.abs(a.data[i]-b.data[i]) + Math.abs(a.data[i+1]-b.data[i+1]) + Math.abs(a.data[i+2]-b.data[i+2])
  }
  return sum / (n/4) / 3
}
const A = load('shots-evenboard-visreg-0706/desktop-flare-A-before.png')
const B = load('shots-evenboard-visreg-0706/desktop-flare-B-peak.png')
const C = load('shots-evenboard-visreg-0706/desktop-flare-C-settled.png')
console.log('A vs B (before vs peak):', meanAbsDiff(A,B).toFixed(3))
console.log('A vs C (before vs settled):', meanAbsDiff(A,C).toFixed(3))
console.log('B vs C (peak vs settled):', meanAbsDiff(B,C).toFixed(3))
