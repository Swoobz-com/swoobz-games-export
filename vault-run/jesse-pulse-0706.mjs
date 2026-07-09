import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5324/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ba8eac91-485a-4861-971a-14c64e97fe60/scratchpad/shots'
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  defaultViewport: { width: 1440, height: 900 },
  args: ['--no-sandbox', '--force-color-profile=srgb'],
})
const page = await browser.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERR ' + e.message))
await page.goto(URL, { waitUntil: 'networkidle0' })
await sleep(600)

const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png` }) }

// helper: click a button whose text includes s
async function clickText(s) {
  const handle = await page.evaluateHandle((txt) => {
    const els = [...document.querySelectorAll('button')]
    return els.find((b) => b.textContent && b.textContent.replace(/\s+/g, ' ').includes(txt)) || null
  }, s)
  const el = handle.asElement()
  if (el) { await el.click(); return true }
  return false
}

// dump all visible button texts + key readouts
async function census() {
  return await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)
    const bodyText = document.body.innerText.replace(/\s+/g, ' ').trim()
    return { btns, bodyText }
  })
}

// ---- 1. COLD OPEN ----
await shot('01-coldopen')
console.log('COLD OPEN CENSUS:', JSON.stringify(await census(), null, 1).slice(0, 1600))

// ---- 2. change wager: chips + stepper ----
await clickText('25')
await sleep(200)
await shot('02-wager25')
// stepper +
await clickText('+')
await sleep(150)
await shot('03-wager-step')
// auto chip 1.5x
await clickText('1.5x')
await sleep(150)
await shot('04-auto15')

// ---- 3. COMMIT and watch it climb ----
await clickText('COMMIT')
await sleep(120)
await shot('05-live-early')
// dense climb frames
for (let i = 0; i < 14; i++) {
  await sleep(260)
  await shot(`clim-${String(i).padStart(2, '0')}`)
}
console.log('MID-CLIMB CENSUS:', JSON.stringify(await census()).slice(0, 1200))

await browser.close()
console.log('ERRORS:', errors.length ? errors.slice(0, 10) : 'none')
