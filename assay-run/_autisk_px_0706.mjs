import { PNG } from 'pngjs'
import { readFileSync } from 'node:fs'
const px = (f, pts) => { const p = PNG.sync.read(readFileSync(f)); return pts.map(([x,y,l])=>{ const i=(p.width*y+x)*4; return `${l}: rgb(${p.data[i]},${p.data[i+1]},${p.data[i+2]}) @${x},${y}` }) }
const base='autisk-reverify-0706/'
// WON banner "SECURED THE HAUL" is around x=310-505 y=708 in d4 (1440 wide)
console.log('== d4-settled-WON banner text pixels ==')
for (const l of px(base+'d4-settled-WON.png', [[330,710,'SEC-1'],[360,710,'SEC-2'],[420,710,'SEC-3'],[470,710,'SEC-4'],[812,725,'PAYOUT#']])) console.log(l)
console.log('== d1 entry hero wordmark (ABYSS LINE big ~ y=672) ==')
for (const l of px(base+'d1-entry.png', [[600,672,'A'],[650,672,'B'],[760,672,'L-in-LINE'],[820,672,'N']])) console.log(l)
console.log('== d2 control panel border (steel-blue?) ==')
for (const l of px(base+'d2-plot-1cell-disabledCTA.png', [[888,120,'panelBorderL'],[1010,55,'depthCardTop'],[905,270,'claimLineLbl']])) console.log(l)
