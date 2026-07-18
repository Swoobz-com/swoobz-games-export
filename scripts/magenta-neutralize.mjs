// Second-pass interior magenta neutralizer for a keyed frame dir: pixels where BOTH
// R and B exceed G by MIN are pulled toward neutral (KEEP of the excess kept).
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');
const [dir, minS, keepS] = process.argv.slice(2);
const MIN = Number(minS ?? 14), KEEP = Number(keepS ?? 0.15);
const files = fs.readdirSync(dir).filter(f=>f.endsWith('.png')).sort();
let px=0;
for (const f of files){
  const p = path.join(dir,f);
  const png = PNG.sync.read(fs.readFileSync(p));
  const d = png.data;
  let changed=false;
  for(let i=0;i<d.length;i+=4){
    if(d[i+3]===0) continue;
    const r=d[i],g=d[i+1],b=d[i+2];
    const ex=Math.min(r-g,b-g);
    if(ex>MIN){
      d[i]=Math.round(g+(r-g)*KEEP);
      d[i+2]=Math.round(g+(b-g)*KEEP);
      changed=true; px++;
    }
  }
  if(changed) fs.writeFileSync(p, PNG.sync.write(png));
}
console.log(`neutralized ${px} px across ${files.length} frames`);
