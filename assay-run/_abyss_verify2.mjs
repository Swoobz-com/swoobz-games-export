import { PNG } from 'pngjs'
import fs from 'node:fs'
function load(p){ return PNG.sync.read(fs.readFileSync(p)) }
// find brightest-saturation pixel in a box + report if it's gold(R>G>B) or teal(G,B>R)
function scan(img,x,y,w,h,label){
  let best=null,bs=-1
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    const i=(img.width*yy+xx)<<2; const r=img.data[i],g=img.data[i+1],b=img.data[i+2]
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b); const sat=mx-mn
    if(mx>90 && sat>bs){bs=sat;best=[r,g,b]}
  }
  if(!best){console.log(label,'no bright pixel');return}
  const [r,g,b]=best
  const kind = (r>g && g>=b && r-b>25)?'GOLD' : (b>=r && g>=r && g+b-2*r>20)?'TEAL/CYAN' : 'other'
  console.log(label.padEnd(22), `rgb(${r},${g},${b})`, 'sat='+bs, '=>', kind)
}
// WIN banner heading "SECURED THE HAUL" ~ (315..500, 700..716) desktop 1440
const w = load('shots-abyss-win-0706/a0-f14.png')
scan(w, 314, 698, 200, 22, 'WIN banner heading')
// PAYOUT number (gold expected) ~ (800,715)
scan(w, 795, 705, 60, 30, 'PAYOUT number')
// LINE HOLDS cyan HUD ~ (735,132..146)
scan(w, 735, 132, 110, 14, 'LINE HOLDS (cyan HUD)')
// wordmark: use mobile entry (ABYSS gold | LINE cyan)
const m = load('shots-abyss-live-0706/abyss-pixel7-entry.png') // 824x1856
scan(m, 150, 740, 260, 70, 'wordmark ABYSS (L)')
scan(m, 470, 740, 260, 70, 'wordmark LINE (R)')
