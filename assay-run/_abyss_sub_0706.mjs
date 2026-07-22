import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'shots-abyss-sub-0706'
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

// 1) render the BUILT background SVG the game actually uses
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
  await page.goto('file:///C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/originals/assay/assets/abyss-background.svg', { waitUntil: 'networkidle0' })
  await wait(400)
  await page.screenshot({ path: `${OUT}/built-bg-full.png` })
  // crop the sub (viewBox 800,110 => scene 0.5x,0.12y) and mine (470,770 => 0.29x,0.85y)
  await page.screenshot({ path: `${OUT}/built-sub-crop.png`, clip: { x: 620, y: 20, width: 380, height: 200 } })
  await page.screenshot({ path: `${OUT}/built-mine-crop.png`, clip: { x: 400, y: 720, width: 160, height: 120 } })
  await page.close()
}

// 2) LIVE scene: DSF2 crop the sub region + mine region on the entry screen
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto('http://localhost:5182/', { waitUntil: 'load' }); await wait(800)
  // sub sits behind the board card top-center ~ (720,60) in the 1440 scene; card top ~ y40
  await page.screenshot({ path: `${OUT}/live-topcenter-crop.png`, clip: { x: 560, y: 10, width: 360, height: 130 } })
  // mine on floor bottom-left of scene ~ (390,770) in 1440 (scaled from svg 470/1600)
  await page.screenshot({ path: `${OUT}/live-mine-crop.png`, clip: { x: 320, y: 720, width: 180, height: 150 } })
  // full frame for reference
  await page.screenshot({ path: `${OUT}/live-full.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } })
  await page.close()
}
await browser.close()
console.log('done sub')
