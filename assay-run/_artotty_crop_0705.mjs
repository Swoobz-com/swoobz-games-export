import fs from 'node:fs'
import { PNG } from 'pngjs'
const D = 'shots-artotty-dark-0705/'
function crop(src, x, y, w, h, out) {
  const img = PNG.sync.read(fs.readFileSync(D + src))
  const o = new PNG({ width: w, height: h })
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const si = ((y + j) * img.width + (x + i)) * 4, di = (j * w + i) * 4
    o.data[di] = img.data[si]; o.data[di + 1] = img.data[si + 1]; o.data[di + 2] = img.data[si + 2]; o.data[di + 3] = img.data[si + 3]
  }
  fs.writeFileSync(D + out, PNG.sync.write(o))
}
// desktop board top-left 6x6 coins at true size (tile ~38px)
crop('d1440-02-planning.png', 312, 100, 250, 250, 'crop-coins-desktop.png')
// left margin elevations (torch sconce + temple + treasure)
crop('d1440-02-planning.png', 20, 120, 320, 500, 'crop-Lmargin.png')
// win cartouche + bloom
crop('WIN-reveal-02.png', 300, 100, 560, 560, 'crop-win-board.png')
console.log('done')
