import { PNG } from 'pngjs'
import fs from 'node:fs'
const png = PNG.sync.read(fs.readFileSync('shots-artotty-rescore-0705/WIN-settled.png'))
const { width:W, height:H, data } = png
const at = (x,y)=>{const i=(y*W+x)*4;return [data[i],data[i+1],data[i+2]]}
const pts = {
  'TL corner (10,10)':[10,10],
  'TR corner (1430,10)':[1430,10],
  'BL corner (10,890)':[10,890],
  'BR corner (1430,890)':[1430,890],
  'L-margin treasure (95,455)':[95,455],
  'L-margin empty above (200,180)':[200,180],
  'L-margin empty below (200,750)':[200,750],
  'key pool near board UL (330,120)':[330,120],
  'below-board band (575,720)':[575,720],
  'page mid-brown far L (60,450)':[60,450],
}
let vals=[]
for(const [k,[x,y]] of Object.entries(pts)){const [r,g,b]=at(x,y);const lum=Math.round(0.299*r+0.587*g+0.114*b);vals.push(lum);console.log(k.padEnd(34), `rgb(${r},${g},${b})`.padEnd(16),'lum',lum)}
console.log('--- tonal spread: min',Math.min(...vals),'max',Math.max(...vals),'range',Math.max(...vals)-Math.min(...vals))
