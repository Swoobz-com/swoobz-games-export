import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-visreg-0704'
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

// Precise overlap probe: find the counter-card BOARD PANEL (the div with the
// distinctive boxShadow containing '24px 60px', per AssayExperience.tsx),
// then find every OTHER real chrome panel on the page (rail cards: elements
// matching the RailShell/RailRow/tier-button visual signature) and check
// real AABB overlap against the board panel — excluding decorative overlays
// that are DELIBERATELY inside the board panel's own bounds (aria-hidden
// light sweeps, hero-pop callouts) by only considering elements OUTSIDE the
// board panel's own subtree.
const preciseOverlap = (page) => page.evaluate(() => {
  const all = [...document.querySelectorAll('div')]
  const boardPanel = all.find((d) => (getComputedStyle(d).boxShadow || '').includes('24px 60px'))
  if (!boardPanel) return { ok: false, reason: 'board panel not found' }
  const boardRect = boardPanel.getBoundingClientRect()
  const isDescendant = (el) => boardPanel.contains(el)
  const candidates = all.filter((el) => {
    if (isDescendant(el) || el === boardPanel) return false
    const txt = el.textContent || ''
    return /VAULT FLOOR|YOUR BET|THROW BREAKER|Lean Floor|Standard Floor|Flooded Floor|ASSAY TALLY|PACE:/.test(txt)
  })
  // Reduce to the SMALLEST-area matching elements per distinct text (avoids
  // reporting giant ancestor wrappers that also happen to contain the text).
  const seen = new Map()
  for (const el of candidates) {
    const r = el.getBoundingClientRect()
    const area = r.width * r.height
    const key = (el.textContent || '').slice(0, 30)
    if (!seen.has(key) || area < seen.get(key).area) {
      seen.set(key, { area, el, r })
    }
  }
  const overlaps = []
  for (const [key, { r }] of seen) {
    if (r.width === 0 || r.height === 0) continue
    const overlapX = Math.max(0, Math.min(r.right, boardRect.right) - Math.max(r.left, boardRect.left))
    const overlapY = Math.max(0, Math.min(r.bottom, boardRect.bottom) - Math.max(r.top, boardRect.top))
    if (overlapX > 2 && overlapY > 2) {
      overlaps.push({ text: key, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, overlapPx: { x: overlapX, y: overlapY } })
    }
  }
  return { ok: true, boardRect: { x: boardRect.x, y: boardRect.y, w: boardRect.width, h: boardRect.height }, overlaps, candidateCount: candidates.length }
})

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 1080, height: 800, name: '1080x800-atbreakpoint' },
  { width: 1079, height: 800, name: '1079x800-justbelowbreakpoint' },
]

const results = {}
for (const vp of VIEWPORTS) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: vp.width, height: vp.height, deviceScaleFactor: 1 } })
  const page = (await browser.pages())[0]
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  const planning = await preciseOverlap(page)
  const isWide = await page.evaluate(() => window.innerWidth >= 1080)

  const board = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  // paint via desktop-drag (works fine on non-mobile widths, canvas not clipped)
  const tile = board.w / 10
  await page.mouse.move(board.x + tile * 0.5, board.y + tile * 0.5)
  await page.mouse.down()
  for (let i = 0; i < 12; i++) {
    const col = i % 6
    const row = Math.floor(i / 6)
    await page.mouse.move(board.x + tile * (col + 0.5), board.y + tile * (row + 0.5), { steps: 2 })
    await wait(10)
  }
  await page.mouse.up()
  await wait(200)
  const painted = await preciseOverlap(page)
  await page.screenshot({ path: `${OUT}/precise-${vp.name}-painted.png` })

  results[vp.name] = { isWide, planning, painted }
  await browser.close()
}

fs.writeFileSync(`${OUT}/overlap-precise-report.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
