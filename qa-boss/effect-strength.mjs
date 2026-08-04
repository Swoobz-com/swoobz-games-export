// Effect strength: per-frame count of BRIGHT subject pixels (a>128 && luma>190) as a % of that
// frame's subject-pixel count. Baseline = mean of the first 12 (resting) frames. Reports peak
// excess over baseline and how long the excess stays above 1 percentage point.
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter(f=>f.endsWith('.png')).sort();
const pct=[];
for (const f of files){
  const p = PNG.sync.read(fs.readFileSync(path.join(dir,f)));
  let sub=0, bright=0;
  for(let i=0;i<p.data.length;i+=4){ const a=p.data[i+3]; if(a<40) continue; sub++;
    const l=0.299*p.data[i]+0.587*p.data[i+1]+0.114*p.data[i+2]; if(a>128&&l>190) bright++; }
  pct.push(bright/sub*100);
}
const base = pct.slice(0,12).reduce((a,b)=>a+b,0)/12;
const ex = pct.map(v=>v-base);
const peak = Math.max(...ex); const pf = ex.indexOf(peak);
const above = ex.filter(v=>v>1).length;
console.log(`${path.basename(dir)}: baseline bright=${base.toFixed(2)}% peak excess=${peak.toFixed(2)}pp @f${pf} frames>1pp=${above} (${(above/24).toFixed(2)}s)`);
