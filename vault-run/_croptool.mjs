import { PNG } from 'pngjs';
import fs from 'fs';
const png = PNG.sync.read(fs.readFileSync('shots-brandcohesion-0707/01-betentry-bluechips-1440.png'));
const cropX=40, cropY=30, cw=200, ch=80;
const out = new PNG({ width: cw, height: ch });
for (let y=0;y<ch;y++) for (let x=0;x<cw;x++) {
  const srcIdx = (png.width*(y+cropY)+(x+cropX))<<2;
  const dstIdx = (cw*y+x)<<2;
  out.data[dstIdx]=png.data[srcIdx]; out.data[dstIdx+1]=png.data[srcIdx+1]; out.data[dstIdx+2]=png.data[srcIdx+2]; out.data[dstIdx+3]=png.data[srcIdx+3];
}
fs.writeFileSync('_crop-header.png', PNG.sync.write(out));
