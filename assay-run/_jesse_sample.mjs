import { PNG } from 'pngjs'
import fs from 'node:fs'
const png = PNG.sync.read(fs.readFileSync('shots-jesse-196-0705/01-lobby.png'))
const at = (x,y)=>{const i=(png.width*y+x)<<2;return [png.data[i],png.data[i+1],png.data[i+2]]}
console.log('img', png.width+'x'+png.height)
// sample far margins (should be near-black obsidian INK 11,10,8 if fresh)
const pts = {
  'top-left corner': at(60,60),
  'mid-left margin': at(300,700),
  'far-left edge': at(40,900),
  'mid-right margin': at(png.width-300,700),
  'bottom-left': at(200,png.height-120),
  'center torch area L': at(280,380),
}
for(const [k,v] of Object.entries(pts)) console.log(k.padEnd(20), 'rgb('+v.join(',')+')')
