import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5189/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
const tapText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return true
}
for (const width of [390, 412]) {
  await page.emulate({ viewport: { width, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile Safari/537.36' })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  const lobbyHeader = await page.evaluate(() => {
    const safety = [...document.querySelectorAll('button')].find(b => /PLAY SAFE/i.test(b.textContent||''))
    const balanceText = [...document.querySelectorAll('*')].find(e => e.children.length===0 && /^\$|BALANCE/.test(e.textContent||'') && e.textContent.length < 20)
    return {
      safety: safety ? safety.getBoundingClientRect().toJSON() : null,
      documentWidth: document.documentElement.clientWidth,
      bodyHTML_hasBalance: document.body.innerText.includes('BALANCE'),
    }
  })
  await tapText('ENTER THE ASSAY LINE')
  await wait(400)
  const planningHeader = await page.evaluate(() => {
    const safety = [...document.querySelectorAll('button')].find(b => /PLAY SAFE/i.test(b.textContent||''))
    const allText = [...document.querySelectorAll('*')].filter(e => e.children.length===0 && e.textContent.trim().length>0)
    const balanceLabel = allText.find(e => /^BALANCE$/.test(e.textContent.trim()))
    const balanceValue = balanceLabel ? balanceLabel.nextElementSibling : null
    const sessionMeta = allText.find(e => /SESSION ·/.test(e.textContent))
    return {
      safetyRect: safety ? safety.getBoundingClientRect().toJSON() : null,
      balanceLabelRect: balanceLabel ? balanceLabel.getBoundingClientRect().toJSON() : null,
      sessionMetaRect: sessionMeta ? sessionMeta.getBoundingClientRect().toJSON() : null,
      documentWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }
  })
  console.log(width, JSON.stringify({ lobbyHeader, planningHeader }, null, 2))
}
await browser.close()
