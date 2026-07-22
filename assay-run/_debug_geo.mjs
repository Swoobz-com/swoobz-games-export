import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto('http://localhost:5182/', { waitUntil: 'load', timeout: 60000 })
await new Promise(r=>setTimeout(r,700))
await page.evaluate(() => { try { localStorage.setItem('assay_coachmark_seen_v1', '1') } catch(e){} })
await page.reload({ waitUntil: 'load', timeout: 60000 })
await new Promise(r=>setTimeout(r,700))
await page.evaluate(() => {
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find(x => /ENTER THE DIVE/i.test((x.textContent||'').trim()) && (x.tagName==='BUTTON' || getComputedStyle(x).cursor==='pointer'))
  if (b) b.click()
})
await new Promise(r=>setTimeout(r,500))
const geoTL = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  let el = c.parentElement
  for (let i=0;i<4 && el;i++){ const cs=getComputedStyle(el); if (/(auto|scroll)/.test(cs.overflowX)||/(auto|scroll)/.test(cs.overflow)) break; el = el.parentElement }
  if (el) { el.scrollLeft = 0; el.scrollTop = 0 }
  const r = c.getBoundingClientRect()
  return { left: r.left, top: r.top, w: r.width, h: r.height, scrollable: !!el, scrollWidth: el?.scrollWidth, clientWidth: el?.clientWidth, tag: el?.tagName, cls: el?.className }
})
console.log(JSON.stringify(geoTL, null, 2))
await browser.close()
