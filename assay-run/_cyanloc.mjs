import { PNG } from 'pngjs'
import fs from 'node:fs'
const png = PNG.sync.read(Buffer.from(fs.readFileSync('shots-codotty-lum-mobile.png')))
let cyan=0; const ys={}; const locs=[]
for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++){const i=(y*png.width+x)*4;const r=png.data[i],g=png.data[i+1],b=png.data[i+2];const chroma=Math.max(r,g,b)-Math.min(r,g,b);if(b>100&&b>=g-5&&g>r+30&&b>r+45&&chroma>45&&r<170){cyan++;const yb=Math.floor(y/40)*40;ys[yb]=(ys[yb]||0)+1;if(locs.length<10)locs.push([x,y,r,g,b])}}
console.log('total',cyan);console.log('by y-band:',JSON.stringify(ys));console.log('samples[x,y,r,g,b]:',JSON.stringify(locs))
