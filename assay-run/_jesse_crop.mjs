import { PNG } from 'pngjs'
import fs from 'node:fs'
// crop board region from win frame (has struck+cracked+dormant), native 2880x1800, DSF2 -> downscale to 1:1 CSS to judge true display size
const src = PNG.sync.read(fs.readFileSync('shots-jesse-196-0705/06-winsettle-00.png'))
// board area native approx x 620..1720, y 240..1280 (avoid cartouche center); take top-left quadrant of board
function crop(sx,sy,w,h,out){
  const o=new PNG({width:w,height:h})
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const si=((sy+y)*src.width+(sx+x))<<2,di=(y*w+x)<<2;o.data[di]=src.data[si];o.data[di+1]=src.data[si+1];o.data[di+2]=src.data[si+2];o.data[di+3]=255}
  fs.writeFileSync(out,PNG.sync.write(o))
}
// downsample 2x to true CSS px
function crop2css(sx,sy,w,h,out){
  const cw=w>>1,ch=h>>1
  const o=new PNG({width:cw,height:ch})
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    let r=0,g=0,b=0
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const si=((sy+y*2+dy)*src.width+(sx+x*2+dx))<<2;r+=src.data[si];g+=src.data[si+1];b+=src.data[si+2]}
    const di=(y*cw+x)<<2;o.data[di]=r>>2;o.data[di+1]=g>>2;o.data[di+2]=b>>2;o.data[di+3]=255
  }
  fs.writeFileSync(out,PNG.sync.write(o))
}
// top-left board quadrant native, and a css-size version
crop2css(620,240,760,760,'_crop_board_css.png')
console.log('wrote _crop_board_css.png (true CSS display size ~380x380)')
