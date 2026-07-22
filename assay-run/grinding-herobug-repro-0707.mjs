// TARGETED REPRO: does a stale "SECURED THE HAUL" hero-pop cartouche leak
// onto a SUBSEQUENT BUST if the player restarts (DIVE AGAIN / SAME LINE)
// quickly after a WIN, before HERO_POP_HOLD_MS (1700ms) naturally expires?
// Control run included: a bust with NO preceding recent win must show NO
// hero-pop at all (baseline correctness check).
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-herobug-repro-0707'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, txt) {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b && !b.disabled) { b.click(); return true }
    return false
  }, txt)
}
async function bodyText(page) { return page.evaluate(() => document.body.innerText) }
async function getCanvasBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
async function paintTiles(page, n) {
  const box = await getCanvasBox(page)
  const dim = 14
  const tile = box.w / dim
  const coords = []
  let count = 0
  for (let row = 0; row < dim && count < n; row++) for (let col = 0; col < dim && count < n; col++) { coords.push([row, col]); count++ }
  for (const [row, col] of coords) { await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2); await wait(5) }
  return count
}
async function setPace(page, target) {
  for (let i = 0; i < 3; i++) {
    const txt = await bodyText(page)
    if (target === 'instant' && txt.includes('PACE: INSTANT')) return true
    if (target === 'staggered' && txt.includes('PACE: DUCAT-BY-DUCAT')) return true
    await clickText(page, 'PACE:'); await wait(50)
  }
  return false
}
async function setTier(page, label) { await clickText(page, label); await wait(50); return (await bodyText(page)).includes(label) }
async function goToPlanning(page) { const txt = await bodyText(page); if (txt.includes('ENTER THE DIVE')) { await clickText(page, 'ENTER THE DIVE'); await wait(120) } }
async function clearTrail(page) { await clickText(page, 'CLEAR'); await wait(30) }
async function readSettledCert(page) {
  return page.evaluate(() => {
    const headingDiv = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && (d.textContent === 'RUGGED BY THE DEEP' || d.textContent === 'SECURED THE HAUL'))
    if (!headingDiv) return null
    const payoutLabel = [...document.querySelectorAll('div')].find((d) => d.textContent === 'PAYOUT')
    const payoutVal = payoutLabel && payoutLabel.parentElement ? payoutLabel.parentElement.children[1]?.textContent : null
    return { heading: headingDiv.textContent, payout: payoutVal }
  })
}
async function readHeroPop(page) {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.textContent && d.textContent.includes('SECURED THE HAUL') && d.getAttribute('aria-hidden') === 'true')
    if (!el) return { present: false }
    const cartouche = el.querySelector('div')
    const spans = cartouche ? [...cartouche.querySelectorAll('span')] : []
    const multSpan = spans.find((s) => /\d+\.\d+x/.test(s.textContent || ''))
    return { present: true, multText: multSpan ? multSpan.textContent : null, fullText: cartouche ? cartouche.textContent : null }
  })
}
async function waitForSettled(page, maxMs) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const txt = await bodyText(page)
    if ((txt.includes('RUGGED BY THE DEEP') || txt.includes('SECURED THE HAUL')) && txt.includes('WRECK RECKONING')) return true
    await wait(25)
  }
  return false
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 } })
const page = (await browser.pages())[0]
await page.goto(URL, { waitUntil: 'networkidle0' })
await wait(200)

console.log('=== PHASE 1: force a WIN on REEF SHELF (lean), instant, L=8 (fast, deterministic) ===')
await goToPlanning(page)
let won = false
let winSettleTs = null
for (let i = 0; i < 20 && !won; i++) {
  await clearTrail(page)
  await setTier(page, 'REEF SHELF')
  await setPace(page, 'instant')
  await paintTiles(page, 8)
  await clickText(page, 'RUN THE LINE')
  await waitForSettled(page, 4000)
  const cert = await readSettledCert(page)
  if (cert && cert.heading === 'SECURED THE HAUL') { won = true; winSettleTs = Date.now() }
  else { await clickText(page, 'DIVE AGAIN'); await wait(150) }
}
console.log('win forced:', won)
const heroAtWin = await readHeroPop(page)
console.log('hero-pop right after the win:', JSON.stringify(heroAtWin))

console.log('\n=== PHASE 2: IMMEDIATELY (< 500ms) click DIVE AGAIN, then race into a BUST on HADAL TRENCH before the 1700ms hold would naturally expire ===')
const msSinceWin = Date.now() - winSettleTs
console.log('ms since win settle before clicking DIVE AGAIN:', msSinceWin)
await clickText(page, 'DIVE AGAIN')
await wait(60)
await clearTrail(page)
await setTier(page, 'HADAL TRENCH')
await setPace(page, 'staggered') // staggered so we can screenshot mid-hold if needed
let bustPainted = null
let bustCert = null
let heroAtBust = null
for (let i = 0; i < 10; i++) {
  await clearTrail(page)
  await setTier(page, 'HADAL TRENCH')
  bustPainted = await paintTiles(page, 40)
  await clickText(page, 'RUN THE LINE')
  await waitForSettled(page, 6000)
  bustCert = await readSettledCert(page)
  if (bustCert && bustCert.heading === 'RUGGED BY THE DEEP') {
    heroAtBust = await readHeroPop(page)
    break
  } else {
    // won again (rare on 16-bomb/40-tile) -- restart quickly and retry the race
    await clickText(page, 'DIVE AGAIN')
    await wait(60)
  }
}
console.log('bust cert:', JSON.stringify(bustCert))
console.log('hero-pop AT THE BUST (should be present:false if correct):', JSON.stringify(heroAtBust))
await page.screenshot({ path: `${OUT}/repro-quickrestart-then-bust.png` })

console.log('\n=== CONTROL: a bust with NO recent win (fresh reload) — baseline must show hero-pop present:false ===')
await page.goto(URL, { waitUntil: 'networkidle0' })
await wait(200)
await goToPlanning(page)
let controlCert = null
let heroAtControlBust = null
for (let i = 0; i < 10; i++) {
  await clearTrail(page)
  await setTier(page, 'HADAL TRENCH')
  await setPace(page, 'instant')
  await paintTiles(page, 40)
  await clickText(page, 'RUN THE LINE')
  await waitForSettled(page, 4000)
  controlCert = await readSettledCert(page)
  if (controlCert && controlCert.heading === 'RUGGED BY THE DEEP') {
    heroAtControlBust = await readHeroPop(page)
    break
  } else {
    await clickText(page, 'DIVE AGAIN'); await wait(150)
  }
}
console.log('control bust cert:', JSON.stringify(controlCert))
console.log('hero-pop at CONTROL bust (fresh session, no recent win):', JSON.stringify(heroAtControlBust))
await page.screenshot({ path: `${OUT}/control-fresh-bust.png` })

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({
  win: { won, msSinceWin, heroAtWin },
  quickRestartThenBust: { bustPainted, bustCert, heroAtBust },
  control: { controlCert, heroAtControlBust },
}, null, 2))

await browser.close()
console.log('\nDONE.')
