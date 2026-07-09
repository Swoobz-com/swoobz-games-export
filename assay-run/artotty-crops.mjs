import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'shots-artotty-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t)) || null, txt)
  const el = h.asElement(); if (!el) return false; await el.click(); return true
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]

// Desktop DPR2 crops of board + specimen plate
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle2' }); await wait(400)
await clickText(page, 'ENTER THE ASSAY LINE'); await wait(500)
// board center crop (CSS coords)
await page.screenshot({ path: `${OUT}/CROP-desktop-board.png`, clip: { x: 560, y: 250, width: 300, height: 300 } })
// left specimen plate crop
await page.screenshot({ path: `${OUT}/CROP-desktop-specimen.png`, clip: { x: 195, y: 100, width: 230, height: 560 } })
// header crop
await page.screenshot({ path: `${OUT}/CROP-desktop-header.png`, clip: { x: 460, y: 40, width: 520, height: 90 } })

// Mobile loupe: big coins + header legibility
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle2' }); await wait(400)
await clickText(page, 'ENTER THE ASSAY LINE'); await wait(500)
await page.screenshot({ path: `${OUT}/CROP-mobile-board.png`, clip: { x: 20, y: 280, width: 380, height: 380 } })
await page.screenshot({ path: `${OUT}/CROP-mobile-header.png`, clip: { x: 20, y: 60, width: 380, height: 180 } })
await browser.close()
console.log('done')
