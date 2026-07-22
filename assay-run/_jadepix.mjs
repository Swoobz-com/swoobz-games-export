import { PNG } from 'pngjs'
import fs from 'node:fs'
const png = PNG.sync.read(fs.readFileSync('./shots-fabi-holdgate-0705/06-cartouche-hold.png'))
// coin at col0,row0 approx center of first coin tile at (339,138) per screenshot layout (desktop, tile ~53px)
const pts = [[339,138],[392,138],[445,138],[339,191]]
for (const [x,y] of pts) {
  const idx = (png.width * y + x) << 2
  console.log(x,y, png.data[idx], png.data[idx+1], png.data[idx+2])
}
