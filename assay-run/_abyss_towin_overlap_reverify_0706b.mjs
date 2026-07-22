import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))

const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button')].find(x => r.test((x.textContent || '').trim()))
  if (b) { b.click(); return true } return false
}, re.source)

function rectOf(r) { return r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null }
function overlap(a, b) {
  if (!a || !b) return null
  const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  return { ox, oy, area: ox * oy }
}

async function measure(page, viewport) {
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'load' })
  // FRESH localStorage — do NOT pre-dismiss the coachmark. This is the
  // genuine first-load state the audit is re-checking.
  await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'load' })
  await wait(600)

  // Enter the dive to reach the genuine FIRST planning phase (no picks made).
  await clickText(page, /ENTER THE DIVE/)
  await wait(400)

  const info = await page.evaluate(() => {
    function rectOf(r) { return r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null }
    const note = document.querySelector('[role="note"][aria-label="How to play"]')
    const noteRect = rectOf(note ? note.getBoundingClientRect() : null)
    const noteVisible = !!(note && note.offsetParent !== null && getComputedStyle(note).display !== 'none')
    const labels = [...document.querySelectorAll('div,span')].filter(x => (x.textContent || '').trim() === 'TO WIN')
    const towinLabelRects = labels.map(l => rectOf(l.getBoundingClientRect()))
    // the value strip = the label's parent (label + big gold amount + multiplier)
    const towinHeroRects = labels.map(l => rectOf(l.parentElement.getBoundingClientRect()))
    const dismissBtn = note ? note.querySelector('button[aria-label="Dismiss how-to-play tip"]') : null
    const dismissRect = rectOf(dismissBtn ? dismissBtn.getBoundingClientRect() : null)
    const canvas = document.querySelector('canvas')
    const canvasRect = rectOf(canvas ? canvas.getBoundingClientRect() : null)
    return { noteRect, noteVisible, towinLabelRects, towinHeroRects, dismissRect, canvasRect }
  })

  const heroRect = info.towinHeroRects[0] || null
  const ov = overlap(info.noteRect, heroRect)

  // Confirm coachmark doesn't block a tap on the board (pointer-events:none check via elementFromPoint at the note's own centre, which should resolve to the canvas/grid underneath, not the note).
  let tapPassthrough = null
  if (info.noteRect) {
    const cx = (info.noteRect.left + info.noteRect.right) / 2
    const cy = (info.noteRect.top + info.noteRect.bottom) / 2
    tapPassthrough = await page.evaluate((x, y) => {
      const el = document.elementFromPoint(x, y)
      return el ? { tag: el.tagName, id: el.id, cls: (el.className || '').toString().slice(0, 60) } : null
    }, cx, cy)
  }

  return { viewport, noteRect: info.noteRect, noteVisible: info.noteVisible, heroRect, overlap: ov, dismissRect: info.dismissRect, canvasRect: info.canvasRect, tapPassthrough }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()

const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'mobile-412x915', width: 412, height: 915 },
  { name: 'iphone14pro-393x852', width: 393, height: 852 },
]

const results = []
for (const vp of viewports) {
  const r = await measure(page, vp)
  results.push({ name: vp.name, ...r })
}

console.log(JSON.stringify(results, null, 2))

console.log('\n=== SUMMARY ===')
for (const r of results) {
  console.log(`${r.name}: noteVisible=${r.noteVisible} overlapArea=${r.overlap ? r.overlap.area : 'n/a'} tapPassthroughTag=${r.tapPassthrough ? r.tapPassthrough.tag : 'n/a'}`)
}

// Quick dead-end journey check on the last (mobile) page: dismiss coachmark, trace a short line, run it, settle, dive again.
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'load' })
await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
await page.reload({ waitUntil: 'load' })
await wait(500)
await clickText(page, /ENTER THE DIVE/)
await wait(300)
const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } })
const TILE = geo.w / 14
async function tapCell(col, row) { await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2); await wait(40) }
for (const [c, r] of [[3, 3], [4, 3], [5, 3]]) await tapCell(c, r)
await wait(200)
const ranClicked = await clickText(page, /RUN THE LINE/)
await wait(800)
const settledText = await page.evaluate(() => document.body.innerText.includes('DIVE AGAIN') || document.body.innerText.includes('SECURED') || document.body.innerText.includes('RUGGED'))
const diveAgainClicked = await clickText(page, /DIVE AGAIN/)
await wait(400)
const backToPlanning = await page.evaluate(() => !!document.querySelector('canvas'))
console.log('\n=== JOURNEY QUICK-CHECK ===')
console.log({ ranClicked, settledText, diveAgainClicked, backToPlanning })

await page.close()
await browser.close()
