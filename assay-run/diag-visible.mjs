import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true } })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle2' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle2' })
await wait(400)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('ENTER THE ASSAY LINE'))
  b.click()
})
await wait(400)
const info = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const rect = c.getBoundingClientRect()
  const GRID_DIM = 10
  const tile = rect.width / GRID_DIM
  let clip = rect
  const parent = c.parentElement
  if (parent) {
    const pcs = getComputedStyle(parent)
    if (['auto','scroll'].includes(pcs.overflow) || ['auto','scroll'].includes(pcs.overflowX) || ['auto','scroll'].includes(pcs.overflowY)) {
      clip = parent.getBoundingClientRect()
    }
  }
  const margin = 5
  const visible = []
  for (let row=0; row<GRID_DIM; row++) for (let col=0; col<GRID_DIM; col++) {
    const x = rect.x + col*tile + tile/2
    const y = rect.y + row*tile + tile/2
    if (x>=clip.x+margin && x<=clip.x+clip.width-margin && y>=clip.y+margin && y<=clip.y+clip.height-margin) visible.push({idx: row*10+col, col, row})
  }
  return { rect: {x:rect.x,y:rect.y,w:rect.width,h:rect.height}, clip: {x:clip.x,y:clip.y,w:clip.width,h:clip.height}, tile, visibleCount: visible.length, visible, parentTag: parent?.tagName, parentOverflow: parent? getComputedStyle(parent).overflow : null, scrollLeft: parent?.scrollLeft, scrollTop: parent?.scrollTop }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
