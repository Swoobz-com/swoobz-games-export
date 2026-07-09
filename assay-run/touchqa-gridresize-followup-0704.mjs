import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5193/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-touchqa-gridresize-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const devices = [
  { name: 'pixel7-412x915', width: 412, height: 915 },
  { name: 'iphone14pro-390x844', width: 390, height: 844 },
]

const report = {}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })

const tapText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  await wait(120)
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return true
}

const buttonBox = (label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(l))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, top: r.top }
}, label)

const headerRowCheck = () => page.evaluate(() => {
  const safetyBtn = [...document.querySelectorAll('button')].find((b) => /PLAY SAFE/i.test(b.textContent || ''))
  if (!safetyBtn) return { found: false }
  let row = safetyBtn.parentElement
  let hops = 0
  while (row && hops < 4) { if (getComputedStyle(row).display === 'flex') break; row = row.parentElement; hops++ }
  const sessionEl = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /SESSION ·/.test(e.textContent || ''))
  const rowChildren = row ? [...row.children].map((c) => { const r = c.getBoundingClientRect(); return { text: (c.textContent || '').slice(0, 40), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) } }) : []
  // Ground-truth single-line test: the flex ROW's own rendered height, not raw
  // child .top values (children of different heights vertically-center inside
  // a single-row flex container and legitimately have different .top/.bottom —
  // that is NOT wrapping). A wrap doubles the row's own box height.
  const rowRect = row ? row.getBoundingClientRect() : null
  const maxChildH = rowChildren.length ? Math.max(...rowChildren.map((c) => c.h)) : 0
  const singleLine = rowRect ? rowRect.height <= maxChildH + 4 : null
  return {
    found: true,
    sessionChipPresent: !!sessionEl,
    sessionChipText: sessionEl ? sessionEl.textContent : null,
    rowFlexWrap: row ? getComputedStyle(row).flexWrap : null,
    rowOwnHeight: rowRect ? Math.round(rowRect.height) : null,
    rowChildren,
    singleLine,
    playSafeBox: (() => { const r = safetyBtn.getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top } })(),
  }
})

const railCheck = () => page.evaluate(() => {
  // Find the element containing the "TO ASSAY" label text (unique to the narrow ASSAY RAIL/side rail).
  const label = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^TO ASSAY$/.test((e.textContent || '').trim()))
  if (!label) return { found: false }
  // Walk up to the PLATE_SPECIMEN-styled panel (has a background-image style).
  let node = label
  let hops = 0
  let plateNode = null
  while (node && hops < 8) {
    const cs = getComputedStyle(node)
    if (cs.backgroundImage && cs.backgroundImage !== 'none') { plateNode = node; break }
    node = node.parentElement
    hops++
  }
  const target = plateNode || label.parentElement
  const r = target.getBoundingClientRect()
  return {
    found: true,
    plateFound: !!plateNode,
    rect: { left: r.left, right: r.right, width: r.width, top: r.top, bottom: r.bottom },
    viewportW: window.innerWidth,
    overflowsRight: r.right > window.innerWidth + 1,
    overflowsLeft: r.left < -1,
    scrollWidthDoc: document.documentElement.scrollWidth,
    clientWidthDoc: document.documentElement.clientWidth,
  }
})

const copyGlyphLiveTapFire = () => page.evaluate(async () => {
  const btn = [...document.querySelectorAll('button')].find((b) => /^copy$/i.test((b.textContent || '').trim()))
  return btn ? true : false
})

for (const d of devices) {
  const r = {}
  await page.emulate({
    viewport: { width: d.width, height: d.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
  })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)

  await tapText('ENTER THE ASSAY LINE')
  await wait(400)
  r.headerPrePreRound = await headerRowCheck()
  r.railPrePreRound = await railCheck()

  // Play a quick round to populate the SESSION chip (long negative or positive string).
  await tapText('PACE: BEAD') // switch to INSTANT so the cascade settles synchronously
  await wait(150)
  const scroller0 = await page.evaluate(() => { const c = document.querySelector('canvas'); const rr = c.parentElement.getBoundingClientRect(); return { x: rr.x, y: rr.y } })
  const TILE = 46
  for (let i = 0; i < 8; i++) {
    const col = i % 4, row = Math.floor(i / 4)
    await page.touchscreen.tap(scroller0.x + TILE / 2 + col * TILE, scroller0.y + TILE / 2 + row * TILE)
    await wait(60)
  }
  const bbox = await buttonBox('THROW BREAKER')
  if (bbox) await page.touchscreen.tap(bbox.x, bbox.y)
  await wait(1500)
  // Poll for the settle certificate (a "copy" button) up to ~4s in case staggered reveal is still mid-cascade.
  for (let i = 0; i < 20; i++) {
    const has = await page.evaluate(() => !![...document.querySelectorAll('button')].find((b) => /^copy$/i.test((b.textContent || '').trim())))
    if (has) break
    await wait(200)
  }
  await page.screenshot({ path: `${OUT}/${d.name}-followup-01-settled.png` })

  r.headerPostRound = await headerRowCheck()
  await page.screenshot({ path: `${OUT}/${d.name}-followup-02-header-postround.png`, clip: { x: 0, y: 0, width: d.width, height: 140 } })

  // ── Real touch tap on the CopyGlyph "copy" button; confirm label flips to "copied" ──
  const cgBox = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /^copy$/i.test((x.textContent || '').trim()))
    if (!b) return null
    const rr = b.getBoundingClientRect()
    return { x: rr.x + rr.width / 2, y: rr.y + rr.height / 2, w: rr.width, h: rr.height }
  })
  r.copyGlyphBoxLive = cgBox
  if (cgBox) {
    await page.touchscreen.tap(cgBox.x, cgBox.y)
    await wait(150)
    r.copyGlyphLabelAfterTap = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /^copied$/i.test((x.textContent || '').trim()))
      return b ? b.textContent.trim() : 'NOT-FOUND'
    })
    r.clipboardReadAttempt = await page.evaluate(async () => {
      try { const t = await navigator.clipboard.readText(); return t.length + ' chars' } catch (e) { return 'clipboard-read-blocked: ' + e.message }
    })
  }
  await page.screenshot({ path: `${OUT}/${d.name}-followup-03-after-copy-tap.png` })

  // ── ASSAY AGAIN to get back to planning, then re-check rail post-round ──
  await tapText('ASSAY AGAIN')
  await wait(350)
  r.railPostRound = await railCheck()

  report[d.name] = r
}

report.errors = errors
fs.writeFileSync(`${OUT}/followup-report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(0)
