import { PNG } from 'pngjs'
import fs from 'node:fs'
const png = PNG.sync.read(Buffer.from(fs.readFileSync('shots-codotty-lum-desktop.png')))
function lum(x0,y0,w,h){let s=0,n=0,mx=0;for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const i=(y*png.width+x)*4;const L=(0.2126*png.data[i]+0.7152*png.data[i+1]+0.0722*png.data[i+2])/255;s+=L;n++;if(L>mx)mx=L}return{mean:+(s/n).toFixed(3),max:+mx.toFixed(3)}}
const R={
 'L-margin PURE ambient (x12-42,y150-360)':lum(12,150,30,210),
 'R-margin PURE ambient (x1398-1428,y150-360)':lum(1398,150,30,210),
 'L-margin mid-outer (x15-60,y540-720)':lum(15,540,45,180),
 'between board & temple L (x200-260,y300-500)':lum(200,300,60,200),
 'far-top band (x400-1040,y6-26)':lum(400,6,640,20),
}
for(const[k,v]of Object.entries(R))console.log(`  ${k.padEnd(46)} mean=${v.mean} max=${v.max}`)
