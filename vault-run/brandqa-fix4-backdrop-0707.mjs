import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5286'
const OUT = 'shots-brandqa-fix4-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const page = await b.newPage()

const netHits = []
page.on('response', (res) => {
  const u = res.url()
  if (u.includes('backdrop') || u.includes('rug-or-riches')) netHits.push({ url: u, status: res.status() })
})

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await wait(800)

// click ALTSEASON world card in lobby
const clickedWorld = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="vault-world-card-altseason"]')
  if (el) { el.click(); return true }
  return false
})
console.log('clicked altseason world card:', clickedWorld)
await wait(400)

await clickText(page, 'ape in')
await wait(500)
await page.screenshot({ path: `${OUT}/desktop-altseason-betentry.png`, fullPage: false })

await clickText(page, 'send it')
await wait(700)
await page.screenshot({ path: `${OUT}/desktop-altseason-playing.png`, fullPage: false })

// zoom crop of the canvas board area for garbled-text inspection
const canvasBox = await page.evaluate(() => {
  const c = document.querySelector('canvas[data-testid="vault-grid-canvas"]')
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height }
})
console.log('canvas box:', canvasBox)
if (canvasBox) {
  await page.screenshot({ path: `${OUT}/desktop-altseason-board-crop.png`, clip: { x: Math.max(0,canvasBox.x), y: Math.max(0,canvasBox.y), width: canvasBox.width, height: canvasBox.height } })
}

// confirm the backdrop asset actually used: check CSS background-image / <img> src / canvas drawImage source references
const backdropInfo = await page.evaluate(() => {
  const results = { bgImages: [], imgs: [] }
  document.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el)
    if (cs.backgroundImage && cs.backgroundImage !== 'none' && cs.backgroundImage.includes('backdrop')) {
      results.bgImages.push({ tag: el.tagName, testid: el.getAttribute('data-testid'), bg: cs.backgroundImage })
    }
  })
  document.querySelectorAll('img').forEach((img) => {
    if (img.src.includes('backdrop')) results.imgs.push(img.src)
  })
  return results
})
console.log('backdropInfo:', JSON.stringify(backdropInfo, null, 2))

await wait(300)
console.log('network hits:', JSON.stringify(netHits, null, 2))

// mobile viewport pass — Pixel 7
const page2 = await b.newPage()
const netHits2 = []
page2.on('response', (res) => {
  const u = res.url()
  if (u.includes('backdrop') || u.includes('rug-or-riches')) netHits2.push({ url: u, status: res.status() })
})
await page2.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page2.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await page2.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
await page2.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await wait(800)
const clickedWorld2 = await page2.evaluate(() => {
  const el = document.querySelector('[data-testid="vault-world-card-altseason"]')
  if (el) { el.click(); return true }
  return false
})
console.log('mobile clicked altseason:', clickedWorld2)
await wait(400)
await clickText(page2, 'ape in')
await wait(500)
await page2.screenshot({ path: `${OUT}/mobile-altseason-betentry.png` })
await clickText(page2, 'send it')
await wait(700)
await page2.screenshot({ path: `${OUT}/mobile-altseason-playing.png` })
await wait(300)
console.log('mobile network hits:', JSON.stringify(netHits2, null, 2))

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ netHits, netHits2, backdropInfo, canvasBox }, null, 2))
await b.close()
