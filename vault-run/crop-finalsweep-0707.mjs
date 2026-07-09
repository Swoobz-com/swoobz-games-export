import { PNG } from 'pngjs'
import fs from 'fs'

const IN = 'shots-visregqa-finalsweep-0707'
const OUT = 'shots-visregqa-finalsweep-0707/crops'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)

function crop(file, x, y, w, h, outName) {
  const data = fs.readFileSync(`${IN}/${file}`)
  const png = PNG.sync.read(data)
  const out = new PNG({ width: w, height: h })
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const srcIdx = ((y + row) * png.width + (x + col)) << 2
      const dstIdx = (row * w + col) << 2
      png.data.copy(out.data, dstIdx, srcIdx, srcIdx + 4)
    }
  }
  fs.writeFileSync(`${OUT}/${outName}`, PNG.sync.write(out))
  console.log('wrote', outName)
}

// right gutter comparisons (1440x900 desktop): Settled WIN/LOSS vs Playing
crop('bluechips-settled-d1440-WIN.png', 1030, 90, 340, 720, 'gutter-settled-WIN.png')
crop('bluechips-settled-d1440-SYMLOSS.png', 1030, 90, 340, 720, 'gutter-settled-LOSS.png')
crop('bluechips-playing-d1440.png', 1030, 90, 340, 720, 'gutter-playing.png')
crop('bluechips-betentry-d1440.png', 1030, 90, 340, 720, 'gutter-betentry-worldpicker.png')

// world-picker card row zoom (all 3 cards) at bet-entry
crop('bluechips-betentry-d1440.png', 1030, 195, 340, 240, 'worldpicker-3cards.png')

// full settled screen top region (scrim/banner/board dim) - top 300px full width
crop('bluechips-settled-d1440-WIN.png', 0, 0, 1440, 400, 'settled-top-WIN.png')
crop('bluechips-settled-d1440-SYMLOSS.png', 0, 0, 1440, 400, 'settled-top-LOSS.png')

// board region (unopened safes dim check) settled
crop('bluechips-settled-d1440-WIN.png', 50, 150, 700, 650, 'board-settled-WIN.png')
crop('bluechips-settled-d1440-SYMLOSS.png', 50, 150, 700, 650, 'board-settled-LOSS.png')

// backdrop full-bleed check per world (bet-entry, full frame)
// (viewed directly full-res, no crop needed, but make a smaller board-area crop)
crop('altseason-betentry-d1440.png', 0, 0, 1000, 900, 'backdrop-altseason.png')
crop('shitcoin-betentry-d1440.png', 0, 0, 1000, 900, 'backdrop-shitcoin.png')
crop('bluechips-betentry-d1440.png', 0, 0, 1000, 900, 'backdrop-bluechips.png')

console.log('DONE crops')
