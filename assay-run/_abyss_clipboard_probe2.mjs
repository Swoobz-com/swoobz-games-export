import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const ctx = browser.defaultBrowserContext()
await ctx.overridePermissions(URL, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write'])

// open + close a few throwaway pages first, mimicking the main script's retry-loop pattern
for (let i = 0; i < 3; i++) {
  const p = await browser.newPage()
  await p.goto(URL, { waitUntil: 'load' })
  await p.close()
}

const page = await browser.newPage()
const errs = []
page.on('pageerror', e => errs.push(e.message))
await page.setViewport({ width: 1200, height: 800 })
await page.goto(URL, { waitUntil: 'load' })
await page.bringToFront()

// inject a real button whose onclick calls clipboard.writeText, then click it via elementHandle
await page.evaluate(() => {
  const b = document.createElement('button')
  b.id = 'probe-copy-btn'
  b.textContent = 'copy'
  b.onclick = () => { navigator.clipboard.writeText('probe-click-text').catch(e => console.error('CLIP ERR', e.message)) }
  document.body.appendChild(b)
})
const handle = await page.$('#probe-copy-btn')
await handle.click()
await new Promise(r => setTimeout(r, 300))
const clip = await page.evaluate(() => navigator.clipboard.readText().catch(e => 'ERR:' + e.message))
console.log('after elementHandle.click() clipboard=', clip, 'pageerrors=', errs)

await browser.close()
