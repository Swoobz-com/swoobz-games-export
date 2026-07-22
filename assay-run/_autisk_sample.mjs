import {PNG} from 'pngjs'
import fs from 'node:fs'
const png = PNG.sync.read(fs.readFileSync('shots-autisk-premium-0705/d1440-1-lobby.png'))
const {width,height,data}=png
const avg=(x0,y0,w,h)=>{let r=0,g=0,b=0,n=0;for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const i=(y*width+x)*4;r+=data[i];g+=data[i+1];b+=data[i+2];n++}return [Math.round(r/n),Math.round(g/n),Math.round(b/n)]}
const L=(rgb)=>Math.round(0.299*rgb[0]+0.587*rgb[1]+0.114*rgb[2])
console.log('img',width,'x',height)
const spots={
 'UL key-pool (140,190)':[80,150,120,120],
 'UR corner (1320,80)':[1280,40,120,120],
 'LL corner (100,850)':[40,820,120,60],
 'LR corner (1360,850)':[1300,820,120,60],
 'top-center title bg':[660,25,120,50],
 'right margin mid':[1300,300,120,120],
}
for(const [k,[x,y,w,h]] of Object.entries(spots)){const c=avg(x,y,w,h);console.log(k.padEnd(26),'rgb',JSON.stringify(c),'L='+L(c))}
let prof=[];for(let y=30;y<320;y+=5){prof.push(L(avg(115,y,12,3)))}
console.log('left-margin vert L (y30..320 step5):',prof.join(','))
let md=0,at=0;for(let i=1;i<prof.length;i++){const d=Math.abs(prof[i]-prof[i-1]);if(d>md){md=d;at=30+i*5}}
console.log('max adjacent L step:',md,'at y~'+at)
