import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 } })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle0' })
const clickText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const bodyText = () => page.evaluate(() => document.body.innerText)
await clickText('ENTER THE ASSAY LINE')
await new Promise(r=>setTimeout(r,150))
let won = false
for (let attempt=0; attempt<40 && !won; attempt++) {
  await clickText('CLEAR')
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
  const tile = box.w/32
  for (let col=0; col<8; col++) {
    await page.mouse.click(box.x+col*tile+tile/2, box.y+tile/2)
  }
  await new Promise(r=>setTimeout(r,60))
  const pace = await bodyText()
  if (pace.includes('PACE: BEAD')) { await clickText('PACE:'); await new Promise(r=>setTimeout(r,50)) }
  await clickText('PLUNGE')
  await new Promise(r=>setTimeout(r,1200))
  const txt = await bodyText()
  if (txt.includes('CLAIM PROVEN')) {
    won = true
    // Sample pixels along tile0's rim to check dashed vs solid, and center color.
    const info = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      const ctx = c.getContext('2d')
      const dpr = Math.min(window.devicePixelRatio||1,2)
      const rect = c.getBoundingClientRect()
      const tile = rect.width/32
      const cx = Math.round((tile/2)*dpr)
      const cy = Math.round((tile/2)*dpr)
      const r = Math.round((tile/2*0.995)*dpr)
      const samples = []
      for (let a=0; a<360; a+=15) {
        const rad = a*Math.PI/180
        const x = cx + Math.round(Math.cos(rad)*r)
        const y = cy + Math.round(Math.sin(rad)*r)
        const d = ctx.getImageData(x,y,1,1).data
        samples.push([a, d[0],d[1],d[2],d[3]])
      }
      const centerD = ctx.getImageData(cx,cy,1,1).data
      return { samples, center: [centerD[0],centerD[1],centerD[2]], tile }
    })
    console.log(JSON.stringify(info, null, 1))
  } else if (txt.includes('BAD VEIN')) {
    await new Promise(r=>setTimeout(r,300))
    await clickText('ASSAY AGAIN')
    await new Promise(r=>setTimeout(r,120))
  }
}
console.log('won', won)
await browser.close()
