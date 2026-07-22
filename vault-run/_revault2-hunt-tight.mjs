import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function clickAria(page, label) {
  const h = await page.evaluateHandle((label) => {
    const els = [...document.querySelectorAll(`[aria-label]`)]
    return els.find((e) => e.getAttribute('aria-label') === label && e.offsetParent !== null) || null
  }, label)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

  for (let attempt = 0; attempt < 8; attempt++) {
    await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(400)
    await clickText(page, 'altseason')
    await wait(150)
    await clickText(page, 'send it')
    await wait(600)
    const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    // tap a variable number of tiles per attempt to vary the final multiplier bps
    const taps = 1 + (attempt % 3)
    const coords = [[0.2,0.2],[0.5,0.2],[0.2,0.5],[0.8,0.2],[0.2,0.8],[0.8,0.8]]
    for (let i = 0; i < taps; i++) {
      const [fx, fy] = coords[i]
      await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
      await wait(250)
    }
    const cashed = await clickText(page, 'take profit')
    await wait(120)
    const text = await page.evaluate(() => document.body.innerText)
    const lines = text.split('\n')
    const multLine = lines.find(l => /^\d+\.\d+x$/i.test(l.trim()))
    console.log(`attempt=${attempt} taps=${taps} cashed=${cashed} mult=${multLine}`)
    console.log(lines.filter(l => /scraped|small bag|took it|paper-handed|secured|rugged|floor fell|ngmi|rekt/i.test(l)))
  }
  await browser.close()
}
run().catch(e => { console.error(e); process.exit(1) })
