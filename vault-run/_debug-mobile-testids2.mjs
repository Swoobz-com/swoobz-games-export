import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, { t, within })
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await clickText(page, 'bluechips')
  await wait(200)
  await clickText(page, 'send it')
  await wait(700)
  const testidsPlaying = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')))
  console.log('PLAYING testids:', JSON.stringify(testidsPlaying))
  // reveal a tile then cash out
  const box = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
  await page.mouse.click(box.x+box.w*0.5, box.y+box.h*0.3)
  await wait(500)
  await clickText(page, 'take profit')
  await wait(700)
  const testidsSettled = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid')))
  console.log('SETTLED testids:', JSON.stringify(testidsSettled))
  const bodyText = await page.evaluate(() => document.body.innerText)
  console.log('SETTLED BODY TEXT:', bodyText.slice(0,600))
  await page.screenshot({ path: '_debug-mobile-settled.png', fullPage: true })
  await browser.close()
}
run().catch(e=>{console.error(e); process.exit(1)})
