import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto('http://localhost:5182/', { waitUntil: 'load', timeout: 60000 })
await new Promise(r=>setTimeout(r,700))
await page.evaluate(() => { try { localStorage.setItem('assay_coachmark_seen_v1', '1') } catch(e){} })
await page.reload({ waitUntil: 'load', timeout: 60000 })
await new Promise(r=>setTimeout(r,700))
const btn = await page.evaluate(() => {
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => /ENTER THE DIVE/i.test((x.textContent||'').trim()) && (x.tagName==='BUTTON' || getComputedStyle(x).cursor==='pointer'))
  if (b) { b.click(); return true } return false
})
await new Promise(r=>setTimeout(r,500))
const info = await page.evaluate(() => {
  const canvases = [...document.querySelectorAll('canvas')]
  return canvases.map(c => { const r = c.getBoundingClientRect(); return { w: r.width, h: r.height, left: r.left, top: r.top, style: c.getAttribute('style')?.slice(0,200), parentClass: c.parentElement?.className, cls: c.className } })
})
console.log('opened', btn)
console.log(JSON.stringify(info, null, 2))
await browser.close()
