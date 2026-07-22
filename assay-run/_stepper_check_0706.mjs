import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true, isLandscape: false } })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
await page.reload({ waitUntil: 'networkidle0' })
await wait(300)
const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes(t)) || null, txt)
  const el = handle.asElement()
  if (!el) return null
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return box
}
await tapText(page, 'ENTER THE DIVE')
await wait(300)
const wagerBefore = await page.evaluate(() => [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && /^\d+\.\d{2}$/.test((d.textContent||'').trim()) && getComputedStyle(d).fontSize === '19px')?.textContent)
// tap the + stepper
const plusHandle = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => (b.textContent||'').trim() === '+'))
const plusBox = await plusHandle.asElement().evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2, w: r.width, h: r.height } })
await page.touchscreen.tap(plusBox.x, plusBox.y)
await wait(150)
const wagerAfterPlus = await page.evaluate(() => [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && /^\d+\.\d{2}$/.test((d.textContent||'').trim()) && getComputedStyle(d).fontSize === '19px')?.textContent)
// tap the - stepper
const minusHandle = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => (b.textContent||'').trim() === '−'))
const minusBox = await minusHandle.asElement().evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2, w: r.width, h: r.height } })
await page.touchscreen.tap(minusBox.x, minusBox.y)
await wait(150)
const wagerAfterMinus = await page.evaluate(() => [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && /^\d+\.\d{2}$/.test((d.textContent||'').trim()) && getComputedStyle(d).fontSize === '19px')?.textContent)
console.log(JSON.stringify({ wagerBefore, plusBox, wagerAfterPlus, minusBox, wagerAfterMinus }, null, 2))
await browser.close()
