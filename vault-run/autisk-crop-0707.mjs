import { PNG } from 'pngjs'
import fs from 'node:fs'
const OUT = process.env.OUT
function cropTop(src, dst, h) {
  const png = PNG.sync.read(fs.readFileSync(src))
  const out = new PNG({ width: png.width, height: h })
  for (let y = 0; y < h; y++) for (let x = 0; x < png.width; x++) {
    const i = (png.width * y + x) << 2, j = (out.width * y + x) << 2
    out.data[j] = png.data[i]; out.data[j + 1] = png.data[i + 1]; out.data[j + 2] = png.data[i + 2]; out.data[j + 3] = png.data[i + 3]
  }
  fs.writeFileSync(dst, PNG.sync.write(out))
}
cropTop(OUT + '/Pixel7-bluechips-02-playing.png', OUT + '/CROP-playing-top.png', 300)
cropTop(OUT + '/STEADY-Pixel7-bluechips-win.png', OUT + '/CROP-settled-top.png', 300)
console.log('cropped')
