import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t, exact=false) {
  const h = await page.evaluateHandle((t, exact) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()
    return els.find(e=>e.offsetParent!==null && !e.disabled && norm(e)===t.toLowerCase()) ||
      (!exact && els.find(e=>e.offsetParent!==null && !e.disabled && norm(e).includes(t.toLowerCase())))
  }, t, exact)
  const el = h.asElement()
  if (!el) return {found:false}
  const box = await el.boundingBox()
  if (!box) return {found:true, box:null}
  await page.touchscreen.tap(box.x+box.width/2, box.y+box.height/2)
  return {found:true, box}
}
async function main(){
  const browser = await puppeteer.launch({executablePath:CHROME, headless:'new', args:['--no-sandbox']})
  const page = await browser.newPage()
  await page.setViewport({width:412, height:824, isMobile:true, hasTouch:true, deviceScaleFactor:2.625})
  await page.goto('http://localhost:5314/', {waitUntil:'networkidle0'})
  await page.evaluate(()=>{try{localStorage.clear();sessionStorage.clear()}catch{}})
  await page.reload({waitUntil:'networkidle0'})
  await wait(600)
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const skip = btns.find((b) => /skip|got it|close|start/i.test(b.textContent || ''))
    if (skip) skip.click()
  })
  await wait(300)
  const r1 = await clickText(page, 'BLUECHIPS', false)
  console.log('click bluechips', JSON.stringify(r1))
  await wait(400)
  await page.screenshot({path:'diag-after-bluechips-click.png'})
  const r2 = await clickText(page, 'SEND IT', false)
  console.log('click send it', JSON.stringify(r2))
  await wait(900)
  await page.screenshot({path:'diag-after-sendit-click.png'})
  const bodyText = await page.evaluate(()=>document.body.innerText.slice(0,500))
  console.log('BODY TEXT AFTER:', bodyText)
  const canvasInfo = await page.evaluate(()=>{
    const c = document.querySelector('[data-testid="vault-canvas-shell"] canvas')
    if(!c) return null
    const r = c.getBoundingClientRect()
    return {x:r.x,y:r.y,w:r.width,h:r.height}
  })
  console.log('canvas', JSON.stringify(canvasInfo))
  await browser.close()
}
main().catch(e=>{console.error(e);process.exit(1)})
