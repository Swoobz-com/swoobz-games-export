import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5784/'
const OUTDIR = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/vault-run/shots-rgc5-revert-reverify-0705'
fs.mkdirSync(OUTDIR, { recursive: true })

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function clickText(page, text) {
  const handle = await page.evaluateHandle((t) => {
    const all = Array.from(document.querySelectorAll('button'))
    return all.find((b) => b.textContent && b.textContent.trim().toLowerCase().includes(t.toLowerCase())) || null
  }, text)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

// Central fractional click points — avoids the edge-fraction padding-miss
// bug documented in AGENT_MEMORY.md (domHudActive reserved bands can push
// the tile grid off a naive 0.1 raster start).
const CENTER_POINTS = []
for (let gx = 3; gx <= 7; gx++) {
  for (let gy = 3; gy <= 7; gy++) {
    CENTER_POINTS.push([gx / 10, gy / 10])
  }
}

async function driveToSettle(page, { maxAttempts = 40 } = {}) {
  await clickText(page, 'MANUAL')
  const canvas = await page.$('[data-testid="vault-canvas-shell"] canvas')
  if (!canvas) return { reached: false, reason: 'no-canvas' }
  const box = await canvas.boundingBox()
  if (!box) return { reached: false, reason: 'no-box' }
  for (let i = 0; i < CENTER_POINTS.length && i < maxAttempts; i++) {
    const settleBtn = await page.$('[data-testid="vault-settled-betagain"]')
    if (settleBtn) return { reached: true }
    const [fx, fy] = CENTER_POINTS[i]
    const x = box.x + box.width * fx
    const y = box.y + box.height * fy
    await page.mouse.click(x, y)
    await sleep(150)
  }
  const settleBtn = await page.$('[data-testid="vault-settled-betagain"]')
  return { reached: !!settleBtn }
}

async function getOutcomeSnapshot(page) {
  return page.evaluate(() => {
    const doc = document
    const q = (t) => doc.querySelector(`[data-testid="${t}"]`)
    const boardRebet = q('vault-board-rebet')
    const boardRebetBtn = boardRebet ? boardRebet.querySelector('button') : null
    const nextBtn = q('vault-settled-next') ? q('vault-settled-next').querySelector('[data-testid="vault-settled-betagain"]') : q('vault-settled-betagain')
    function rectColor(el) {
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = window.getComputedStyle(el)
      return {
        x: r.x, y: r.y, width: r.width, height: r.height,
        background: cs.background, backgroundColor: cs.backgroundColor, backgroundImage: cs.backgroundImage,
        text: el.textContent,
      }
    }
    const resultCard = q('vault-settled-result')
    const metaCard = q('vault-settled-meta')
    const receiptCard = q('vault-settled-receipt-card')
    return {
      boardRebetBtn: rectColor(boardRebetBtn),
      nextBetBtn: rectColor(nextBtn),
      resultCardText: resultCard ? resultCard.textContent : null,
      metaCardText: metaCard ? metaCard.textContent : null,
      receiptCardText: receiptCard ? receiptCard.textContent : null,
      resultCardEyebrowColor: resultCard ? window.getComputedStyle(resultCard.querySelector('span')).color : null,
      newSetupPresent: Array.from(doc.querySelectorAll('button')).some((b) => b.textContent && b.textContent.toLowerCase().includes('new setup')),
      changeModePresent: Array.from(doc.querySelectorAll('button')).some((b) => b.textContent && b.textContent.toLowerCase().includes('change mode')),
      sidebarPulseCount: doc.querySelectorAll('[data-testid="vault-gutter-card-a"]').length,
      pageHTML_bodyTextIncludesBAGGED: doc.body.textContent.includes('BAGGED'),
      pageHTML_bodyTextIncludesRUGGED: doc.body.textContent.includes('RUGGED'),
    }
  })
}

async function toggleReceiptAndCheck(page) {
  const before = await page.evaluate(() => !!document.getElementById('vault-gutter-settled-receipt'))
  const toggle = await page.$('.vault-receipt-toggle')
  let clicked = false
  if (toggle) { await toggle.click(); clicked = true; await sleep(200) }
  const after = await page.evaluate(() => {
    const el = document.getElementById('vault-gutter-settled-receipt')
    if (!el) return { present: false }
    const r = el.getBoundingClientRect()
    const cs = window.getComputedStyle(el)
    return { present: true, rect: { x: r.x, y: r.y, width: r.width, height: r.height }, color: cs.color, fontSize: cs.fontSize, text: el.textContent.slice(0, 300) }
  })
  return { toggleFound: clicked, before, after }
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  const results = {}

  // ── LOSS drive (small grid, high mine density to force a rug quickly) ──
  {
    const page = await browser.newPage()
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(BASE, { waitUntil: 'networkidle0' })
    await sleep(400)
    await clickText(page, 'ape in')
    await sleep(300)
    const sendIt = await page.$('[data-testid="vault-betentry-confirm"] button')
    if (sendIt) await sendIt.click()
    await sleep(400)
    const drive = await driveToSettle(page, { maxAttempts: 25 })
    await sleep(400)
    await page.screenshot({ path: `${OUTDIR}/settled-A.png`, fullPage: true })
    const snap = await getOutcomeSnapshot(page)
    const receipt = await toggleReceiptAndCheck(page)
    results.attemptA = { drive, snap, receipt, pageErrors }
    await page.close()
  }

  // Repeat drives — since RNG determines win/loss, keep going until we've
  // captured one WIN and one LOSS settle (real RNG, no seed override).
  // WIN drive: tap exactly ONE tile, then TAKE PROFIT immediately (a single
  // safe reveal always yields cumulativeMultiplierBps > 10_000, i.e. a real
  // win) rather than sweeping the whole board (which almost always hits a
  // mine on a 5x5/3-mine board before all safes are found).
  const wins = []
  const losses = []
  for (let round = 0; round < 8 && wins.length === 0; round++) {
    const page = await browser.newPage()
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(BASE, { waitUntil: 'networkidle0' })
    await sleep(400)
    await clickText(page, 'ape in')
    await sleep(300)
    const sendIt = await page.$('[data-testid="vault-betentry-confirm"] button')
    if (sendIt) await sendIt.click()
    await sleep(400)
    await clickText(page, 'MANUAL')
    const canvas = await page.$('[data-testid="vault-canvas-shell"] canvas')
    const box = canvas ? await canvas.boundingBox() : null
    if (box) {
      // Central single tap — safe on a 5x5/3-mine board most of the time;
      // if it's a mine this attempt becomes a LOSS capture instead (fine,
      // we still want at least one of each).
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
      await sleep(300)
      const mineHitAlready = await page.$('[data-testid="vault-settled-betagain"]')
      if (!mineHitAlready) await clickText(page, 'take profit')
      await sleep(400)
    }
    const settleBtn = await page.$('[data-testid="vault-settled-betagain"]')
    if (settleBtn) {
      const snap = await getOutcomeSnapshot(page)
      const isWin = snap.resultCardText && !snap.resultCardText.includes('BUST')
      const isLoss = snap.resultCardText && snap.resultCardText.includes('BUST')
      const tag = `winattempt${round}`
      await page.screenshot({ path: `${OUTDIR}/${tag}-${isWin ? 'WIN' : isLoss ? 'LOSS' : 'UNK'}.png`, fullPage: true })
      const receipt = await toggleReceiptAndCheck(page)
      const record = { round, snap, receipt, pageErrors }
      if (isWin && wins.length === 0) wins.push(record)
      if (isLoss && losses.length === 0) losses.push(record)
    }
    await page.close()
  }
  results.wins = wins
  results.losses = losses.length ? losses : results.attemptA ? [results.attemptA] : []

  await browser.close()
  fs.writeFileSync(`${OUTDIR}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
