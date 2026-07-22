import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true } })
const page = (await browser.pages())[0]
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(500)

// Screenshot the FULL scrollable page (fullPage) so we can inspect the very
// top/bottom margin bands + confirm the card's actual occupied width vs
// viewport width (side-margin px available for the backdrop).
await page.screenshot({ path: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-visreg-0704/pixel7-fullpage-lobby.png', fullPage: true })

const geom = await page.evaluate(() => {
  const all = [...document.querySelectorAll('div')]
  const card = all.find((d) => (getComputedStyle(d).boxShadow || '').includes('24px 60px'))
  const cardRect = card ? card.getBoundingClientRect() : null
  return {
    viewportW: window.innerWidth,
    cardRect: cardRect ? { x: cardRect.x, y: cardRect.y, w: cardRect.width, h: cardRect.height } : null,
    sideMarginPxEach: cardRect ? (window.innerWidth - cardRect.width) / 2 : null,
    docScrollHeight: document.documentElement.scrollHeight,
  }
})

// Sample a vertical scanline down the very LEFT edge (x=2px) and very TOP
// strip (y=2px across width) of the viewport to see if the backdrop image
// varies at all in the space NOT covered by the card.
const samples = await page.evaluate(() => {
  const c = document.createElement('canvas')
  return null // placeholder; real sampling needs html2canvas, use screenshot pixel-read instead
})

fs.writeFileSync('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-visreg-0704/pixel7-geom.json', JSON.stringify(geom, null, 2))
console.log(JSON.stringify(geom, null, 2))
await browser.close()
