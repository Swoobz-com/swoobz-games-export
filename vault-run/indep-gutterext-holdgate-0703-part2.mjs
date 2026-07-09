// PART 2 — fixes/additions to indep-gutterext-holdgate-0703.mjs's first run:
// (a) that run's reveal-loop broke out on the FIRST mine-hit text sighting
//     and measured "settled" immediately after, without waiting for the
//     mine-hit -> settling -> settled transition to finish — it accidentally
//     captured the TRANSIENT 'settling' phase (which legitimately still
//     renders a non-empty panel, out of scope for all 4 gutter rounds) and
//     mislabeled it. Fixed here: always wait for the 'bet again' text (the
//     unambiguous settled-phase marker) before measuring settled state.
// (b) round 1 busted at reveal #2 before reaching a genuine mid-round
//     PLAYING sample — this run retries (bet again on early bust) until a
//     round survives to >=8 reveals, then measures PLAYING at 3 desktop
//     viewports.
// (c) LETTERBOX investigation control: deliberately catch the transient
//     'settling' phase (still has a REAL non-empty panel, untouched by ANY
//     of the 4 gutter-migration rounds) at 1440x1920 specifically, for a
//     direct non-empty-vs-empty-panel chassis-gap comparison at the SAME
//     tall viewport Tim flagged.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5192'
const URL = `http://localhost:${PORT}/`
const OUT = path.join(process.cwd(), 'shots-indepgutterext0703-part2')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = {}
const log = (k, v) => {
  results[k] = v
  console.log(`\n=== ${k} ===`)
  console.log(JSON.stringify(v, null, 2))
}

async function clickByText(page, txt) {
  const handle = await page.evaluateHandle((txt) => {
    const nodes = [...document.querySelectorAll('button')]
    const lower = txt.toLowerCase()
    return (
      nodes.find((n) => n.offsetParent !== null && n.textContent.trim().toLowerCase() === lower) ||
      nodes.find((n) => n.offsetParent !== null && n.textContent.toLowerCase().includes(lower))
    )
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
async function waitForText(page, txt, timeout = 8000) {
  await page.waitForFunction(
    (txt) => document.body.innerText.toLowerCase().includes(txt.toLowerCase()),
    { timeout },
    txt,
  )
}
function tileCenter(W, H, gridSize, idx) {
  const wide = W / H > 1.2
  const topReserved = H * (wide ? 0.12 : 0.15)
  const bottomReserved = H * (wide ? 0.14 : 0.18)
  const sideFrac = 0.08
  const safeW = W * (1 - sideFrac * 2)
  const safeH = (H - topReserved - bottomReserved) * 0.96
  const available = Math.min(safeW, safeH)
  const gap = Math.max(6, available * 0.026)
  const tile = (available - gap * (gridSize - 1)) / gridSize
  const full = tile * gridSize + gap * (gridSize - 1)
  const x = (W - full) / 2
  const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
  const y = bandCenterY - full / 2
  const r = Math.floor(idx / gridSize)
  const c = idx % gridSize
  return { cx: x + c * (tile + gap) + tile / 2, cy: y + r * (tile + gap) + tile / 2 }
}
async function clickTile(page, idx) {
  const canvasRect = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    const canvas = shell ? shell.querySelector('canvas') : null
    if (!canvas) return null
    const r = canvas.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
  if (!canvasRect) throw new Error('canvas not found')
  const { cx, cy } = tileCenter(canvasRect.width, canvasRect.height, 5, idx)
  await page.mouse.click(canvasRect.left + cx, canvasRect.top + cy)
}
async function panelInfo(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    if (!shell) return { shellFound: false }
    const panel = shell.nextElementSibling
    if (!panel) return { shellFound: true, panelFound: false }
    const cs = getComputedStyle(panel)
    return {
      shellFound: true,
      panelFound: true,
      childElementCount: panel.childElementCount,
      outerHTMLLength: panel.outerHTML.length,
      display: cs.display,
      visibility: cs.visibility,
    }
  })
}
async function overflowInfo(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    delta: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
}
async function rectOf(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
  }, sel)
}
async function chassisRects(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]')
    if (!shell) return null
    const cabinet = shell.parentElement
    const pageDiv = cabinet.parentElement
    const header = pageDiv.children[0]
    const footer = cabinet.nextElementSibling
    const canvas = shell.querySelector('canvas')
    const vh = window.innerHeight
    const hR = header.getBoundingClientRect()
    const cR = cabinet.getBoundingClientRect()
    const fR = footer ? footer.getBoundingClientRect() : null
    const shR = shell.getBoundingClientRect()
    const cvR = canvas ? canvas.getBoundingClientRect() : null
    const panel = shell.nextElementSibling
    return {
      viewportHeight: vh,
      headerTop: hR.top,
      headerBottom: hR.bottom,
      cabinetTop: cR.top,
      cabinetBottom: cR.bottom,
      footerTop: fR ? fR.top : null,
      footerBottom: fR ? fR.bottom : null,
      shellHeight: shR.height,
      canvasCssHeight: cvR ? cvR.height : null,
      panelChildCount: panel ? panel.childElementCount : null,
      panelOuterHTMLLength: panel ? panel.outerHTML.length : null,
      topGap: hR.top,
      bottomGap: fR ? vh - fR.bottom : null,
    }
  })
}
async function testidPresence(page, ids) {
  return page.evaluate((ids) => {
    const out = {}
    for (const id of ids) out[id] = !!document.querySelector(`[data-testid="${id}"]`)
    return out
  }, ids)
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(URL, { waitUntil: 'networkidle0' })
    await waitForText(page, 'ape in')
    await clickByText(page, 'ape in')
    await waitForText(page, 'send it')
    await clickByText(page, 'send it')
    await waitForText(page, 'pump', 6000).catch(() => {})
    await wait(400)

    // ── (b) retry rounds until one survives to >=8 reveals ──
    let survived = false
    let attempts = 0
    let revealed = 0
    while (!survived && attempts < 8) {
      attempts++
      revealed = 0
      for (let i = 0; i < 25 && revealed < 8; i++) {
        await clickTile(page, i)
        await wait(160)
        const txt = await page.evaluate(() => document.body.innerText)
        if (txt.includes('RUGGED') || txt.toLowerCase().includes('settling')) break
        revealed++
      }
      if (revealed >= 8) {
        survived = true
      } else {
        // busted — wait for settle, bet again, retry
        await waitForText(page, 'bet again', 8000).catch(() => {})
        await wait(400)
        await clickByText(page, 'bet again')
        await waitForText(page, 'pump', 6000).catch(() => {})
        await wait(400)
      }
    }
    log('MIDROUND_retry_stats', { attempts, revealed, survived })

    if (survived) {
      const playingCardSel = {
        left: '[data-testid="vault-playing-left"]',
        status: '[data-testid="vault-playing-status"]',
        right: '[data-testid="vault-playing-right"]',
        actions: '[data-testid="vault-playing-actions"]',
        cardA: '[data-testid="vault-gutter-card-a"]',
        cardAMirror: '[data-testid="vault-gutter-card-a-right"]',
      }
      const desktopViewports = [
        { w: 1440, h: 900, tag: '1440x900' },
        { w: 1440, h: 1920, tag: '1440x1920' },
        { w: 1920, h: 1080, tag: '1920x1080' },
      ]
      const playingByViewport = {}
      for (const vp of desktopViewports) {
        await page.setViewport({ width: vp.w, height: vp.h })
        await wait(250)
        const panel = await panelInfo(page)
        const overflow = await overflowInfo(page)
        const rects = {}
        for (const [k, sel] of Object.entries(playingCardSel)) rects[k] = await rectOf(page, sel)
        playingByViewport[vp.tag] = { panel, overflow, rects }
      }
      log('PLAYING_MIDROUND_by_viewport_FIXED', playingByViewport)

      await page.setViewport({ width: 1440, height: 900 })
      await wait(200)
      await page.screenshot({ path: path.join(OUT, 'playing-midround-1440x900-full.png') })
      await page.screenshot({
        path: path.join(OUT, 'playing-midround-1440x900-left-gutter-crop.png'),
        clip: { x: 0, y: 0, width: 400, height: 900 },
      })
      await page.screenshot({
        path: path.join(OUT, 'playing-midround-1440x900-right-gutter-crop.png'),
        clip: { x: 1040, y: 0, width: 400, height: 900 },
      })

      await page.setViewport({ width: 390, height: 844 })
      await wait(300)
      const playingMobile = await testidPresence(page, [
        'vault-playing-left',
        'vault-playing-right',
      ])
      const hasActionBar = await page.evaluate(
        () => !!document.querySelector('.vault-actionbar') || document.body.innerText.toLowerCase().includes('take profit'),
      )
      log('PLAYING_MIDROUND_mobile_390_FIXED', { testids: playingMobile, hasOriginalActionBar: hasActionBar })
      await page.screenshot({ path: path.join(OUT, 'playing-midround-mobile-390.png') })

      // cash out -> settled, WAIT properly this time
      await page.setViewport({ width: 1440, height: 900 })
      await wait(250)
      await clickByText(page, 'take profit')
      await waitForText(page, 'bet again', 8000)
      await wait(500) // let verifyMineBitmap resolve too

      const settledCardSel = {
        left: '[data-testid="vault-settled-left"]',
        result: '[data-testid="vault-settled-result"]',
        meta: '[data-testid="vault-settled-meta"]',
        rightNew: '[data-testid="vault-settled-right-new"]',
        nextbet: '[data-testid="vault-settled-nextbet"]',
        betagain: '[data-testid="vault-settled-betagain"]',
        cardA: '[data-testid="vault-gutter-card-a"]',
        cardAMirror: '[data-testid="vault-gutter-card-a-right"]',
        cardB: '[data-testid="vault-gutter-card-b"]',
        cardC: '[data-testid="vault-gutter-card-c"]',
      }
      const outcome = await page.evaluate(() => (document.body.innerText.includes('BUST') ? 'rug' : 'win'))
      const settledByViewport = {}
      for (const vp of desktopViewports) {
        await page.setViewport({ width: vp.w, height: vp.h })
        await wait(300)
        // re-confirm settle marker is present at THIS viewport too before measuring
        await waitForText(page, 'bet again', 4000).catch(() => {})
        const panel = await panelInfo(page)
        const overflow = await overflowInfo(page)
        const rects = {}
        for (const [k, sel] of Object.entries(settledCardSel)) rects[k] = await rectOf(page, sel)
        settledByViewport[vp.tag] = { panel, overflow, rects }
      }
      log(`SETTLED_${outcome}_by_viewport_FIXED`, settledByViewport)

      await page.setViewport({ width: 1440, height: 900 })
      await wait(200)
      await page.screenshot({ path: path.join(OUT, `settled-${outcome}-fixed-1440x900-full.png`) })
      await page.screenshot({
        path: path.join(OUT, `settled-${outcome}-fixed-1440x900-left-gutter-crop.png`),
        clip: { x: 0, y: 0, width: 400, height: 900 },
      })
      await page.screenshot({
        path: path.join(OUT, `settled-${outcome}-fixed-1440x900-right-gutter-crop.png`),
        clip: { x: 1040, y: 0, width: 400, height: 900 },
      })
    }

    // ── (c) LETTERBOX control: catch the transient 'settling' phase (real
    // non-empty panel, untouched by ANY gutter round) at 1440x1920 ──
    await page.setViewport({ width: 1440, height: 1920 })
    await wait(300)
    await clickByText(page, 'bet again')
    await waitForText(page, 'pump', 6000).catch(() => {})
    await wait(400)
    let settlingCaught = null
    let mineHitCaught = null
    outer: for (let i = 0; i < 25; i++) {
      await clickTile(page, i)
      for (let poll = 0; poll < 8; poll++) {
        await wait(90)
        const txt = await page.evaluate(() => document.body.innerText)
        if (txt.includes('RUGGED') && !mineHitCaught) {
          mineHitCaught = await chassisRects(page)
          await page.screenshot({ path: path.join(OUT, 'mine-hit-live-1440x1920.png') })
        }
        if (txt.toUpperCase().includes('SETTLING') && !settlingCaught) {
          settlingCaught = await chassisRects(page)
          await page.screenshot({ path: path.join(OUT, 'settling-live-1440x1920.png') })
        }
        if (txt.toLowerCase().includes('bet again')) break outer
      }
    }
    log('LETTERBOX_CONTROL_mine_hit_1440x1920', mineHitCaught)
    log('LETTERBOX_CONTROL_settling_1440x1920', settlingCaught)

    await wait(400)
    const finalSettledChassis = await chassisRects(page)
    log('LETTERBOX_settled_after_this_round_1440x1920', finalSettledChassis)
    await page.screenshot({ path: path.join(OUT, 'settled-after-letterbox-round-1440x1920-full.png') })
  } finally {
    fs.writeFileSync(path.join(OUT, 'results-part2.json'), JSON.stringify(results, null, 2))
    await browser.close()
  }
}
main().catch((e) => {
  console.error('DRIVER FAILED', e)
  fs.writeFileSync(path.join(OUT, 'results-part2-error.json'), JSON.stringify({ ...results, error: String(e) }, null, 2))
  process.exit(1)
})
