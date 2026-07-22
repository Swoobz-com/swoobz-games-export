import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5324/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ba8eac91-485a-4861-971a-14c64e97fe60/scratchpad/shots'
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, defaultViewport: { width: 1440, height: 900 }, args: ['--no-sandbox', '--force-color-profile=srgb'] })
const page = await browser.newPage()
async function fresh() { await page.goto(URL, { waitUntil: 'networkidle0' }); await sleep(500) }
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }) }
async function clickText(s) {
  const h = await page.evaluateHandle((txt) => [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.replace(/\s+/g,' ').includes(txt)) || null, s)
  const el = h.asElement(); if (el) { await el.click(); return true } return false
}
const body = async () => (await page.evaluate(() => document.body.innerText.replace(/\s+/g,' ').trim()))

await fresh()

// ============ D2. FOMC DUMP (fresh) ============
await clickText('🦉 DUMP')
for (let i = 0; i < 24; i++) { await sleep(170); await shot(`D2-dump-${String(i).padStart(2,'0')}`) }
console.log('DUMP END:', (await body()).slice(0,260))

// ============ E. AUTO-CASH + SPECTATOR (farm rounds) ============
// reload fresh, set auto 1.2x, farm several rounds to catch LEFT ON THE TABLE / DODGED THE RUG / a dip
await fresh()
await clickText('1.2x')  // auto target lowest
let gotSpec = false, gotDip = false, gotWick = false
for (let round = 0; round < 10 && !(gotSpec && gotDip); round++) {
  // ensure we are in bet phase
  const t0 = await body()
  if (/BET AGAIN|NEXT ROUND IN/.test(t0)) { await clickText('BET AGAIN'); await sleep(300) }
  if (/COMMIT →/.test(await body())) { await clickText('COMMIT') }
  // watch the round
  for (let i = 0; i < 26; i++) {
    await sleep(200)
    const t = await body()
    if (!gotSpec && /LEFT ON THE TABLE|DODGED THE RUG|WATCHING THE ROUND/.test(t)) {
      await shot(`E-spectator-${round}-${i}`); console.log('SPEC:', t.match(/(LEFT ON THE TABLE[^Y]*|DODGED THE RUG[^Y]*|WATCHING THE ROUND[^Y]*)/)?.[0]); gotSpec = true
    }
    if (!gotDip && /RECOVERY POSSIBLE|DIP -/.test(t)) { await shot(`E-dip-${round}-${i}`); gotDip = true; console.log('DIP frame captured') }
    if (!gotWick && /WICK SAVE|GOD CANDLE/.test(t)) { await shot(`E-wick-${round}-${i}`); gotWick = true; console.log('WICK SAVE frame captured') }
    if (/SETTLED · CRASH|BET AGAIN/.test(t)) break
  }
  await sleep(300)
}
console.log('gotSpec', gotSpec, 'gotDip', gotDip, 'gotWick', gotWick)

// One more: capture a clean CASHED panel (auto fired) mid-spectate
await fresh()
await clickText('1.2x')
if (/COMMIT →/.test(await body())) await clickText('COMMIT')
for (let i = 0; i < 20; i++) {
  await sleep(220)
  const t = await body()
  if (/CASHED/.test(t) && /AT 1\.2/.test(t)) { await shot(`E-cashedpanel`); console.log('CASHED PANEL', t.match(/CASHED[^A]*AT [0-9.]+x/)?.[0]); break }
  if (/SETTLED · CRASH|BET AGAIN/.test(t)) break
}
await browser.close()
console.log('DONE')
