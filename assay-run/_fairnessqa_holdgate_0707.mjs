// swoobz-casino-fairness-qa CONSOLIDATED HOLDGATE — ABYSS LINE (assay), 2026-07-07
// Fresh, independent driver. Live localhost:5182. No source edits.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/shots-fairness-0707'
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
  let count = 0
  for (let row = 0; row < dim && count < n; row++) {
    for (let col = 0; col < dim && count < n; col++) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      await wait(15)
      count++
    }
  }
  return count
}
async function setTier(page, label) {
  await clickText(page, label)
  await wait(80)
  const txt = await bodyText(page)
  return txt.includes(label)
}
async function goToPlanning(page) {
  const txt = await bodyText(page)
  if (txt.includes('ENTER THE DIVE')) { await clickText(page, 'ENTER THE DIVE'); await wait(200) }
}
async function clearTrail(page) { await clickText(page, 'CLEAR'); await wait(50) }

async function driveOneRound(page, tierLabel, trailLen) {
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await wait(300)
  await goToPlanning(page)
  await setTier(page, tierLabel)
  await clearTrail(page)
  await paintTiles(page, trailLen)
  // fire the RUN/PLUNGE CTA (button text varies; try both known labels)
  let fired = await clickText(page, 'RUN THE LINE')
  if (!fired) fired = await clickText(page, 'PLUNGE')
  await wait(400)
  // poll up to 6s for settle (WIN or BUST headline)
  for (let i = 0; i < 60; i++) {
    const txt = await bodyText(page)
    if (/SECURED|RUGGED|WRECK RECKONING/i.test(txt)) return true
    await wait(100)
  }
  return false
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: { width: 1440, height: 900 } })
const page = await browser.newPage()
const consoleErrors = []
page.on('pageerror', (e) => consoleErrors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })

const report = {}

// ---- Try to reach a SETTLED state (retry a few times for WIN on REEF SHELF/8-tile) ----
let settled = false
for (let attempt = 0; attempt < 4 && !settled; attempt++) {
  settled = await driveOneRound(page, 'REEF SHELF', 8)
}
report.reachedSettled = settled

if (settled) {
  await page.screenshot({ path: `${OUT}/settled-full.png`, fullPage: true })

  // 1. NO MODAL check (real blocking dialog only)
  const modalCheck = await page.evaluate(() => {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')]
    return dialogs.map((d) => ({
      ariaModal: d.getAttribute('aria-modal'),
      pointerEvents: getComputedStyle(d).pointerEvents,
      text: d.textContent.slice(0, 60),
    }))
  })
  report.dialogs = modalCheck
  report.hasBlockingModal = modalCheck.some((d) => d.ariaModal === 'true' && d.pointerEvents !== 'none')

  // 2. Extract the EXACT rendered receipt text — leaf spans only (avoid ancestor
  //    textContent concatenation bug documented in memory).
  const receipt = await page.evaluate(() => {
    // find leaf elements (no element children) whose text contains 'seed' or 'hash'
    const all = [...document.querySelectorAll('*')]
    const leaves = all.filter((el) => el.children.length === 0 || [...el.children].every(c => c.tagName === 'svg' || c.tagName==='SPAN' && c.textContent.trim()===''))
    const seedSpan = all.find((el) => el.tagName === 'SPAN' && /seed\s/i.test(el.textContent) && !/hash/i.test(el.textContent))
    const hashSpan = all.find((el) => el.tagName === 'SPAN' && /hash\s/i.test(el.textContent))
    const roundLine = all.find((el) => el.children.length === 0 && /round /i.test(el.textContent || ''))
    const wreckLine = all.find((el) => el.textContent && el.textContent.includes('WRECK RECKONING'))
    return {
      seedSpanText: seedSpan ? seedSpan.textContent : null,
      hashSpanText: hashSpan ? hashSpan.textContent : null,
      roundLineText: roundLine ? roundLine.textContent : null,
      wreckLineText: wreckLine ? wreckLine.textContent : null,
    }
  })
  report.receipt = receipt

  // Extract just the hex payload after "seed" / "hash" label + nbsp
  function extractHex(labeled) {
    if (!labeled) return null
    const m = labeled.match(/([0-9a-f]{16,})$/i)
    return m ? m[1] : null
  }
  const seedHex = extractHex(receipt.seedSpanText)
  const hashHex = extractHex(receipt.hashSpanText)
  report.seedHexLen = seedHex ? seedHex.length : 0
  report.hashHexLen = hashHex ? hashHex.length : 0
  report.seedHex = seedHex
  report.hashHex = hashHex

  // 3. Auto-verify chip check (visible without click) — the whole certificate div
  //    itself IS the always-rendered receipt (no toggle in this game's markup);
  //    confirm no click was needed to reach this text (we never clicked any
  //    "view receipt" affordance above).
  const fullBodyText = await bodyText(page)
  report.certificateVisibleNoClick = fullBodyText.includes('WRECK RECKONING')

  // 4. Copy affordance presence
  const copyButtons = await page.evaluate(() =>
    [...document.querySelectorAll('button')].filter((b) => /copy/i.test(b.getAttribute('aria-label') || '') || /copy/i.test(b.textContent || '')).length
  )
  report.copyButtonCount = copyButtons

  // 5. Independently re-derive SHA-256(seedHex) and compare to hashHex
  if (seedHex) {
    const seedBytes = new Uint8Array(seedHex.match(/.{2}/g).map((h) => parseInt(h, 16)))
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', seedBytes))
    const rederived = [...digest].map((b) => b.toString(16).padStart(2, '0')).join('')
    report.rederivedHashMatchesDisplayed = rederived === hashHex
    report.rederivedHash = rederived
  }
}

report.consoleErrors = consoleErrors
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))

await browser.close()
