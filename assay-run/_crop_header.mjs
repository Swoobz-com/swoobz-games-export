import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
for (const vp of [
  { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true, label: 'pixel7' },
  { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true, label: 'iphone14pro' },
]) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: vp })
  const page = (await browser.pages())[0]
  await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0' })
  await wait(500)
  await page.screenshot({ path: `shots-aztec-visreg-0704/_crop-header-${vp.label}.png`, clip: { x: 0, y: 0, width: vp.width, height: 220 } })
  const rects = await page.evaluate(() => {
    function find(txt) {
      const els = [...document.querySelectorAll('*')].filter(e => e.children.length===0 && (e.textContent||'').trim()===txt)
      return els.map(e => { const r = e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
    }
    const playSafe = [...document.querySelectorAll('a,button,div')].filter(e => (e.textContent||'').trim()==='PLAY SAFE').map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})
    return { balance: find('BALANCE'), playSafe }
  })
  console.log(vp.label, JSON.stringify(rects))
  await browser.close()
}
