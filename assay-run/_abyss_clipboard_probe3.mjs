import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const ctx = browser.defaultBrowserContext()
await ctx.overridePermissions(URL, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write'])

const page = await browser.newPage()
const errs = []
page.on('pageerror', e => errs.push(e.message))
await page.setViewport({ width: 1200, height: 800 })
await page.goto(URL, { waitUntil: 'load' })
await page.bringToFront()
await new Promise(r => setTimeout(r, 400))

// Direct evaluate call on the REAL game page (no click, no button)
const res1 = await page.evaluate(async () => {
  try { await navigator.clipboard.writeText('direct-test-1'); return { ok: true } } catch (e) { return { ok: false, err: e.message } }
})
console.log('direct evaluate on game page:', JSON.stringify(res1))

// check permission state as the page itself sees it
const permState = await page.evaluate(async () => {
  try {
    const p = await navigator.permissions.query({ name: 'clipboard-write' })
    return p.state
  } catch (e) { return 'ERR:' + e.message }
})
console.log('permission state (clipboard-write) as seen by page:', permState)

console.log('pageerrors so far:', errs)
await browser.close()
