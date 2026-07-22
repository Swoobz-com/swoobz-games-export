import { PNG } from 'pngjs'
import fs from 'node:fs'
const png = PNG.sync.read(fs.readFileSync('shots-jesse-196-0705/01-lobby.png'))
const at = (x,y)=>{const i=(png.width*y+x)<<2;return png.data[i]+','+png.data[i+1]+','+png.data[i+2]}
console.log('FRESH lobby', png.width+'x'+png.height)
for(const [k,x,y] of [
  ['top-left corner',60,60],['mid-left margin',300,700],['far-left edge',40,900],
  ['mid-right margin',png.width-300,700],['bottom-left',200,png.height-120],
  ['board bed (behind coin gap)',900,300],['board bed low',900,1150],
  ['card header bg',900,140],
]) console.log(k.padEnd(28),'rgb('+at(x,y)+')')
