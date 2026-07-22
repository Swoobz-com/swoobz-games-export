import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/input/asset abyss'
const OUT = 'shots-abyss-mockups'
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

const targets = [
  { f: `file:///${BASE}/mockups/abyss-line-example-entry.html`, name: 'mock-entry', w: 1440, h: 900 },
  { f: `file:///${BASE}/mockups/abyss-line-example-setup.html`, name: 'mock-setup', w: 1440, h: 900 },
  { f: `file:///${BASE}/vector/abyss-line-background.svg`, name: 'svg-bg', w: 1920, h: 1080 },
  { f: `file:///${BASE}/vector/abyss-line-assets.svg`, name: 'svg-assets', w: 1200, h: 800 },
]
for (const t of targets) {
  const page = await browser.newPage()
  await page.setViewport({ width: t.w, height: t.h, deviceScaleFactor: 1 })
  await page.goto(t.f, { waitUntil: 'networkidle0', timeout: 30000 }).catch(e => console.log('goto err', t.name, e.message))
  await wait(500)
  await page.screenshot({ path: `${OUT}/${t.name}.png`, fullPage: false })
  await page.close()
  console.log('shot', t.name)
}
await browser.close()
console.log('done mockups')
