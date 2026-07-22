import puppeteer from 'puppeteer-core'

export const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
export const URL = 'http://localhost:5182/'
export const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export async function launch(viewport, extraArgs = {}) {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    defaultViewport: viewport,
    ...extraArgs,
  })
  const page = (await browser.pages())[0]
  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('CONSOLE: ' + m.text()) })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await wait(600)
  return { browser, page, consoleErrors }
}

export async function clickText(page, txt, tag = 'button') {
  const handle = await page.evaluateHandle((t, tg) => {
    const els = [...document.querySelectorAll(tg)]
    return els.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt, tag)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

export async function getCanvasRect(page, isDesktop) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
}

/** Click tile idx (row-major, 0..195) via real mouse click at its computed center. */
export async function clickTile(page, idx, GRID_DIM = 14) {
  const rect = await getCanvasRect(page)
  if (!rect) throw new Error('no canvas found')
  const tile = rect.width / GRID_DIM
  const col = idx % GRID_DIM
  const row = Math.floor(idx / GRID_DIM)
  const x = rect.left + col * tile + tile / 2
  const y = rect.top + row * tile + tile / 2
  await page.mouse.click(x, y)
}

export async function paintTilesMouse(page, indices, GRID_DIM = 14) {
  for (const idx of indices) {
    await clickTile(page, idx, GRID_DIM)
  }
}

/** Mobile tile tap: the board canvas is oversized (46px/tile * 14 = 644px)
 *  inside a smaller pan/scroll viewport window (`.assayBoardScroll`,
 *  overflow:auto) — clicking at the canvas's own full-size local coordinates
 *  only works for tiles currently scrolled into view. Scrolls the wrapper so
 *  the target tile is centered, then taps at its on-screen position. */
export async function clickTileMobile(page, idx, GRID_DIM = 14, tilePx = 46) {
  const col = idx % GRID_DIM
  const row = Math.floor(idx / GRID_DIM)
  const targetLocalX = col * tilePx + tilePx / 2
  const targetLocalY = row * tilePx + tilePx / 2
  await page.evaluate((tx, ty) => {
    const scroller = document.querySelector('.assayBoardScroll')
    if (!scroller) return
    scroller.scrollLeft = Math.max(0, tx - scroller.clientWidth / 2)
    scroller.scrollTop = Math.max(0, ty - scroller.clientHeight / 2)
  }, targetLocalX, targetLocalY)
  await wait(30)
  const rect = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top }
  })
  const pageX = rect.left + targetLocalX
  const pageY = rect.top + targetLocalY
  await page.mouse.click(pageX, pageY)
}

export async function paintTilesMobile(page, indices, GRID_DIM = 14, tilePx = 46) {
  for (const idx of indices) {
    await clickTileMobile(page, idx, GRID_DIM, tilePx)
  }
}

/** Reach 'planning' phase from lobby by clicking ENTER THE DIVE. */
export async function reachPlanning(page) {
  await clickText(page, 'ENTER THE DIVE')
  await wait(400)
}

export async function selectTier(page, tierLabel) {
  // tierLabel one of 'REEF SHELF' | 'MIDNIGHT ZONE' | 'HADAL TRENCH'
  await clickText(page, tierLabel)
  await wait(150)
}

export async function setPace(page, want) {
  // want: 'staggered' or 'instant'. Toggle button reads "PACE: DUCAT-BY-DUCAT" or "PACE: INSTANT"
  for (let i = 0; i < 3; i++) {
    const text = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')]
      const b = btns.find((x) => x.textContent && x.textContent.includes('PACE:'))
      return b ? b.textContent : null
    })
    if (!text) return false
    const isStaggered = text.includes('DUCAT-BY-DUCAT')
    if ((want === 'staggered' && isStaggered) || (want === 'instant' && !isStaggered)) return true
    await clickText(page, 'PACE:')
    await wait(120)
  }
  return false
}

export async function commit(page) {
  await clickText(page, 'RUN THE LINE')
  await wait(100)
}

export async function pollForPhaseText(page, regex, timeoutMs = 8000, intervalMs = 100) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const text = await page.evaluate(() => document.body.innerText)
    if (regex.test(text)) return text
    await wait(intervalMs)
  }
  return null
}

/** Forces a WIN: REEF SHELF (6 bombs) + MIN_TRAIL(8) tiles, retries up to `attempts`. */
export async function forceWin(page, attempts = 4) {
  for (let a = 0; a < attempts; a++) {
    await selectTier(page, 'REEF SHELF')
    // clear any existing trail by reloading planning state isn't simple; use fresh indices per attempt to avoid re-toggle collisions
    const base = a * 9
    const indices = Array.from({ length: 8 }, (_, i) => base + i)
    await paintTilesMouse(page, indices)
    await wait(150)
    await commit(page)
    const settled = await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 6000)
    if (settled && /SECURED THE HAUL/i.test(settled)) return true
    if (settled && /RUGGED BY THE DEEP/i.test(settled)) {
      // bust; go again via DIVE AGAIN / NEW planning
      await clickText(page, 'DIVE AGAIN')
      await wait(300)
      continue
    }
  }
  return false
}

/** Forces a BUST: HADAL TRENCH (16 bombs) + 30+ tile trail. */
export async function forceBust(page, attempts = 3, trailLen = 40) {
  for (let a = 0; a < attempts; a++) {
    await selectTier(page, 'HADAL TRENCH')
    const indices = Array.from({ length: trailLen }, (_, i) => i)
    await paintTilesMouse(page, indices)
    await wait(150)
    await commit(page)
    const settled = await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 8000)
    if (settled && /RUGGED BY THE DEEP/i.test(settled)) return true
    if (settled && /SECURED THE HAUL/i.test(settled)) {
      await clickText(page, 'DIVE AGAIN')
      await wait(300)
      continue
    }
  }
  return false
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
export function relLum([r, g, b]) {
  const f = (c) => {
    const cs = c / 255
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
  }
  const [rl, gl, bl] = [f(r), f(g), f(b)]
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}
export function contrast(c1, c2) {
  const L1 = relLum(c1)
  const L2 = relLum(c2)
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]
  return (hi + 0.05) / (lo + 0.05)
}
