import { readPng } from './pngpix.mjs'
// STRICT cyan/volt: G and B both bright AND balanced (teal), R clearly lowest. Excludes blue-grey steel (G<125) and money-green (B low).
function scan(file){
  const p = readPng(file); const {width:w,height:h,channels:c,data:d}=p
  let cyan=0; const pts=[]; const samples=[]
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*c; const r=d[i],g=d[i+1],b=d[i+2]
    if(g>=125 && b>=125 && r<g-45 && r<b-45 && Math.abs(g-b)<38){
      cyan++; if(pts.length<200000)pts.push([x,y]); if(samples.length<8)samples.push([x,y,r,g,b])
    }
  }
  let bbox=null
  if(pts.length){const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);bbox={x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)}}
  return {file:file.split('/').pop(),cyan,bbox,samples}
}
for(const f of process.argv.slice(2)){try{console.log(JSON.stringify(scan(f)))}catch(e){console.log(f,'ERR',e.message)}}
