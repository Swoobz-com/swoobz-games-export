// Deterministic proof for BLOCKER 2: counts full-board rebakes vs incremental
// single-tile bakes DURING the reveal cascade (counters reset right before RUN
// THE LINE), plus the total canvas-bake ms spent. A per-disc full rebake => one
// full bake per revealed disc; the incremental fix => zero full bakes, one O(9)
// incremental bake per disc.
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const THROTTLE = Number(process.argv[2] || 6)

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
const client = await page.createCDPSession()

const rows = []
for (let attempt = 0; attempt < 8; attempt++) {
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await wait(450)
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /ENTER THE ASSAY LINE/i.test(x.textContent || '')); b && b.click() })
  await wait(250)
  await page.evaluate(() => {
    const heading = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /TEMPLE DEPTH/i.test(e.textContent || ''))
    let c = heading?.parentElement
    for (let i = 0; i < 4 && c; i++) { const btns = [...c.querySelectorAll('button')]; if (btns.length >= 2) { btns[0].click(); return } c = c.parentElement }
  })
  await wait(120)
  const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } })
  const TILE = geo.w / 14
  const cells = []
  for (let row = 3; row <= 7; row++) { const cols = row % 2 ? [3,4,5,6] : [6,5,4,3]; for (const col of cols) cells.push([col, row]) }
  for (const [col, row] of cells) { await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2); await wait(30) }
  await wait(200)
  // reset counters AFTER planning bakes, right before the reveal
  await page.evaluate(() => { window.__fullBakes = 0; window.__incBakes = 0; window.__fullBakeMs = 0; window.__incBakeMs = 0 })
  await client.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /RUN THE LINE/i.test(x.textContent || '')); b && b.click() })
  await wait(4200)
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  const c = await page.evaluate(() => ({ full: window.__fullBakes | 0, inc: window.__incBakes | 0, fullMs: +(window.__fullBakeMs || 0).toFixed(1), incMs: +(window.__incBakeMs || 0).toFixed(1) }))
  const res = await page.evaluate(() => /LINE CLAIMED|CLAIMED/i.test(document.body.innerText) ? 'WON' : /BUST/i.test(document.body.innerText) ? 'BUST' : '?')
  console.log(`attempt ${attempt}: ${res}  fullRebakes=${c.full} (${c.fullMs}ms)  incBakes=${c.inc} (${c.incMs}ms)`)
  rows.push(c)
}
const sum = k => rows.reduce((a, r) => a + r[k], 0)
console.log(`\n=== reveal-cascade bake tally (throttle ${THROTTLE}x, desktop 196 tiles, ${rows.length} runs) ===`)
console.log(`total full-board rebakes: ${sum('full')}  (${sum('fullMs').toFixed(0)}ms)`)
console.log(`total incremental bakes : ${sum('inc')}  (${sum('incMs').toFixed(0)}ms)`)
await browser.close()
