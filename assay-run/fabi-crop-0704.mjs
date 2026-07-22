import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = './fabi-shots-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(500)

// crop around cyan cluster (944-967, 46-48) with margin
await page.screenshot({ path: `${OUT}/crop-cyan-cluster.png`, clip: { x: 880, y: 10, width: 160, height: 80 } })
// crop around purple pixels (738-782, 751-757)
await page.screenshot({ path: `${OUT}/crop-purple.png`, clip: { x: 660, y: 700, width: 200, height: 100 } })
// full lobby again for reference
await page.screenshot({ path: `${OUT}/lobby-full-ref.png` })

await browser.close()
console.log('done crops')
