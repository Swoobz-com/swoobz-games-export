import { readPng } from './pngpix.mjs'
function scan(file){
  const p = readPng(file)
  const {width:w,height:h,channels:c,data:d}=p
  let cyan=0, tot=w*h
  const xs=[],ys=[]
  const samples=[]
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*c
    const r=d[i],g=d[i+1],b=d[i+2]
    if(b>r+30 && g>r+20 && b>110 && g>95 && Math.abs(b-g)<70){
      cyan++
      if(xs.length<200000){xs.push(x);ys.push(y)}
      if(samples.length<6)samples.push([x,y,r,g,b])
    }
  }
  let bbox=null
  if(xs.length){bbox={x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)}}
  return {file:file.split('/').pop(),w,h,cyan,pct:(cyan/tot*100).toFixed(4),bbox,samples}
}
for(const f of process.argv.slice(2)){
  try{console.log(JSON.stringify(scan(f)))}catch(e){console.log(f,'ERR',e.message)}
}
