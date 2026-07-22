import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(700)
const info = await page.evaluate(() => {
  const bodyRect = document.body.getBoundingClientRect()
  const rootRect = document.getElementById('root').getBoundingClientRect()
  // find the outermost game container
  const gameRoot = document.getElementById('root').firstElementChild
  const gr = gameRoot ? gameRoot.getBoundingClientRect() : null
  const grCs = gameRoot ? getComputedStyle(gameRoot) : null
  // find bg-image divs
  const bgDivs = [...document.querySelectorAll('div')].filter(d => {
    const bi = getComputedStyle(d).backgroundImage
    return bi && bi !== 'none'
  }).map(d => {
    const r = d.getBoundingClientRect()
    const cs = getComputedStyle(d)
    return { rect: {x:r.x,y:r.y,width:r.width,height:r.height}, bgImage: cs.backgroundImage.slice(0,120), bgSize: cs.backgroundSize, bgPos: cs.backgroundPosition, bgRepeat: cs.backgroundRepeat, position: cs.position, zIndex: cs.zIndex }
  })
  return {
    bodyRect: {w: bodyRect.width, h: bodyRect.height},
    rootRect: {w: rootRect.width, h: rootRect.height},
    gameRootRect: gr ? {x:gr.x,y:gr.y,w:gr.width,h:gr.height} : null,
    gameRootStyle: grCs ? {height: grCs.height, minHeight: grCs.minHeight, position: grCs.position, overflow: grCs.overflow, background: grCs.background.slice(0,150)} : null,
    docScrollHeight: document.documentElement.scrollHeight,
    bgDivs,
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
