import {PNG} from 'pngjs'
import fs from 'node:fs'
const png=PNG.sync.read(fs.readFileSync('shots-autisk-reverify-0705/m-lobby.png'))
const {width,height,data}=png
console.log('mobile img',width,'x',height)
const L=(r,g,b)=>0.299*r+0.587*g+0.114*b
const avg=(x0,y0,w,h)=>{let r=0,g=0,b=0,n=0;for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const i=(y*width+x)*4;r+=data[i];g+=data[i+1];b+=data[i+2];n++}return{rgb:[r/n,g/n,b/n].map(v=>Math.round(v)),L:Math.round(L(r/n,g/n,b/n))}}
// vertical profile top->bottom center col (scenic gradient?)
console.log('\nvert luma center col (x=412) y0..1640 step 80:')
let prof=[];for(let y=8;y<1640;y+=80){prof.push(avg(400,y,24,20).L)}
console.log(prof.join(','))
// top header band scenic content: sample across the top band for warm variation
console.log('\ntop band (y 10..90) horizontal warm scan:')
for(const x of [60,160,300,450,600,720]){const a=avg(x,20,30,60);console.log(`x=${x}`,JSON.stringify(a),'warmth(R-B)='+(a.rgb[0]-a.rgb[2]))}
// temple peak top-left region vs sky behind
console.log('\ntemple peak TL:',JSON.stringify(avg(60,30,10,80)),' sky ref:',JSON.stringify(avg(200,30,40,80)))
// bottom void (flat vignette region below card)
console.log('\nbottom void (y 1400):',JSON.stringify(avg(300,1400,200,60)),' vs top sky (y40):',JSON.stringify(avg(300,40,200,60)))
