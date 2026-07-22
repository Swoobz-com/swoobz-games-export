import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const GRID_DIM = 14
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900 })
page.on('console', (m) => console.log('[console]', m.type(), m.text()))
page.on('pageerror', (e) => console.log('[pageerror]', e.message))

await page.evaluateOnNewDocument(() => {
  window.__orderLog = []
  window.__fillTextAll = []
  const origFillText = CanvasRenderingContext2D.prototype.fillText
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...rest) {
    window.__fillTextAll.push({ text: String(text), x, y })
    if (/^\d+$/.test(String(text))) window.__orderLog.push({ text: String(text), x, y })
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

const dpr = await page.evaluate(() => window.devicePixelRatio)
console.log('devicePixelRatio', dpr)

const canvasInfo = await page.evaluate(() => {
  const canvases = [...document.querySelectorAll('canvas')]
  return canvases.map((c) => ({
    aria: c.getAttribute('aria-label'),
    cssWidth: c.getBoundingClientRect().width,
    cssHeight: c.getBoundingClientRect().height,
    bufferWidth: c.width,
    bufferHeight: c.height,
  }))
})
console.log('canvases on document:', JSON.stringify(canvasInfo, null, 2))

const geom = await page.evaluate(() => {
  const canvases = [...document.querySelectorAll('canvas')]
  const board = canvases.find((c) => (c.getAttribute('aria-label') || '').includes('Abyss floor board'))
  const r = board.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
})
console.log('board geom', geom)
const tile = geom.width / GRID_DIM
console.log('computed tile size (css px)', tile)

// clear logs, tap ONE known tile idx=12 (col=12,row=0), read logs
await page.evaluate(() => { window.__orderLog = []; window.__fillTextAll = [] })
const idx = 12
const col = idx % GRID_DIM
const row = Math.floor(idx / GRID_DIM)
const x = geom.left + (col + 0.5) * tile
const y = geom.top + (row + 0.5) * tile
console.log(`tapping idx=${idx} at screen (${x.toFixed(1)}, ${y.toFixed(1)})`)
await page.mouse.click(x, y)
await wait(200)

const orderLog = await page.evaluate(() => window.__orderLog)
const allText = await page.evaluate(() => window.__fillTextAll)
console.log('orderLog after tap:', JSON.stringify(orderLog))
console.log('ALL fillText calls after tap (count=' + allText.length + '):', JSON.stringify(allText.slice(0, 40)))

await page.screenshot({ path: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/_fabi_debug_afterTap12.png' })

await browser.close()
