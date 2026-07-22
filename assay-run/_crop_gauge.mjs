import {PNG} from "pngjs"
import fs from "node:fs"
const D="C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-artotty-shipgate-0707/"
// gauge region on desktop 1440: approx x892..1130 y400..500
function crop(src,out,x,y,w,h){ const p=PNG.sync.read(fs.readFileSync(D+src)); const o=new PNG({width:w,height:h}); for(let j=0;j<h;j++)for(let i=0;i<w;i++){const si=((y+j)*p.width+(x+i))<<2;const di=(j*w+i)<<2;o.data[di]=p.data[si];o.data[di+1]=p.data[si+1];o.data[di+2]=p.data[si+2];o.data[di+3]=255;} fs.writeFileSync(D+out,PNG.sync.write(o)); console.log("wrote",out,p.width+"x"+p.height) }
crop("desk-05-reveal-staggered.png","crop-gauge-bust.png",890,390,250,130)
crop("desk-02-plan-empty.png","crop-gauge-rest.png",890,420,250,130)
crop("desk-06-win-hero.png","crop-gauge-win.png",885,375,250,130)
