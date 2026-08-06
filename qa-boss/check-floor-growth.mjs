// FLOOR-GROWTH CHECK — does a ground surface GROW IN by the last frame?
// Closes a measured blind spot: a tiled floor that grows in under the feet is ATTACHED to the
// subject's footprint, so check-extra-objects reports ONE object (CLEAN) and check-containment sees
// no edge run (CLEAR). gargoyle attack_throw_b v1 passed BOTH while growing a flagstone floor; only
// check-anchor-lock's fLAST caught it — and anchor-lock is UNUSABLE for gargoyle (no shipped
// population). So measure the plate itself: NON-PLATE pixel share in the BOTTOM BAND at f0 vs fLAST.
// Both frames are the same anchor pose, so the subject contributes ~equally; a floor does not.
import { spawnSync } from 'node:child_process';
const [file, tLast='4.0'] = process.argv.slice(2);
if (!file) { console.error('usage: node floor-delta.mjs <clip.mp4> [lastFrameSeconds]'); process.exit(2); }
const W=960,H=960, BAND_TOP=Math.round(H*0.72);
function frame(t){
  const r=spawnSync('ffmpeg',['-v','error','-i',file,'-ss',String(t),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:1<<28});
  if(r.status!==0||!r.stdout||r.stdout.length<W*H*3){ console.error('ffmpeg failed t='+t+' bytes='+(r.stdout?r.stdout.length:0)+' '+(r.stderr||'')); process.exit(2); }
  return r.stdout;
}
const isPlate=(r,g,b)=> g>110 && r<0.55*g && b<0.55*g;
function stats(buf){
  let bandNon=0,bandTot=0,allNon=0;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const i=(y*W+x)*3;
    const plate=isPlate(buf[i],buf[i+1],buf[i+2]);
    if(!plate) allNon++;
    if(y>=BAND_TOP){ bandTot++; if(!plate) bandNon++; }
  }
  return {bandPct:100*bandNon/bandTot, allPct:100*allNon/(W*H)};
}
const a=stats(frame(0)), z=stats(frame(tLast));
const dBand=z.bandPct-a.bandPct;
const verdict = dBand>6?'FLOOR GREW IN — LOOK':(dBand>3?'WATCH':'clean');
console.log(`${file.replace(/.*\//,'').padEnd(44)} band f0 ${a.bandPct.toFixed(2)}% -> fLAST ${z.bandPct.toFixed(2)}%  (${dBand>=0?'+':''}${dBand.toFixed(2)}pp)  whole ${a.allPct.toFixed(2)}%->${z.allPct.toFixed(2)}%   ${verdict}`);
process.exit(dBand>6?1:0);
