import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true } })
await page.goto(URL, { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
await page.reload({ waitUntil: 'networkidle0' })
await wait(300)

const enterBox = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('ENTER THE DIVE'))
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.touchscreen.tap(enterBox.x, enterBox.y)
await wait(400)

const matches = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('div,span')]
  return nodes.filter((d) => d.children.length === 0 && /^\d+\.\d{2}$/.test((d.textContent||'').trim()))
    .map((d) => {
      const r = d.getBoundingClientRect()
      const cs = getComputedStyle(d)
      return { text: d.textContent, fontSize: cs.fontSize, top: r.top, left: r.left, tag: d.tagName }
    })
})
console.log(JSON.stringify(matches, null, 2))

// tap plus and re-check
const plusBox = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => (x.textContent||'').trim() === '+')
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width/2, y: r.y + r.height/2 }
})
await page.touchscreen.tap(plusBox.x, plusBox.y)
await wait(200)
const matches2 = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('div,span')]
  return nodes.filter((d) => d.children.length === 0 && /^\d+\.\d{2}$/.test((d.textContent||'').trim()))
    .map((d) => ({ text: d.textContent, top: d.getBoundingClientRect().top }))
})
console.log('AFTER PLUS TAP:', JSON.stringify(matches2, null, 2))

await browser.close()
