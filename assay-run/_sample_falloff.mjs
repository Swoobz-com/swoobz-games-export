import { PNG } from 'pngjs'
import fs from 'node:fs'
const png = PNG.sync.read(fs.readFileSync('shots-artotty-rescore-0705/d1440-03-trail.png'))
const { width:W, data } = png
// avg luminance over a small gold-dome patch
function patch(cx,cy,rad=8){let s=0,n=0;for(let y=cy-rad;y<=cy+rad;y++)for(let x=cx-rad;x<=cx+rad;x++){const i=(y*W+x)*4;s+=0.299*data[i]+0.587*data[i+1]+0.114*data[i+2];n++}return Math.round(s/n)}
// board discs ~ centers: UL first disc ~ (340,128); UR ~(815,128); LL ~(340,608); LR ~(815,608); center ~(578,368)
const P = {
 'UL disc (340,128)':patch(340,128),
 'UR disc (815,128)':patch(815,128),
 'center disc (578,368)':patch(578,368),
 'LL disc (340,608)':patch(340,608),
 'LR disc (815,608)':patch(815,608),
}
for(const [k,v] of Object.entries(P))console.log(k.padEnd(26),'domeLum',v)
console.log('UL-vs-LR delta:', P['UL disc (340,128)']-P['LR disc (815,608)'])
