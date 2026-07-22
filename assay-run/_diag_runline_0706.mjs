import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
page.on('console', (m) => console.log('[console]', m.type(), m.text()))
await page.emulate({ viewport: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true, isLandscape: false } })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
await page.reload({ waitUntil: 'networkidle0' })
await wait(300)

await page.evaluate(() => {
  window.__clicks = 0
  document.addEventListener('click', (e) => { window.__clicks++; console.log('DOC CLICK on', e.target.tagName, e.target.getAttribute && e.target.getAttribute('aria-label')) }, true)
})

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return null
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return box
}

await tapText(page, 'ENTER THE DIVE')
await wait(400)

// tap 8 pods directly (no pan test this time)
const canvasGeom = await page.evaluate(() => {
  const scroll = document.querySelector('.assayBoardScroll')
  const canvas = scroll.querySelector('canvas')
  const sr = scroll.getBoundingClientRect()
  const cr = canvas.getBoundingClientRect()
  return {
    scrollRect: { top: sr.top, left: sr.left, width: sr.width, height: sr.height },
    canvasRect: { top: cr.top, left: cr.left, width: cr.width, height: cr.height },
  }
})
const TILE = 46
const { canvasRect } = canvasGeom
for (let i = 0; i < 8; i++) {
  const col = 4 + (i % 3)
  const row = 4 + Math.floor(i / 3)
  const x = canvasRect.left + (col + 0.5) * TILE
  const y = canvasRect.top + (row + 0.5) * TILE
  await page.touchscreen.tap(x, y)
  await wait(60)
}

const runLineFinal = await page.evaluate(() => {
  const b = document.querySelector('button[aria-label*="Run the line"]')
  const r = b.getBoundingClientRect()
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, disabled: b.disabled }
})
console.log('runLineFinal', runLineFinal)

const cx = (runLineFinal.left + runLineFinal.right) / 2
const cy = (runLineFinal.top + runLineFinal.bottom) / 2
console.log('elementFromPoint before tap:', await page.evaluate((x, y) => {
  const el = document.elementFromPoint(x, y)
  return el ? { tag: el.tagName, aria: el.getAttribute('aria-label'), cls: el.className } : null
}, cx, cy))

await page.touchscreen.tap(cx, cy)
await wait(300)
console.log('clicks after tap', await page.evaluate(() => window.__clicks))

const after = await page.evaluate(() => {
  const b = document.querySelector('button[aria-label*="Run the line"]')
  return { stillThere: !!b, bodyHasRunLine: document.body.textContent.includes('RUN THE LINE') }
})
console.log('after', after)
await page.screenshot({ path: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/_diag_runline_after.png' })

await browser.close()
