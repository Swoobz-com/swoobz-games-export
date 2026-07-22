import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'

for (const headless of ['new', false]) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless, defaultViewport: null, args: ['--use-fake-ui-for-media-stream'] })
  const ctx = browser.defaultBrowserContext()
  try {
    await ctx.overridePermissions(URL, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write'])
  } catch (e) { console.log('override err', e.message) }
  const page = await browser.newPage()
  const errs = []
  page.on('pageerror', e => errs.push(e.message))
  await page.setViewport({ width: 1200, height: 800 })
  await page.goto(URL, { waitUntil: 'load' })
  await page.bringToFront()
  const res = await page.evaluate(async () => {
    try {
      await navigator.clipboard.writeText('hello-world-test')
      const back = await navigator.clipboard.readText()
      return { ok: true, back }
    } catch (e) {
      return { ok: false, err: e.message }
    }
  })
  console.log('headless=', headless, 'result=', JSON.stringify(res), 'pageerrors=', errs)
  await browser.close()
}
