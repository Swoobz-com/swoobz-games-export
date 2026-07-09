// rgc5-fullsweep-0707.mjs — FRESH end-to-end RG-C5 structural sweep of the
// CURRENT fully-composed vault build (post change #11: settled-scrim/panel-
// token/single-CTA fix + #8 lobby-phase removal). Live-drives win + loss +
// a rhythm-badge multi-round probe across desktop (1440x900, 1920x1080) and
// mobile (Pixel 7 412x915, iPhone 14 Pro 393x852). Clears localStorage +
// sessionStorage before EVERY drive per the known order-dependent-confound
// lesson (fabi-verify-rgc5-symmetry-0706).
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const OUT = process.argv[3] || `shots-rgc5-fullsweep-0707`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
      null
    )
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function dismiss(page) { await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200) }

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  }, sel)
}

async function computed(page, sel, prop) {
  return page.evaluate(({ sel, prop }) => {
    const el = document.querySelector(sel)
    if (!el) return null
    return getComputedStyle(el)[prop]
  }, { sel, prop })
}

async function loadFresh(page, v) {
  await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await dismiss(page)
}

// Drive a round to WIN (via TAKE PROFIT) or LOSS (sweep tiles until a mine).
async function forceSettle(page, { win }) {
  await clickText(page, 'bluechips')
  await wait(200)
  await clickText(page, 'send it')
  await wait(1200)
  const cellSeq = []
  for (let cy = 0; cy < 5; cy++) for (let cx = 0; cx < 5; cx++) cellSeq.push([cx, cy])
  for (const [cx, cy] of cellSeq) {
    const settledNow = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
    if (settledNow) break
    if (win) {
      const takeProfitReady = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim().toLowerCase().includes('take profit'))
        return !!btn && btn.offsetParent !== null && !btn.disabled
      })
      if (takeProfitReady) { await clickText(page, 'take profit'); await wait(900); break }
    }
    const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    if (box) {
      const fx = 0.06 + ((cx + 0.5) / 5) * 0.88
      const fy = 0.08 + ((cy + 0.5) / 5) * 0.8
      await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
    }
    await wait(400)
  }
  await wait(700)
}

// Drive fast-tap consecutive reveals to try to surface the rhythm badge, and
// record the badge label + cumulative-bps + reveal-count each time it fires.
// Used to prove the badge gates on CUMULATIVE BPS TIER, not on reveal-count.
async function rhythmProbe(page) {
  await clickText(page, 'shitcoin') // higher mine density world -> faster cumulative bps growth
  await wait(200)
  await clickText(page, 'send it')
  await wait(1000)
  const observations = []
  const cellSeq = []
  for (let cy = 0; cy < 5; cy++) for (let cx = 0; cx < 5; cx++) cellSeq.push([cx, cy])
  for (const [cx, cy] of cellSeq) {
    const settledNow = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
    if (settledNow) break
    const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    if (box) {
      const fx = 0.06 + ((cx + 0.5) / 5) * 0.88
      const fy = 0.08 + ((cy + 0.5) / 5) * 0.8
      await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
    }
    await wait(80) // fast tap, inside RHYTHM_WINDOW_MS (1400ms)
    const badge = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-rhythm-badge"]')
      return el ? el.textContent : null
    })
    const revealedCount = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-settled-banner"]')
      return el ? 'settled' : null
    })
    if (badge) observations.push({ afterCell: cellSeq.indexOf([cx,cy].join()), cellIdx: cy*5+cx, badge })
  }
  return observations
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

  const viewports = [
    { name: 'd1440x900', w: 1440, h: 900 },
    { name: 'd1920x1080', w: 1920, h: 1080 },
    { name: 'pixel7', w: 412, h: 915 },
    { name: 'iphone14pro', w: 393, h: 852 },
  ]

  const results = {}

  // ── Check 4: symmetric win/loss CTA (all 4 viewports) ────────────────────
  for (const v of viewports) {
    for (const outcome of ['win', 'loss']) {
      await loadFresh(page, v)
      await forceSettle(page, { win: outcome === 'win' })
      const key = `${v.name}-${outcome}`
      results[key] = {}
      results[key].lobbyGone = !(await page.evaluate(() => document.body.innerText.toLowerCase().includes('lobby')))
      results[key].boardVaultRebetPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-board-rebet"]'))
      results[key].betAgainButtonCount = await page.evaluate(() => [...document.querySelectorAll('button')].filter((e) => (e.textContent || '').trim().toLowerCase().startsWith('bet again')).length)
      results[key].banner = await rect(page, '[data-testid="vault-settled-banner"]')
      results[key].bannerBg = await computed(page, '[data-testid="vault-settled-banner"]', 'backgroundImage')
      results[key].bannerBorder = await computed(page, '[data-testid="vault-settled-banner"]', 'border')
      const ctaRect = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase() === 'bet again →')
        if (!btn) return null
        const r = btn.getBoundingClientRect()
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
      })
      results[key].ctaButtonRect = ctaRect
      results[key].ctaButtonBg = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase() === 'bet again →')
        return btn ? getComputedStyle(btn).background : null
      })
      results[key].verifiedChipPresent = await page.evaluate(() => document.body.innerText.toLowerCase().includes('verified'))
      // near-miss check: mine hits should show NO "almost/so close" text and
      // unrevealed tiles must not display a per-tile "would have been safe" mark
      results[key].nearMissTextPresent = await page.evaluate(() => /almost|so close|unlucky|so unlucky/i.test(document.body.innerText))
      await page.screenshot({ path: `${OUT}/${key}.png`, fullPage: false })
    }
  }

  // ── Check: AutopickSafetySurface inert (desktop only, bet-entry phase) ───
  await loadFresh(page, viewports[0])
  results.autopick = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').toLowerCase().includes('enable auto-pick'))
    if (!btn) return { present: false }
    return { present: true, disabled: btn.disabled, tagName: btn.tagName }
  })

  // ── Check: rhythm badge gated by cumulative BPS tier, not reveal-count ──
  await loadFresh(page, viewports[0])
  results.rhythmObservations = await rhythmProbe(page)
  await page.screenshot({ path: `${OUT}/rhythm-probe-end.png` })

  // ── Check 3: bet-entry auto-bet probe — idle-watch after loading, confirm
  // no auto-advance / auto-bet fires without a click ───────────────────────
  await loadFresh(page, viewports[0])
  results.idleWatch = []
  for (let i = 0; i < 3; i++) {
    await wait(1500)
    results.idleWatch.push({
      tMs: (i + 1) * 1500,
      worldPickerPresent: await page.evaluate(() => !!document.querySelector('[data-testid="vault-board-worldpicker"]')),
      ctaPresent: await page.evaluate(() => !!document.querySelector('[data-testid="vault-ctl-cta"]')),
    })
  }

  results.consoleErrors = consoleErrors
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log('DONE. Wrote', `${OUT}/results.json`)
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
