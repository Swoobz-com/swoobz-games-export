import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]

const clickByTextOrAria = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return (
      btns.find((b) => b.textContent && b.textContent.includes(t)) ||
      btns.find((b) => (b.getAttribute('aria-label') || '').includes(t)) ||
      null
    )
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

for (const vp of [
  { name: '393x852-iphone14pro', width: 393, height: 852 },
  { name: '412x915-pixel7', width: 412, height: 915 },
  { name: '1440x900-desktop', width: 1440, height: 900 },
]) {
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.width < 500, hasTouch: vp.width < 500 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(700)
  await clickByTextOrAria('ENTER THE ASSAY LINE')
  await wait(300)
  await clickByTextOrAria('Heavy Floor')
  await wait(150)

  // paint + bust via desktop click loop (works for both mouse and touch surrogate via page.mouse)
  const board = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const wrap = c.parentElement
    const wrapRect = wrap.getBoundingClientRect()
    return { x: wrapRect.x, y: wrapRect.y, w: wrapRect.width, h: wrapRect.height, scrollLeft: wrap.scrollLeft, scrollTop: wrap.scrollTop, isMobileMode: wrap !== c }
  })

  if (vp.width < 500) {
    const TILE = 46
    const startCol = Math.floor(board.scrollLeft / TILE)
    const startRow = Math.floor(board.scrollTop / TILE)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const localX = (startCol + c) * TILE + TILE / 2 - board.scrollLeft
        const localY = (startRow + r) * TILE + TILE / 2 - board.scrollTop
        await page.touchscreen.tap(board.x + localX, board.y + localY)
        await wait(70)
      }
    }
  } else {
    const tile = board.w / 10
    let count = 0
    for (let row = 2; row < 10 && count < 40; row++) {
      for (let col = 2; col < 10 && count < 40; col++) {
        await page.mouse.click(board.x + col * tile + tile / 2, board.y + row * tile + tile / 2)
        count++
        await wait(10)
      }
    }
  }
  await wait(200)
  await clickByTextOrAria('RUN THE LINE')
  await wait(4500)

  const overlap = await page.evaluate(() => {
    const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom } }
    const all = [...document.querySelectorAll('div')]
    const cert = all.find((d) => d.textContent && d.textContent.startsWith('◆ GLASS BOX CERTIFICATE'))
    // hallmark seal: locate via its unique SVG polygon (HallmarkSeal's own emboss retrace), then walk up to its own positioned wrapper div (the 32x32 circular seal div itself).
    const polygon = [...document.querySelectorAll('polygon')].find((p) => p.getAttribute('points') === '16,10.8 20.6,16 16,21.2 11.4,16' && p.getAttribute('stroke-width') === '1.6')
    const seal = polygon ? polygon.closest('div[style*="border-radius: 50%"]') : null
    const certRect = cert ? rectOf(cert) : null
    const sealRect = seal ? rectOf(seal) : null
    let overlapArea = null
    if (certRect && sealRect) {
      const ix = Math.max(0, Math.min(certRect.right, sealRect.right) - Math.max(certRect.x, sealRect.x))
      const iy = Math.max(0, Math.min(certRect.bottom, sealRect.bottom) - Math.max(certRect.y, sealRect.y))
      overlapArea = ix > 0 && iy > 0 ? { overlapW: +ix.toFixed(1), overlapH: +iy.toFixed(1) } : false
    }
    // The actual readable text line (tierLabel/bombCount headline) — the SHORTEST (leaf-most) div whose
    // text starts with the diamond marker (the outer GAUGE_WINDOW container's textContent also
    // "starts with" the same string since it's the first child, so pick the minimum-length match).
    const headlineCandidates = all.filter((d) => d.textContent && d.textContent.trim().startsWith('◆ GLASS BOX CERTIFICATE'))
    const headline = headlineCandidates.sort((a, b) => a.textContent.length - b.textContent.length)[0]
    const headlineRect = headline ? rectOf(headline) : null
    let overlapsHeadlineText = null
    if (headlineRect && sealRect) {
      const ix = Math.max(0, Math.min(headlineRect.right, sealRect.right) - Math.max(headlineRect.x, sealRect.x))
      const iy = Math.max(0, Math.min(headlineRect.bottom, sealRect.bottom) - Math.max(headlineRect.y, sealRect.y))
      overlapsHeadlineText = ix > 0 && iy > 0 ? { overlapW: +ix.toFixed(1), overlapH: +iy.toFixed(1) } : false
    }
    return {
      found: !!cert,
      sealFound: !!seal,
      certRect,
      sealRect,
      headlineText: headline ? headline.textContent : null,
      headlineRect,
      overlapCertVsSeal: overlapArea,
      overlapsHeadlineText,
      viewportWidth: window.innerWidth,
      elementAtSealCenter: (() => {
        if (!sealRect) return null
        const cx = sealRect.x + sealRect.w / 2
        const cy = sealRect.y + sealRect.h / 2
        const el = document.elementFromPoint(cx, cy)
        return el ? { tag: el.tagName, text: (el.textContent || '').slice(0, 80) } : null
      })(),
    }
  })
  console.log(vp.name, JSON.stringify(overlap, null, 2))
  await page.screenshot({ path: `probe-seal-${vp.name}.png` })
}

await browser.close()
