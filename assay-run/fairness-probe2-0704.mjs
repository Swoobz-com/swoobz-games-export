import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5186/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-fairness-qa-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const TIER_ARG = process.argv[2] || 'standard' // 'standard' | 'flooded' | 'lean'
const TIER_LABEL = { lean: 'Lean Floor', standard: 'Standard Floor', flooded: 'Flooded Floor' }[TIER_ARG]

const clickText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})

const getAssayState = (page) => page.evaluate(() => {
  function bigintSafe(obj) {
    return JSON.parse(JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() + 'n' : v)))
  }
  function findFiberRoot() {
    const root = document.getElementById('root')
    const key = Object.keys(root).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'))
    return root[key]
  }
  function bfsFindAssayState(startFiber) {
    const seen = new Set()
    const queue = [startFiber]
    const candidates = []
    while (queue.length) {
      const fiber = queue.shift()
      if (!fiber || seen.has(fiber)) continue
      seen.add(fiber)
      let hook = fiber.memoizedState
      let guard = 0
      while (hook && guard < 30) {
        const v = hook.memoizedState
        if (v && typeof v === 'object' && 'phase' in v && 'balanceLamports' in v && 'selectedTier' in v) {
          candidates.push(v)
        }
        hook = hook.next
        guard++
      }
      if (fiber.child) queue.push(fiber.child)
      if (fiber.sibling) queue.push(fiber.sibling)
    }
    return candidates
  }
  const rootFiber = findFiberRoot()
  const candidates = bfsFindAssayState(rootFiber)
  // Prefer the one whose phase looks most "advanced" — just return all, caller picks.
  return candidates.map(bigintSafe)
})

async function pickBestState(page) {
  const all = await getAssayState(page)
  if (!all.length) return null
  // Prefer a 'settled' one if any, else the last found.
  const settled = all.find((s) => s.phase.kind === 'settled')
  return settled || all[all.length - 1]
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(600)

console.log('[1] initial state:', JSON.stringify((await pickBestState(page))?.phase))

await clickText(page, 'ENTER THE ASSAY LINE')
await wait(500)
console.log('[2] after ENTER:', JSON.stringify((await pickBestState(page))?.phase?.kind))

const tierClicked = await clickText(page, TIER_LABEL)
console.log('[3] tier click', TIER_LABEL, '->', tierClicked)
await wait(300)
let s3 = await pickBestState(page)
console.log('[3b] selectedTier now:', s3.selectedTier)

const box = await canvasBox(page)
console.log('[4] canvas box:', box)
const tile = box.w / 10
for (let col = 0; col < 8; col++) {
  await page.mouse.click(box.x + col * tile + tile / 2, box.y + 0 * tile + tile / 2)
  await wait(30)
}
await wait(200)
let s4 = await pickBestState(page)
console.log('[5] trail after paint:', s4.trail, 'len', s4.trail.length, 'canPlunge? phase=', s4.phase.kind)

await page.screenshot({ path: `${OUT}/${TIER_ARG}-step-planning.png` })

const plungeClicked = await clickText(page, 'THROW BREAKER')
console.log('[6] plunge clicked:', plungeClicked)

let settledState = null
for (let i = 0; i < 100; i++) {
  await wait(200)
  const s = await pickBestState(page)
  if (i % 5 === 0) console.log(`[7.${i}] phase:`, s.phase.kind)
  if (s.phase.kind === 'settled') { settledState = s; break }
}

await page.screenshot({ path: `${OUT}/${TIER_ARG}-step-settled.png` })

fs.writeFileSync(`${OUT}/${TIER_ARG}-capture.json`, JSON.stringify(settledState, null, 2))
fs.writeFileSync(`${OUT}/${TIER_ARG}-console-errors.json`, JSON.stringify(errors, null, 2))

console.log('=== RESULT for', TIER_ARG, '===')
console.log('errors:', errors.length, errors.slice(0, 5))
if (!settledState) {
  console.log('NO SETTLE REACHED')
} else {
  const o = settledState.phase.outcome
  console.log('won:', o.won, 'tier:', o.tier, 'bombCount:', o.bombCount, 'gridDim:', o.gridDim)
  console.log('serverSeedHex:', o.serverSeedHex)
  console.log('serverSeedHashHex:', o.serverSeedHashHex)
  console.log('roundIdHex:', o.roundIdHex)
  console.log('committedTrail:', o.committedTrail)
  console.log('revealedSafe:', o.revealedSafe)
  console.log('veinTileIdx:', o.veinTileIdx)
  console.log('bombBitmap indices:', o.bombBitmap.map((b, i) => (b ? i : null)).filter((x) => x !== null))
  console.log('finalMultiplierBps:', o.finalMultiplierBps, 'payoutLamports:', o.payoutLamports, 'wagerLamports:', o.wagerLamports)
}

await browser.close()
