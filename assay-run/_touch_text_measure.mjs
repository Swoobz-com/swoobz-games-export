import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r=>setTimeout(r,ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button')].find(x => r.test((x.textContent || '').trim()))
  if (b) { b.click(); return true } return false
}, re.source)

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'load' })
await page.evaluate(()=>{try{window.localStorage.clear()}catch{}})
await page.reload({waitUntil:'load'})
await wait(400)
await clickText(page, /ENTER THE DIVE/); await wait(300)

const out = await page.evaluate(() => {
  const rowH = (el) => { const r = el.getBoundingClientRect(); return +r.height.toFixed(1) }
  const fs = (el) => +parseFloat(getComputedStyle(el).fontSize).toFixed(1)
  const byText = (sel, re) => [...document.querySelectorAll(sel)].filter(x => new RegExp(re,'i').test((x.textContent||'').trim()))
  const res = {}
  // ≥44 touch controls
  const btns = [...document.querySelectorAll('button')]
  res.calibKnobMinus = (() => { const b = btns.find(x => (x.textContent||'').trim()==='−'); return b?rowH(b):null })()
  res.calibKnobPlus  = (() => { const b = btns.find(x => (x.textContent||'').trim()==='+'); return b?rowH(b):null })()
  res.quickChip1     = (() => { const b = btns.find(x => (x.textContent||'').trim()==='1'); return b?rowH(b):null })()
  res.calibToggleCLEAR = (() => { const b = btns.find(x => (x.textContent||'').trim()==='CLEAR'); return b?rowH(b):null })()
  res.calibTogglePACE  = (() => { const b = btns.find(x => /^PACE:/i.test((x.textContent||'').trim())); return b?rowH(b):null })()
  res.playSafe       = (() => { const b = btns.find(x => (x.textContent||'').trim()==='PLAY SAFE'); return b?rowH(b):null })()
  // ≥11 text
  const footer = byText('span', 'DUCAT-TO-DUCAT|GOLDEN SLEDGE')
  res.footerLegendFs = footer.length ? fs(footer[0]) : null
  const tierShort = byText('span', '^(REEF|MIDNIGHT|HADAL)$')
  res.tierSublabelFs = tierShort.length ? fs(tierShort[0]) : null
  return res
})
console.log(JSON.stringify(out, null, 2))
await page.close(); await browser.close()
