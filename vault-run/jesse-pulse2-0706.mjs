import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5324/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ba8eac91-485a-4861-971a-14c64e97fe60/scratchpad/shots'
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  defaultViewport: { width: 1440, height: 900 },
  args: ['--no-sandbox', '--force-color-profile=srgb'],
})
const page = await browser.newPage()
await page.goto(URL, { waitUntil: 'networkidle0' })
await sleep(500)
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }) }
async function clickText(s) {
  const h = await page.evaluateHandle((txt) => {
    return [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.replace(/\s+/g,' ').includes(txt)) || null
  }, s)
  const el = h.asElement(); if (el) { await el.click(); return true } return false
}
const body = async () => (await page.evaluate(() => document.body.innerText.replace(/\s+/g,' ').trim()))

// ============ A. CASH OUT + SPECTATOR ============
// Turn auto OFF so we cash manually
await clickText('OFF')
await clickText('COMMIT')
await sleep(900)                 // let a few candles form
await clickText('CASH OUT')      // manual cash
await sleep(120)
await shot('A1-justcashed')
console.log('CASHED BODY:', (await body()).slice(0, 500))
// spectator frames until settle
for (let i = 0; i < 12; i++) { await sleep(300); await shot(`A-spec-${String(i).padStart(2,'0')}`) }
console.log('AFTER-SPEC BODY:', (await body()).slice(0, 400))
await sleep(400)
await shot('A2-settled')

// wait for next-round auto-advance to bet
await sleep(4200)

// ============ B. RUG (never cash) ============
await clickText('OFF')
await clickText('COMMIT')
// capture until we see settled / rug
let sawRug = false
for (let i = 0; i < 30; i++) {
  await sleep(250)
  const t = await body()
  if (/RUGGED|CRASHED AT|DODGED THE RUG|SETTLED · CRASH/.test(t)) { await shot(`B-settle-${i}`); console.log('B SETTLE:', t.slice(0,300)); sawRug = true; break }
}
if (!sawRug) { await shot('B-nostate'); console.log('B no settle seen:', (await body()).slice(0,300)) }
await sleep(4200)

// ============ C. FOMC PUMP ============
await clickText('🦉 PUMP')
for (let i = 0; i < 26; i++) { await sleep(170); await shot(`C-pump-${String(i).padStart(2,'0')}`) }
console.log('PUMP END BODY:', (await body()).slice(0,300))
await sleep(4200)

// ============ D. FOMC DUMP ============
await clickText('🦉 DUMP')
for (let i = 0; i < 26; i++) { await sleep(170); await shot(`D-dump-${String(i).padStart(2,'0')}`) }
console.log('DUMP END BODY:', (await body()).slice(0,300))
await sleep(4200)

await browser.close()
console.log('DONE')
