// holdgate-backdrop-verify.mjs — independent verifier for the RUG OR RICHES
// (vault) shell-wide backdrop DOM-layer change. Confirms the numeric layout
// spec (544/592/320, board-Y stability, CTA above fold, data-grid-* plumbing,
// hudInnerStyle, z-index/pointer-events) survived the change.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6317'
const OUT = process.argv[3] || 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/shots-holdgate-backdrop'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(
    ({ t, within }) => {
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
    },
    { t, within },
  )
  const el = h.asElement()
  if (!el) return false
  try {
    await el.click()
  } catch {
    return false
  }
  return true
}

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }
  }, sel)
}

async function gridAttrs(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-canvas-shell"]')
    if (!el) return null
    return {
      full: el.getAttribute('data-grid-full'),
      tile: el.getAttribute('data-grid-tile'),
      gap: el.getAttribute('data-grid-gap'),
      plate: el.getAttribute('data-grid-plate'),
    }
  })
}

async function backdropDiag(page) {
  return page.evaluate(() => {
    const bd = document.querySelector('[data-testid="vault-grid-backdrop"]')
    const cs = bd ? getComputedStyle(bd) : null
    const br = bd ? bd.getBoundingClientRect() : null
    return {
      present: !!bd,
      zIndex: cs ? cs.zIndex : null,
      pointerEvents: cs ? cs.pointerEvents : null,
      position: cs ? cs.position : null,
      backgroundImage: cs ? cs.backgroundImage.slice(0, 100) : null,
      rect: br ? { l: Math.round(br.left), t: Math.round(br.top), r: Math.round(br.right), b: Math.round(br.bottom) } : null,
    }
  })
}

async function hudInnerVsBoard(page) {
  return page.evaluate(() => {
    const hud = document.querySelector('[data-testid="vault-grid-hud-inner"], [data-testid="vault-settled-banner"]')
    const board = document.querySelector('[data-testid="vault-canvas-shell"]')
    if (!hud || !board) return null
    const hr = hud.getBoundingClientRect()
    const br = board.getBoundingClientRect()
    return {
      hudLeft: Math.round(hr.left),
      hudWidth: Math.round(hr.width),
      hudLeftMinusBoardLeft: Math.round(hr.left - br.left),
    }
  })
}

async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9
  const fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}

const results = { port: PORT, viewports: {} }

async function measurePhase(page, name) {
  const board = await rect(page, '[data-testid="vault-canvas-shell"]')
  const control = await rect(page, '[data-testid="DesktopControlColumn"]')
  const grid = await rect(page, '[data-testid="vault-grid-mainGrid"]')
  const cta = await rect(page, '[data-testid="vault-ctl-cta"]')
  const gattrs = await gridAttrs(page)
  const bd = await backdropDiag(page)
  const hudCheck = await hudInnerVsBoard(page)
  return { board, control, grid, cta, gattrs, backdrop: bd, hudCheck }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLEERR', m.text()) })

  for (const vp of [{ name: '1440x900', width: 1440, height: 900 }, { name: '1920x1080', width: 1920, height: 1080 }]) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(700)
    await clickText(page, 'got it')
    await clickText(page, 'skip')
    await wait(300)

    const vpResults = {}

    // LOBBY (baseline, no world picked yet) — also our first backdrop/grid check
    vpResults.lobby = await measurePhase(page, 'lobby')
    await page.screenshot({ path: `${OUT}/${vp.name}-lobby.png` })

    // BET-ENTRY
    await clickText(page, 'ape in')
    await wait(500)
    await clickText(page, 'bluechips')
    await wait(200)
    vpResults.betEntry = await measurePhase(page, 'betEntry')
    await page.screenshot({ path: `${OUT}/${vp.name}-betentry.png` })

    // Spot-check clickability BEFORE moving on: click "send it" CTA (this
    // itself proves the CTA is still clickable through/around the backdrop)
    const clicked = await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
    vpResults.ctaClickable = clicked
    await wait(900)

    // PLAYING
    vpResults.playing = await measurePhase(page, 'playing')
    await page.screenshot({ path: `${OUT}/${vp.name}-playing.png` })

    // reveal a tile then cash out (spot-check board is still clickable through/around backdrop)
    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    const takeProfitClicked = await clickText(page, 'take profit')
    vpResults.takeProfitClickable = takeProfitClicked
    await wait(900)

    // SETTLED
    vpResults.settled = await measurePhase(page, 'settled')
    await page.screenshot({ path: `${OUT}/${vp.name}-settled.png` })

    // fold check
    vpResults.foldCheck = {
      viewportHeight: vp.height,
      ctaBottom: vpResults.settled.cta ? vpResults.settled.cta.bottom : null,
      aboveFold: vpResults.settled.cta ? vpResults.settled.cta.bottom <= vp.height : null,
    }

    results.viewports[vp.name] = vpResults
  }

  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
