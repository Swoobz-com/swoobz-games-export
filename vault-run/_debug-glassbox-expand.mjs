import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(400)
  await clickText(page, 'bluechips')
  await wait(150)
  await clickText(page, 'send it')
  await wait(700)
  const box = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
  await page.mouse.click(box.x+box.w*0.5, box.y+box.h*0.3)
  await wait(500)
  await page.evaluate(() => { const btns=[...document.querySelectorAll('button')].filter(b=>/take profit/i.test(b.textContent||'')); const b=btns.find(x=>x.offsetParent!==null); if(b) b.click() })
  await wait(2100) // let hero overlay auto-hide (2000ms) before expanding receipt
  const clicked = await clickText(page, 'view receipt')
  await wait(400)
  const modalCount = await page.evaluate(() => document.querySelectorAll('[role="dialog"]').length)
  const stillSamePage = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
  console.log('receipt clicked:', clicked, 'modal(role=dialog)Count:', modalCount, 'stillOnSettled:', stillSamePage)
  await page.screenshot({ path: 'shots-gameflowqa-0707/supp-glassbox-expanded.png' })
  await browser.close()
}
run().catch(e=>{console.error(e);process.exit(1)})
