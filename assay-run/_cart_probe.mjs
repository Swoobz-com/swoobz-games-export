import {PNG} from 'pngjs'
import fs from 'node:fs'
const png=PNG.sync.read(fs.readFileSync('shots-autisk-reverify-0705/d-win-f3.png'))
const {width,data}=png
const L=(r,g,b)=>0.299*r+0.587*g+0.114*b
const avg=(x0,y0,w,h)=>{let r=0,g=0,b=0,n=0,mn=999,mx=0;for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const i=(y*width+x)*4;r+=data[i];g+=data[i+1];b+=data[i+2];const l=L(data[i],data[i+1],data[i+2]);if(l<mn)mn=l;if(l>mx)mx=l;n++}return{rgb:[r/n,g/n,b/n].map(v=>Math.round(v)),L:Math.round(L(r/n,g/n,b/n)),mn:Math.round(mn),mx:Math.round(mx)}}
// cartouche interior dark fill (avoid text/sundisc) - left interior gap between sundisc and text
console.log('cartouche interior fill (470,290,55,45):',JSON.stringify(avg(470,290,55,45)))
console.log('cartouche interior fill (690,290,15,45):',JSON.stringify(avg(690,290,15,45)))
// a nearby BOARD coin region (gold) that the cartouche overlays area would show if translucent
console.log('board coin gold ref (330,400,40,40):',JSON.stringify(avg(330,400,40,40)))
// cartouche TEXT region (should be bright goldLight)
console.log('cartouche TEXT band (535,290,150,45):',JSON.stringify(avg(535,290,150,45)))
// cartouche rim gold bevel
console.log('cartouche top rim (500,272,180,6):',JSON.stringify(avg(500,272,180,6)))
