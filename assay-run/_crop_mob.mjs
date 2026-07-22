import { PNG } from 'pngjs'
import fs from 'node:fs'
const png = PNG.sync.read(Buffer.from(fs.readFileSync('shots-codotty-lum-mobile.png')))
function crop(x0,y0,w,h,name){const o=new PNG({width:w,height:h});for(let y=0;y<h;y++)for(let x=0;x<w;x++){const si=((y0+y)*png.width+(x0+x))*4;const di=(y*w+x)*4;o.data[di]=png.data[si];o.data[di+1]=png.data[si+1];o.data[di+2]=png.data[si+2];o.data[di+3]=255}fs.writeFileSync(name,PNG.sync.write(o))}
crop(250,44,150,26,'_crop_mob_balance.png')
crop(20,430,380,70,'_crop_mob_discs.png')
console.log('cropped')
