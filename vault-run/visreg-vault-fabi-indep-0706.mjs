// visreg-vault-fabi-0706.mjs — INDEPENDENT visual-regression verifier for the
// RUG OR RICHES (vault) FIXED 5-ZONE GRID CHASSIS rebuild.
// Fresh puppeteer-core driver, does not reuse/trust prior scripts' numbers.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5194'
const OUT = process.argv[3] || 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/shots-visreg-vault-0706'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
      null
    )
  }, { t, within })
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }
  }, sel)
}

async function viewportInfo(page) {
  return page.evaluate(() => ({
    innerW: window.innerWidth, innerH: window.innerHeight,
    scrollH: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth,
  }))
}

// Guardrail 1 — count VISIBLE elements whose own trimmed text is exactly
// "YOUR BET" or contains "INZET" (the pre-existing Dutch Playing-phase copy).
async function betFieldProbe(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('span,div,label')]
    const hits = []
    for (const e of all) {
      // only leaf-ish: no element children with the same matching text (avoid
      // double-counting a label + its ancestor wrapper)
      const txt = (e.childNodes.length && [...e.childNodes].every(n => n.nodeType === 3)) ? (e.textContent || '').trim() : ''
      if (/^YOUR BET$/i.test(txt) || /INZET/i.test(txt)) {
        const r = e.getBoundingClientRect()
        const visible = e.offsetParent !== null && r.width > 0 && r.height > 0
        if (visible) hits.push({ tag: e.tagName, text: txt, testid: e.closest('[data-testid]')?.getAttribute('data-testid') || null, top: Math.round(r.top), left: Math.round(r.left) })
      }
    }
    return hits
  })
}

// Guardrail 3 — world-picker presence: any visible vault-world-card-* node.
async function pickerProbe(page) {
  return page.evaluate(() => {
    const modes = ['bluechips', 'altseason', 'shitcoin']
    const hits = []
    for (const m of modes) {
      const el = document.querySelector(`[data-testid="vault-world-card-${m}"]`)
      if (!el) continue
      const r = el.getBoundingClientRect()
      const visible = el.offsetParent !== null && r.width > 0 && r.height > 0
      if (visible) hits.push({ mode: m, top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) })
    }
    return hits
  })
}

// Guardrail 4 — settled result phantom-payout probe.
async function resultProbe(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-result"]')
    if (!el) return null
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
    return {
      text,
      hasBust: /BUST/.test(text),
      hasPlus: /\+\s*[\d.]/.test(text),
      hasMinus: /-\s*[\d.]/.test(text),
    }
  })
}

// Guardrail 6 — panel left/right edges for every visible vault-ctl-*/vault-
// betentry-* panel in the control column.
async function panelEdges(page) {
  return page.evaluate(() => {
    const sels = [...document.querySelectorAll('[data-testid^="vault-ctl-"],[data-testid^="vault-betentry-"]')]
    return sels.map((e) => {
      const r = e.getBoundingClientRect()
      const visible = e.offsetParent !== null && r.width > 0 && r.height > 0
      return visible ? { testid: e.getAttribute('data-testid'), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) } : null
    }).filter(Boolean)
  })
}

// Scenic-backdrop guard — 3x3 sample grid on the actual <canvas>, computed
// via direct getImageData (not the screenshot PNG) so letterboxing doesn't
// skew samples.
async function scenicProbe(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    if (r.width < 10 || r.height < 10) return null
    let ctx
    try { ctx = c.getContext('2d') } catch { return null }
    if (!ctx) return { error: 'no-2d-context (webgl canvas?)' }
    const pts = []
    for (const fx of [0.15, 0.5, 0.85]) {
      for (const fy of [0.2, 0.5, 0.8]) {
        const px = Math.floor(c.width * fx)
        const py = Math.floor(c.height * fy)
        try {
          const d = ctx.getImageData(px, py, 1, 1).data
          pts.push({ fx, fy, r: d[0], g: d[1], b: d[2], a: d[3] })
        } catch (e) {
          pts.push({ fx, fy, error: String(e) })
        }
      }
    }
    return pts
  })
}

function variance(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  return arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
}

async function clickBoardCells(page, cells, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return false
  for (const [col, row] of cells) {
    const fx = 0.08 + ((col + 0.5) / cols) * 0.84
    const fy = 0.1 + ((row + 0.5) / rows) * 0.78
    await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
    await wait(350)
    const settled = await page.evaluate(() => !!(document.querySelector('[data-testid="vault-settled-banner"]') || document.querySelector('[data-testid="vault-settledpanel"]')))
    if (settled) return true
  }
  return false
}

async function dismissOnboarding(page) {
  await wait(600)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(250)
}

const report = { port: PORT, desktop: {}, mobile: {}, consoleErrors: [] }

async function runDesktopHeight(browser, h) {
  const page = await browser.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
  await page.setViewport({ width: 1440, height: h, deviceScaleFactor: 1 })
  const hr = { height: h }

  // ---------- READY (BetEntry) ----------
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await dismissOnboarding(page)
  await clickText(page, 'ape in')
  await wait(500)
  hr.ready = {
    board: await rect(page, '[data-testid="vault-canvas-shell"]'),
    hud: await rect(page, '[data-testid="vault-grid-hud-inner"]'),
    ctrl: await rect(page, '[data-testid="DesktopControlColumn"]'),
    cta: await rect(page, '[data-testid="vault-ctl-cta"]'),
    picker: await pickerProbe(page),
    betFields: await betFieldProbe(page),
    panels: await panelEdges(page),
    viewport: await viewportInfo(page),
  }
  await page.screenshot({ path: `${OUT}/h${h}-ready.png` })

  // pick bluechips explicitly (default anyway) then SEND IT -> Live
  await clickText(page, 'bluechips')
  await wait(150)
  await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(700)

  // ---------- LIVE (Playing) ----------
  hr.live = {
    board: await rect(page, '[data-testid="vault-canvas-shell"]'),
    hud: await rect(page, '[data-testid="vault-grid-hud-inner"]'),
    ctrl: await rect(page, '[data-testid="DesktopControlColumn"]'),
    cta: await rect(page, '[data-testid="vault-ctl-cta"]'),
    picker: await pickerProbe(page),
    betFields: await betFieldProbe(page),
    panels: await panelEdges(page),
    viewport: await viewportInfo(page),
  }
  await page.screenshot({ path: `${OUT}/h${h}-live.png` })

  // reveal 2 safe-ish tiles near center, then take profit -> WIN
  await clickBoardCells(page, [[1, 1], [3, 3]], 5, 5)
  await clickText(page, 'take profit')
  await wait(300)
  await clickText(page, 'cash')
  await wait(700)

  // ---------- RESULT WIN (Settled) ----------
  hr.resultWin = {
    board: await rect(page, '[data-testid="vault-canvas-shell"]'),
    hud: await rect(page, '[data-testid="vault-grid-hud-inner"]') || await rect(page, '[data-testid="vault-settled-banner"]'),
    ctrl: await rect(page, '[data-testid="DesktopControlColumn"]'),
    cta: await rect(page, '[data-testid="vault-settled-betagain"]'),
    picker: await pickerProbe(page),
    betFields: await betFieldProbe(page),
    panels: await panelEdges(page),
    result: await resultProbe(page),
    viewport: await viewportInfo(page),
  }
  await page.screenshot({ path: `${OUT}/h${h}-result-win.png` })

  // ---------- reload for a fresh round -> RUG / loss ----------
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await dismissOnboarding(page)
  await clickText(page, 'ape in')
  await wait(500)
  await clickText(page, 'shitcoin') // 24/49 mines, high-probability rug
  await wait(150)
  await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(700)
  const hitMine = await clickBoardCells(page, [[1, 1], [3, 3], [5, 5], [1, 5], [5, 1], [3, 1], [1, 3]], 7, 7)
  await wait(900)

  hr.resultLoss = {
    forcedMineHit: hitMine,
    board: await rect(page, '[data-testid="vault-canvas-shell"]'),
    hud: await rect(page, '[data-testid="vault-grid-hud-inner"]') || await rect(page, '[data-testid="vault-settled-banner"]'),
    ctrl: await rect(page, '[data-testid="DesktopControlColumn"]'),
    cta: await rect(page, '[data-testid="vault-settled-betagain"]'),
    picker: await pickerProbe(page),
    betFields: await betFieldProbe(page),
    panels: await panelEdges(page),
    result: await resultProbe(page),
    scenic: await scenicProbe(page),
    viewport: await viewportInfo(page),
  }
  await page.screenshot({ path: `${OUT}/h${h}-result-loss.png` })

  // scenic backdrop on the WIN result screenshot's own page state too (re-nav)
  hr.scenicReady = null
  {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await dismissOnboarding(page)
    await clickText(page, 'ape in')
    await wait(500)
    hr.scenicReady = await scenicProbe(page)
  }

  if (errs.length) report.consoleErrors.push({ height: h, errs })
  await page.close()
  return hr
}

async function runMobile(browser) {
  const page = await browser.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  const mr = {}

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await dismissOnboarding(page)
  await clickText(page, 'ape in')
  await wait(500)
  mr.ready = {
    board: await rect(page, '[data-testid="vault-canvas-shell"]'),
    cta: await rect(page, '[data-testid="bet-console"] button'),
    picker: await pickerProbe(page),
    betFields: await betFieldProbe(page),
    viewport: await viewportInfo(page),
    scenic: await scenicProbe(page),
  }
  await page.screenshot({ path: `${OUT}/mobile-ready.png` })

  await clickText(page, 'bluechips')
  await wait(150)
  await clickText(page, 'send it')
  await wait(700)
  mr.live = {
    board: await rect(page, '[data-testid="vault-canvas-shell"]'),
    picker: await pickerProbe(page),
    betFields: await betFieldProbe(page),
    viewport: await viewportInfo(page),
  }
  await page.screenshot({ path: `${OUT}/mobile-live.png` })

  await clickBoardCells(page, [[1, 1], [3, 3]], 5, 5)
  await clickText(page, 'take profit')
  await wait(300)
  await clickText(page, 'cash')
  await wait(700)
  mr.resultWin = {
    board: await rect(page, '[data-testid="vault-canvas-shell"]'),
    picker: await pickerProbe(page),
    betFields: await betFieldProbe(page),
    result: await resultProbe(page),
    viewport: await viewportInfo(page),
  }
  await page.screenshot({ path: `${OUT}/mobile-result-win.png` })

  if (errs.length) report.consoleErrors.push({ height: 'mobile-390', errs })
  await page.close()
  return mr
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
  for (const h of [900, 1000, 1080, 1118]) {
    report.desktop[h] = await runDesktopHeight(browser, h)
    console.log(`=== desktop h${h} done ===`)
  }
  report.mobile = await runMobile(browser)
  console.log('=== mobile done ===')
  await browser.close()
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log('WROTE', `${OUT}/report.json`)
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
