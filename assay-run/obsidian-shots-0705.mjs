import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5183/'
const OUT = 'shots-obsidian-0705'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],div')]
    return els.find((b) => b.textContent && b.textContent.trim().includes(t)) || null
  }, txt)
  const el = h.asElement(); if (!el) return false
  await el.click(); return true
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] })
async function shoot(name, w, h) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await wait(1400)
  await page.screenshot({ path: `${OUT}/${name}-1-lobby.png` })
  // enter planning (board)
  const ok = await clickText(page, 'ENTER THE ASSAY LINE') || await clickText(page,'ENTER')
  await wait(1600)
  await page.screenshot({ path: `${OUT}/${name}-2-board.png` })
  console.log(name, 'enter=', ok)
  await page.close()
}
await shoot('desktop-1440', 1440, 900)
await shoot('mobile-412', 412, 915)
await browser.close()
console.log('done')
