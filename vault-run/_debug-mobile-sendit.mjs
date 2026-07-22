import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.on('console', m => console.log('CONSOLE', m.type(), m.text()))
  page.on('pageerror', e => console.log('PAGEERROR', e.message))
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  const btnInfo = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const send = btns.find(b => /send it/i.test(b.textContent||''))
    if (!send) return { found: false, allTexts: btns.map(b=>b.textContent.trim()).slice(0,30) }
    const r = send.getBoundingClientRect()
    return { found: true, text: send.textContent, disabled: send.disabled, rect: r, offsetParentNull: send.offsetParent===null }
  })
  console.log('SEND IT btn info', JSON.stringify(btnInfo, null, 2))
  // try clicking via evaluateHandle .click()
  const h = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => /send it/i.test(b.textContent||'')))
  const el = h.asElement()
  if (el) {
    try { await el.click(); console.log('el.click() succeeded') } catch(e) { console.log('el.click() FAILED', e.message) }
  } else {
    console.log('no element handle')
  }
  await wait(800)
  const phase = await page.evaluate(() => ({
    worldpicker: !!document.querySelector('[data-testid="vault-board-worldpicker"]'),
    wagerLocked: !!document.querySelector('[data-testid="vault-ctl-wager-locked"]'),
    bodyTextSnippet: document.body.innerText.slice(0,200)
  }))
  console.log('POST-CLICK PHASE', JSON.stringify(phase, null, 2))
  await page.screenshot({ path: '_debug-mobile-sendit.png', fullPage: true })
  await browser.close()
}
run().catch(e=>{console.error('FATAL',e); process.exit(1)})
