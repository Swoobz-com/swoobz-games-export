import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5390
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const DEVICES = [
  { name: 'pixel7', w: 412, h: 915, ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' },
  { name: 'iphone14pro', w: 393, h: 852, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1' },
]
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  for (const d of DEVICES) {
    const page = await browser.newPage()
    await page.setUserAgent(d.ua)
    await page.setViewport({ width: d.w, height: d.h, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await page.evaluate(() => { try { localStorage.clear() } catch {} try { sessionStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(700)
    await page.screenshot({ path: `shots-mobiletouch-0707/${d.name}-betentry-initial-unscrolled.png` })
    const info = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(e => e.offsetParent !== null && /send it/i.test(e.textContent||''))
      const r = btn ? btn.getBoundingClientRect() : null
      const console_ = document.querySelector('[data-testid="bet-console"]')
      const cr = console_ ? console_.getBoundingClientRect() : null
      return {
        scrollY: window.scrollY,
        innerHeight: window.innerHeight,
        docScrollHeight: document.documentElement.scrollHeight,
        btnRect: r ? { top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height } : null,
        consoleRect: cr ? { top: cr.top, bottom: cr.bottom, height: cr.height } : null,
        bodyText: document.body.innerText.slice(0, 600),
      }
    })
    console.log(d.name, JSON.stringify(info, null, 2))
  }
  await browser.close()
}
run()
