import {PNG} from 'pngjs'
import fs from 'node:fs'
const rd=p=>PNG.sync.read(fs.readFileSync(p))
const L=(r,g,b)=>0.299*r+0.587*g+0.114*b
function avg(png,x0,y0,w,h){const{width,data}=png;let r=0,g=0,b=0,n=0;for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const i=(y*width+x)*4;r+=data[i];g+=data[i+1];b+=data[i+2];n++}return[r/n,g/n,b/n]}
function px(png,x,y){const i=(y*png.width+x)*4;return[png.data[i],png.data[i+1],png.data[i+2],png.data[i+3]]}
// horizontal luma scan across a row to find temple stepped-edge contrast
function hscan(png,y,x0,x1,step=2){const out=[];for(let x=x0;x<x1;x+=step){out.push(Math.round(L(...px(png,x,y).slice(0,3))))}return out}
function maxStep(arr){let m=0,at=0;for(let i=1;i<arr.length;i++){const d=Math.abs(arr[i]-arr[i-1]);if(d>m){m=d;at=i}}return{m:Math.round(m),at}}

const P=process.argv[2]||'shots-autisk-reverify-0705/d-planning.png'
const png=rd(P)
console.log('IMG',P,png.width,'x',png.height)
// --- TEMPLE left margin: horizontal scans at several y across the stepped towers ---
console.log('\n== TEMPLE (left margin x 20..290) horizontal luma scans ==')
for(const y of [250,360,470,560,650,740]){
  const s=hscan(png,y,20,290,2)
  const mn=Math.min(...s),mx=Math.max(...s),ms=maxStep(s)
  console.log(`y=${y} min=${mn} max=${mx} range=${mx-mn} maxAdjStep=${ms.m}`)
}
console.log('\n== TEMPLE (right margin x 1160..1420) horizontal luma scans ==')
for(const y of [250,360,470,560,650,740]){
  const s=hscan(png,y,1160,1420,2)
  const mn=Math.min(...s),mx=Math.max(...s),ms=maxStep(s)
  console.log(`y=${y} min=${mn} max=${mx} range=${mx-mn} maxAdjStep=${ms.m}`)
}
// --- SCONCE light pool: sample ring around left sconce (148,185) vs baseline far ---
console.log('\n== SCONCE light pool ==')
const flame=avg(png,138,165,24,30)
const pool=avg(png,90,150,120,90)   // area around/below sconce
const base=avg(png,20,150,60,90)     // far-left baseline wall same height
console.log('L-flame rgb',flame.map(v=>Math.round(v)),'L='+Math.round(L(...flame)))
console.log('L-pool  rgb',pool.map(v=>Math.round(v)),'L='+Math.round(L(...pool)))
console.log('L-base  rgb',base.map(v=>Math.round(v)),'L='+Math.round(L(...base)))
console.log('pool-vs-base deltaL',Math.round(L(...pool)-L(...base)),'deltaR',Math.round(pool[0]-base[0]))
const rflame=avg(png,1285,165,24,30),rpool=avg(png,1250,150,120,90),rbase=avg(png,1370,150,50,90)
console.log('R-pool deltaL',Math.round(L(...rpool)-L(...rbase)),'deltaR',Math.round(rpool[0]-rbase[0]))
