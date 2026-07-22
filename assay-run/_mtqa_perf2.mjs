import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const GRID_DIM = 14

async function run(width, height, dsf, label) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: dsf, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await wait(600)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /ENTER THE DIVE/i.test(b.textContent||''))
    btn?.click()
  })
  await wait(400)
  // reset scroll, select 14 tiles (route length 14, tier=standard min 8 -> use 14 to get a longer cascade to observe)
  await page.evaluate(() => { const el=document.querySelector('.assayBoardScroll'); if(el){el.scrollLeft=0; el.scrollTop=0} })
  await wait(150)
  const geo = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {left:r.left, top:r.top, width:r.width} })
  const TILE = geo.width / GRID_DIM
  const cells = []
  for (let row = 5; row <= 8 && cells.length < 14; row++) { const cols = row % 2 ? [1,2,3,4,5,6,7] : [7,6,5,4,3,2,1]; for (const col of cols) if (cells.length<14) cells.push([col,row]) }
  for (const [col,row] of cells) { await page.touchscreen.tap(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(30) }
  await wait(150)
  // force INSTANT pace off (keep staggered, default) - proceed to commit
  const client = await page.target().createCDPSession()
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', { offline:false, latency:150, downloadThroughput:1.5*1024*1024/8, uploadThroughput:750*1024/8 })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.evaluate(() => {
    window.__frames = []
    let last = performance.now()
    const t0 = last
    function loop(t) { window.__frames.push({dt: t-last, tOffset: t-t0}); last = t; window.__raf = requestAnimationFrame(loop) }
    window.__raf = requestAnimationFrame(loop)
  })
  // commit RUN THE LINE
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => (b.textContent||'').includes('RUN THE LINE'))
    btn?.click()
  })
  await wait(4000)
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  const frames = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__frames.slice(2) })
  const max = frames.reduce((a,f)=>f.dt>a.dt?f:a, {dt:0,tOffset:0})
  const over22 = frames.filter(f=>f.dt>22.2)
  const over33 = frames.filter(f=>f.dt>33.3)
  console.log(label, JSON.stringify({ totalFrames: frames.length, maxFrameMs: max.dt, maxAtOffsetMs: max.tOffset, over45fpsBudgetCount: over22.length, over45fpsBudgetOffsets: over22.map(f=>Math.round(f.tOffset)), over30fpsBudgetCount: over33.length }, null, 2))
  await browser.close()
}

await run(412, 915, 2.625, 'PIXEL7')
await run(393, 852, 3, 'IPHONE14PRO')
