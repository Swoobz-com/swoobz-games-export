// EXTRA-OBJECT GATE — is there ever a SECOND detached object in frame?
//
// WHY THIS EXISTS. The IR-48 `hit` state cost FOUR cycles to a single defect class: the model kept
// inventing a visible attacker to justify the "unseen impact" (v1 flying talisman debris, v2 a blade
// from the LEFT, v3 a blade from the TOP). Neither existing gate reliably catches that:
//
//   profile-containment.mjs scores the LONGEST CONTIGUOUS BORDER RUN, so a few-px-wide torn talisman
//   crossing an edge never builds a run long enough to trip a band — it returned CLEAR on hit v1,
//   a clip whose pixels demonstrably reach both row 0 and the last column.
//
//   check-frontturn.mjs derives both its signals from the BBOX, so a detached object does not just
//   go unnoticed, it actively CORRUPTS the reading: debris inflated hit v1's aspect to 1.06 and
//   tripped the "wider than tall" hard tell on a clip whose torso was in clean side profile.
//
//   And an intruder that never touches an edge at all is invisible to both.
//
// This gate labels 8-connected components on the keyed silhouette and reports the maximum number of
// simultaneous blobs above minPx. A correct STANDOFF clip is ONE object: the fighter with his props
// in hand. Two or more means something is in frame that should not be.
//
// CALIBRATED AGAINST A KNOWN-BAD CONTROL, which is the only reason a clean result means anything:
//   hit v3 (blade from the top)  -> 2 blobs @f9, sizes [37322, 2491]   EXTRA OBJECT PRESENT
//   hit v4 (accepted)            -> 1 blob,      sizes [37275]         CLEAN
//
// minPx defaults to 400 (at scale 480) to ignore keying specks. Lower it only with a control re-run:
// too low and ordinary alpha noise reads as an object.
//
// CAVEAT: a prop the fighter is HOLDING is connected to him and counts as one blob, which is what we
// want; but a prop he legitimately RELEASES (the ko state drops both weapons) will read as a second
// object. Do NOT gate `ko` on this — see the ko_suffix_rule in the clipdata ledger.
//
// usage: node qa-boss/check-extra-objects.mjs <file.mp4> [minPx]
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path';
const require=createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const {PNG}=require('pngjs');
const isGreen=(r,g,b)=>g>110&&g>r+40&&g>b+40;
const MIN_PX=Number(process.argv[3]||400); // ignore specks
const dir=path.join(process.env.TEMP,`bl_${process.pid}`);
fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
spawnSync('ffmpeg',['-y','-v','error','-i',process.argv[2],'-vf','scale=480:-1','-vsync','0',path.join(dir,'f_%04d.png')]);
const fl=fs.readdirSync(dir).filter(x=>x.endsWith('.png')).sort();
// FAIL LOUD ON A VACUOUS RUN (phase 133). `worst` starts at 0 and the verdict is `worst<=1`, so a run
// that decoded NOTHING printed "CLEAN — never more than one object in frame" off zero measurements.
// Hit for real: this tool takes an MP4, and passing it a FRAMES DIRECTORY makes ffmpeg fail silently,
// after which the gate reports a clean pass. A gate that says CLEAN when it measured nothing is worse
// than no gate. Exit 2 (distinct from the verdict path) so it can never be mistaken for a pass.
if(!fl.length){
 console.error(`ERROR: decoded 0 frames from ${JSON.stringify(process.argv[2])} — nothing was measured.`);
 console.error('       This tool takes the MP4 itself, not a frames directory: check-extra-objects.mjs <file.mp4> [minPx]');
 fs.rmSync(dir,{recursive:true,force:true});
 process.exit(2);
}
let worst=0,worstF=-1,worstSizes=null;
fl.forEach((x,fi)=>{
 const p=PNG.sync.read(fs.readFileSync(path.join(dir,x)));
 const {width:w,height:h,data}=p;
 const m=new Uint8Array(w*h);
 for(let i=0;i<m.length;i++){const k=i*4;m[i]=isGreen(data[k],data[k+1],data[k+2])?0:1;}
 const lab=new Int32Array(w*h).fill(-1); const sizes=[];
 const st=new Int32Array(w*h);
 for(let i=0;i<m.length;i++){
  if(!m[i]||lab[i]!==-1)continue;
  let sp=0; st[sp++]=i; lab[i]=sizes.length; let n=0;
  while(sp>0){const c=st[--sp]; n++; const cx=c%w, cy=(c-cx)/w;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=cx+dx, ny=cy+dy; if(nx<0||ny<0||nx>=w||ny>=h)continue;
    const ni=ny*w+nx; if(m[ni]&&lab[ni]===-1){lab[ni]=lab[i];st[sp++]=ni;}}}
  sizes.push(n);
 }
 const big=sizes.filter(s=>s>=MIN_PX).sort((a,b)=>b-a);
 if(big.length>worst){worst=big.length;worstF=fi;worstSizes=big;}
});
console.log(`max simultaneous blobs >= ${MIN_PX}px : ${worst} @f${worstF}  sizes=${JSON.stringify(worstSizes)}`);
console.log(worst<=1?'CLEAN — never more than one object in frame':'EXTRA OBJECT PRESENT');
fs.rmSync(dir,{recursive:true,force:true});
