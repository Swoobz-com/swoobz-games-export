import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-finalqa-0707b'
fs.mkdirSync(OUT, { recursive: true })
const GRID_DIM = 14

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915, dsf: 2.625, ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
  { name: 'iphone14pro', width: 393, height: 852, dsf: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1' },
]

async function getBoardGeom(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    let node = canvas.parentElement, scrollAncestor = null
    while (node) { const cs = getComputedStyle(node); if (cs.overflowX === 'auto' || cs.overflowY === 'auto') { scrollAncestor = node; break }; node = node.parentElement }
    const sr = scrollAncestor.getBoundingClientRect(), cr = canvas.getBoundingClientRect()
    return { scrollRect: { top: sr.top, left: sr.left, width: sr.width, height: sr.height }, canvasRect: { top: cr.top, left: cr.left, width: cr.width, height: cr.height } }
  })
}

async function measureHero(page) {
  return page.evaluate(() => {
    // The decorative gold HeroPopCallout cartouche's own win-label reads
    // "SECURED THE HAUL" (its own span, may or may not be a leaf if the sun
    // badge SVG is a sibling not a child — check by span textContent trim
    // match instead of leaf-only) — distinct from the always-present in-canvas
    // "TO WIN"/"LINE CLAIMED" header-adjacent hero plaque (non-aria-hidden).
    const leaf = [...document.querySelectorAll('span')].find((s) => (s.textContent || '').trim() === 'SECURED THE HAUL')
    if (!leaf) return { present: false }
    const ariaWrap = leaf.closest('[aria-hidden]')
    if (!ariaWrap) return { present: false, note: 'label found but no aria-hidden ancestor' }
    // The OUTER aria-hidden wrapper is a zero-size anchor point (position:absolute,
    // top:HERO_TOP_*, no explicit width/height — its absolutely-positioned children
    // establish the real visible box). Walk up from the label to the first ancestor
    // with a NON-ZERO rendered box — that is the actual visible cartouche pill.
    let cartouche = leaf.parentElement
    while (cartouche && cartouche !== ariaWrap.parentElement) {
      const rr = cartouche.getBoundingClientRect()
      if (rr.width > 0 && rr.height > 0) break
      cartouche = cartouche.parentElement
    }
    const r = (cartouche || ariaWrap).getBoundingClientRect()
    const anchorR = ariaWrap.getBoundingClientRect()
    // Worst-case clearance: the topmost visible pixel across EVERY descendant
    // of the aria-hidden wrapper (the concussion rings can extend well above
    // the label row via negative margin-top, so the label box alone
    // under-states how close the whole hero-pop assembly gets to the header).
    let minTop = Infinity
    const walk = (el) => {
      const rr = el.getBoundingClientRect()
      if (rr.width > 0 && rr.height > 0 && rr.top < minTop) minTop = rr.top
      for (const child of el.children) walk(child)
    }
    walk(ariaWrap)
    const hdrLeaf = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && /cracked ducats/i.test(d.textContent || ''))
    let headerBottom = null
    if (hdrLeaf) {
      let node = hdrLeaf.parentElement
      for (let i = 0; i < 6 && node; i++) {
        const cs = getComputedStyle(node)
        if (cs.display === 'flex' && cs.justifyContent === 'space-between') { headerBottom = node.getBoundingClientRect().bottom; break }
        node = node.parentElement
      }
    }
    return {
      present: true, wrapTop: r.top, wrapBottom: r.bottom, wrapHeight: r.height, wrapWidth: r.width,
      anchorTop: anchorR.top, anchorTopPct: +(anchorR.top / window.innerHeight * 100).toFixed(1),
      minTopAcrossAssembly: minTop === Infinity ? null : minTop,
      headerBottom,
      clearanceLabelBox: headerBottom != null ? r.top - headerBottom : null,
      clearanceWorstCase: headerBottom != null && minTop !== Infinity ? minTop - headerBottom : null,
      viewportH: window.innerHeight, topPct: +(r.top / window.innerHeight * 100).toFixed(1),
    }
  })
}

async function attempt(page, tile, c0, r0, devName) {
  const paceBtnH = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('PACE:')))
  const paceText = await page.evaluate((b) => b.textContent, paceBtnH)
  if (paceText && paceText.includes('DUCAT-BY-DUCAT')) {
    const pb = await paceBtnH.asElement().boundingBox()
    await page.touchscreen.tap(pb.x + pb.width / 2, pb.y + pb.height / 2)
    await wait(100)
  }

  const plan = [
    { col: c0, row: r0 }, { col: c0 + 1, row: r0 }, { col: c0 + 1, row: r0 + 1 }, { col: c0, row: r0 + 1 },
    { col: c0 + 2, row: r0 }, { col: c0 + 3, row: r0 }, { col: c0 + 3, row: r0 + 1 }, { col: c0 + 2, row: r0 + 1 },
  ]
  for (const p of plan) {
    const g = await getBoardGeom(page)
    const x = g.canvasRect.left + (p.col + 0.5) * tile, y = g.canvasRect.top + (p.row + 0.5) * tile
    await page.touchscreen.tap(x, y)
    await wait(80)
  }
  const runBtnH = await page.evaluateHandle(() => document.querySelector('button[aria-label*="Run the line"]'))
  const box = await runBtnH.asElement().boundingBox()
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)

  let caughtHero = null
  let heroMeasure = null
  let worstClearance = null
  const samples = []
  for (let i = 0; i < 30; i++) {
    await wait(80)
    const m = await measureHero(page)
    if (m.present) {
      if (caughtHero === null) {
        caughtHero = i * 80
        await page.screenshot({ path: `${OUT}/${devName}-hero-LIVE-catch.png` })
      }
      samples.push({ atMs: i * 80, clearanceWorstCase: m.clearanceWorstCase })
      if (worstClearance === null || (m.clearanceWorstCase !== null && m.clearanceWorstCase < worstClearance)) {
        worstClearance = m.clearanceWorstCase
        heroMeasure = m
      }
    } else if (caughtHero !== null) {
      break // hero-pop unmounted (HERO_POP_HOLD_MS elapsed) — stop sampling
    }
  }
  await wait(1200)
  const outcome = await page.evaluate(() => document.body.textContent.includes('LINE CLAIMED') ? 'win' : (document.body.textContent.includes('RUGGED') ? 'bust' : 'unknown'))
  return { outcome, caughtHeroAtMs: caughtHero, heroMeasure, samples }
}

async function run(dev) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = (await browser.pages())[0]
  await page.setUserAgent(dev.ua)
  await page.emulate({ viewport: { width: dev.width, height: dev.height, deviceScaleFactor: dev.dsf, isMobile: true, hasTouch: true, isLandscape: false } })
  const result = { device: dev.name, viewport: `${dev.width}x${dev.height}` }

  let outcome = 'bust'
  let heroMeasure = null
  let attempts = 0
  while (outcome !== 'win' && attempts < 6) {
    attempts++
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
    await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(300)
    const enterBtnH = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('ENTER THE DIVE')))
    const eb = await enterBtnH.asElement().boundingBox()
    await page.touchscreen.tap(eb.x + eb.width / 2, eb.y + eb.height / 2)
    await wait(400)
    const reefBtnH = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /REEF SHELF/i.test(b.getAttribute('aria-label') || '')))
    const rb = await reefBtnH.asElement().boundingBox()
    await page.touchscreen.tap(rb.x + rb.width / 2, rb.y + rb.height / 2)
    await wait(150)
    const geom0 = await getBoardGeom(page)
    const tile = geom0.canvasRect.width / GRID_DIM
    const c0 = Math.round((geom0.scrollRect.left - geom0.canvasRect.left) / tile)
    const r0 = Math.round((geom0.scrollRect.top - geom0.canvasRect.top) / tile)
    const r = await attempt(page, tile, c0, r0, dev.name)
    outcome = r.outcome
    heroMeasure = r.heroMeasure
    result[`attempt${attempts}Outcome`] = outcome
    result[`attempt${attempts}CaughtHeroAtMs`] = r.caughtHeroAtMs
    result[`attempt${attempts}Samples`] = r.samples
  }
  result.finalOutcome = outcome
  result.attempts = attempts
  result.heroMeasure = heroMeasure
  await page.screenshot({ path: `${OUT}/${dev.name}-hero-final-settled.png` })

  const restartBtns = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /DIVE AGAIN|SAME LINE/i.test(b.textContent || '')).map((b) => { const r = b.getBoundingClientRect(); return { text: b.textContent, width: r.width, height: r.height } }))
  result.restartBtns = restartBtns

  await browser.close()
  return result
}

const all = []
for (const dev of DEVICES) {
  console.log(`=== ${dev.name} ===`)
  const r = await run(dev)
  all.push(r)
  console.log(JSON.stringify(r, null, 2))
}
fs.writeFileSync(`${OUT}/hero-results2.json`, JSON.stringify(all, null, 2))
console.log('DONE')
