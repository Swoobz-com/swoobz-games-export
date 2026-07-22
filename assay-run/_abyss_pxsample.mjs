import { PNG } from 'pngjs'
import fs from 'node:fs'
function load(p){ return PNG.sync.read(fs.readFileSync(p)) }
function px(img,x,y){ x=Math.round(x); y=Math.round(y); const i=(img.width*y+x)<<2; return [img.data[i],img.data[i+1],img.data[i+2]] }
function avg(img,x,y,w,h){ let r=0,g=0,b=0,n=0; for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(img.width*yy+xx)<<2;r+=img.data[i];g+=img.data[i+1];b+=img.data[i+2];n++} return [Math.round(r/n),Math.round(g/n),Math.round(b/n)] }
const lum = c => Math.round(0.2126*c[0]+0.7152*c[1]+0.0722*c[2])
const warm = c => c[0]-c[2] // R-B; >0 warm, <0 cool
function rep(label,c){ console.log(label.padEnd(26), `rgb(${c[0]},${c[1]},${c[2]})`, 'L='+lum(c), 'R-B='+warm(c)) }

// DESKTOP plot 1440x900
const d = load('shots-abyss-deep-0706/d-plot-mid.png')
console.log('=== DESKTOP 1440x900 (d-plot-mid) ===')
rep('far-left margin', avg(d, 60, 400, 40, 40))
rep('far-right margin', avg(d, 1340, 400, 40, 40))
rep('control-col bg (behind bet)', avg(d, 1010, 560, 30, 20)) // between panels
rep('control-col bottom (RUN area glow)', avg(d, 1000, 800, 30, 20))
rep('bottom-right treasure glow', avg(d, 980, 850, 40, 30))
rep('top margin (deep water)', avg(d, 200, 40, 40, 20))

// MOBILE plot pixel7 (from live shots) 412x915 dsf2 => 824x1830
try {
  const m = load('shots-abyss-live-0706/abyss-pixel7-plot.png')
  console.log('=== MOBILE pixel7 (abyss-pixel7-plot) dims', m.width+'x'+m.height, '===')
  rep('ctrl-col bg behind DIVE DEPTH', avg(m, 700, 1600, 40, 30))
  rep('ctrl-col bg behind HAUL', avg(m, 120, 2380, 40, 30))
  rep('ctrl-col bg behind YOUR BET', avg(m, 700, 2900, 40, 30))
  rep('scene above board', avg(m, 100, 400, 40, 30))
} catch(e){ console.log('mobile plot read err', e.message) }
