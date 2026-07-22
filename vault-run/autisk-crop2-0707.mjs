import { PNG } from 'pngjs'
import fs from 'node:fs'
const OUT = process.env.OUT
function cropTop(src, dst, h) {
  if (!fs.existsSync(src)) { console.log('missing ' + src); return }
  const png = PNG.sync.read(fs.readFileSync(src))
  const hh = Math.min(h, png.height)
  const out = new PNG({ width: png.width, height: hh })
  for (let y = 0; y < hh; y++) for (let x = 0; x < png.width; x++) {
    const i = (png.width * y + x) << 2, j = (out.width * y + x) << 2
    out.data[j] = png.data[i]; out.data[j+1] = png.data[i+1]; out.data[j+2] = png.data[i+2]; out.data[j+3] = png.data[i+3]
  }
  fs.writeFileSync(dst, PNG.sync.write(out))
}
cropTop(OUT + '/Pixel7-bluechips-01-betentry.png', OUT + '/CROP-betentry-top.png', 260)
cropTop(OUT + '/iPhone14Pro-shitcoin-02-playing.png', OUT + '/CROP-ip-playing-top.png', 260)
console.log('done')
