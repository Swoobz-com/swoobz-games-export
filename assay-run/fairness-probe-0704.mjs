import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5186/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-fairness-qa-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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

// Extract the AssayState from React fiber (first hook of AssayExperience is
// useAssayController()'s internal useState<AssayState>). Serializes bigints
// as "<digits>n" strings so JSON survives the page.evaluate boundary.
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
    while (queue.length) {
      const fiber = queue.shift()
      if (!fiber || seen.has(fiber)) continue
      seen.add(fiber)
      // Walk this fiber's hook list looking for a useState whose value looks like AssayState.
      let hook = fiber.memoizedState
      let guard = 0
      while (hook && guard < 30) {
        const v = hook.memoizedState
        if (v && typeof v === 'object' && 'phase' in v && 'balanceLamports' in v && 'selectedTier' in v) {
          return v
        }
        hook = hook.next
        guard++
      }
      if (fiber.child) queue.push(fiber.child)
      if (fiber.sibling) queue.push(fiber.sibling)
    }
    return null
  }
  const rootFiber = findFiberRoot()
  const state = bfsFindAssayState(rootFiber)
  return state ? bigintSafe(state) : null
})

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(600)

// ── Enter planning ──
await clickText(page, 'ENTER')
await wait(400)

const results = { rounds: [] }

async function pickTier(label) {
  // TierRow buttons have text like "Lean Floor", "Standard Floor", "Flooded Floor"
  return clickText(page, label)
}

async function paintTrail(n) {
  const box = await canvasBox(page)
  const tile = box.w / 10
  let count = 0
  for (let row = 0; row < 10 && count < n; row++) {
    for (let col = 0; col < 10 && count < n; col++) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(10)
    }
  }
  return count
}

async function plunge() {
  return clickText(page, 'THROW BREAKER')
}

async function waitForSettled(maxMs = 15000) {
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    const s = await getAssayState(page)
    if (s && s.phase && s.phase.kind === 'settled') return s
    await wait(150)
  }
  return null
}

async function runRoundForTier(tierLabel, tierId, trailLen) {
  // Ensure we're in planning with an empty trail.
  let s = await getAssayState(page)
  if (!s) throw new Error('could not locate AssayState via fiber')
  if (s.phase.kind === 'settled') {
    await clickText(page, 'ASSAY AGAIN') || (await clickText(page, 'CLOSE'))
    await wait(300)
    s = await getAssayState(page)
  }
  if (s.phase.kind === 'lobby') {
    await clickText(page, 'ENTER')
    await wait(300)
  }
  await pickTier(tierLabel)
  await wait(150)
  // clear trail first if any residual
  const cur = await getAssayState(page)
  if (cur.trail && cur.trail.length) {
    await clickText(page, 'CLEAR')
    await wait(100)
  }
  await paintTrail(trailLen)
  await wait(150)
  const beforePlunge = await getAssayState(page)
  await plunge()
  const settledState = await waitForSettled(20000)
  return { beforePlunge, settledState }
}

// ── Round 1: Standard tier ──
const r1 = await runRoundForTier('Standard Floor', 'standard', 8)
results.rounds.push({ tier: 'standard', ...r1 })
await page.screenshot({ path: `${OUT}/round1-standard-settled.png` })

// ── Round 2: Flooded tier ──
const r2 = await runRoundForTier('Flooded Floor', 'flooded', 8)
results.rounds.push({ tier: 'flooded', ...r2 })
await page.screenshot({ path: `${OUT}/round2-flooded-settled.png` })

fs.writeFileSync(`${OUT}/fiber-state-capture.json`, JSON.stringify(results, null, 2))
fs.writeFileSync(`${OUT}/console-errors.json`, JSON.stringify(errors, null, 2))

console.log('DONE. Errors:', errors.length)
for (const r of results.rounds) {
  const o = r.settledState?.phase?.outcome
  console.log('---', r.tier, '---')
  if (!o) { console.log('NO OUTCOME CAPTURED'); continue }
  console.log('won:', o.won, 'tier:', o.tier, 'bombCount:', o.bombCount, 'gridDim:', o.gridDim)
  console.log('serverSeedHex:', o.serverSeedHex)
  console.log('serverSeedHashHex:', o.serverSeedHashHex)
  console.log('roundIdHex:', o.roundIdHex)
  console.log('committedTrail:', o.committedTrail)
  console.log('revealedSafe:', o.revealedSafe)
  console.log('veinTileIdx:', o.veinTileIdx)
  console.log('bombBitmap indices:', o.bombBitmap.map((b, i) => (b ? i : null)).filter((x) => x !== null))
}

await browser.close()
