import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'shots-reverify-darkregister-0705'
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
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await wait(1400)
const title = await page.title()
await page.screenshot({ path: `${OUT}/desktop-1440x900-01-lobby.png` })
const ok = await clickText(page, 'ENTER THE ASSAY LINE') || await clickText(page,'ENTER')
await wait(1800)
await page.screenshot({ path: `${OUT}/desktop-1440x900-02-board.png` })
console.log(JSON.stringify({ title, enteredBoard: ok }))
await browser.close()
