import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const GRID_DIM = 14
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900 })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))

await page.evaluateOnNewDocument(() => {
  window.__fillTextAll = []
  let dbgCounter = 0
  const origCreateElement = Document.prototype.createElement
  Document.prototype.createElement = function (tag, ...rest) {
    const el = origCreateElement.call(this, tag, ...rest)
    if (String(tag).toLowerCase() === 'canvas') {
      el.__dbgId = ++dbgCounter
    }
    return el
  }
  const origFillText = CanvasRenderingContext2D.prototype.fillText
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...rest) {
    const c = this.canvas
    window.__fillTextAll.push({
      text: String(text), x, y,
      dbgId: c ? c.__dbgId ?? 'no-dbgid(dom-canvas)' : 'no-canvas-ref',
      cw: c ? c.width : null, ch: c ? c.height : null,
      inDom: c ? document.documentElement.contains(c) : null,
      aria: c ? c.getAttribute && c.getAttribute('aria-label') : null,
    })
    return origFillText.call(this, text, x, y, ...rest)
  }
})

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
await page.reload({ waitUntil: 'networkidle0' })
await wait(300)

const tapText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
console.log('opened planning:', await tapText('ENTER THE DIVE'))
await wait(400)

const geom = await page.evaluate(() => {
  const canvases = [...document.querySelectorAll('canvas')]
  const board = canvases.find((c) => (c.getAttribute('aria-label') || '').includes('Abyss floor board'))
  const r = board.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
})
const tile = geom.width / GRID_DIM
console.log('board geom', geom, 'tile', tile)

await page.evaluate(() => { window.__fillTextAll = [] })
const idx = 12
const col = idx % GRID_DIM
const row = Math.floor(idx / GRID_DIM)
const x = geom.left + (col + 0.5) * tile
const y = geom.top + (row + 0.5) * tile
console.log(`tapping idx=${idx} at screen (${x.toFixed(1)}, ${y.toFixed(1)})`)
await page.mouse.click(x, y)
await wait(250)

const all = await page.evaluate(() => window.__fillTextAll)
console.log('total fillText calls:', all.length)
// group by dbgId
const byId = new Map()
for (const e of all) {
  const key = e.dbgId + '|' + e.cw + 'x' + e.ch + '|' + e.inDom + '|' + e.aria
  if (!byId.has(key)) byId.set(key, [])
  byId.get(key).push({ text: e.text, x: e.x, y: e.y })
}
for (const [key, entries] of byId) {
  console.log('\n--- group:', key, ' count=', entries.length, '---')
  console.log(JSON.stringify(entries.slice(0, 6)))
}

await browser.close()
