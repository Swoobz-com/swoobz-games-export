import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find((x) => r.test((x.textContent||'').trim()) && (x.tagName==='BUTTON' || getComputedStyle(x).cursor==='pointer'))
  if (b) { b.click(); return true }
  return false
}, re.source)
async function boardGeo(page) {
  return page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {left:r.left, top:r.top, right:r.right, bottom:r.bottom, w:r.width, h:r.height} })
}
async function desktopTrace(page, cells, dim) {
  const geo = await boardGeo(page); const TILE = geo.w/dim
  for (const [col,row] of cells) { await page.mouse.click(geo.left+(col+0.5)*TILE, geo.top+(row+0.5)*TILE); await wait(20) }
}
async function mobilePan(page, col, row, dim) {
  const info = await page.evaluate(() => { const c=document.querySelector('canvas'); const wrap=c.parentElement; const wr=wrap.getBoundingClientRect(); return {wrapW:wr.width, wrapH:wr.height, scrollW:wrap.scrollWidth, scrollH:wrap.scrollHeight} })
  const TILE = info.scrollW/dim
  const tx=(col+0.5)*TILE, ty=(row+0.5)*TILE
  const dsl = Math.max(0, Math.min(info.scrollW-info.wrapW, tx-info.wrapW/2))
  const dst = Math.max(0, Math.min(info.scrollH-info.wrapH, ty-info.wrapH/2))
  await page.evaluate((sl,st)=>{const c=document.querySelector('canvas'); const wrap=c.parentElement; wrap.scrollLeft=sl; wrap.scrollTop=st}, dsl, dst)
  await wait(30)
  const r2 = await page.evaluate(()=>{const c=document.querySelector('canvas'); const wrap=c.parentElement; const wr=wrap.getBoundingClientRect(); return {left:wr.left, top:wr.top, scrollLeft:wrap.scrollLeft, scrollTop:wrap.scrollTop}})
  await page.touchscreen.tap(r2.left-r2.scrollLeft+tx, r2.top-r2.scrollTop+ty)
}
async function heroRect(page) {
  return page.evaluate(() => {
    const wrap = [...document.querySelectorAll('div[aria-hidden]')].find(d => getComputedStyle(d).zIndex==='20' && /SECURED THE HAUL/i.test(d.textContent||''))
    if (!wrap) return null
    const card = [...wrap.children].find(c => c.tagName==='DIV' && getComputedStyle(c).position==='absolute' && c.textContent.includes('SECURED'))
    const rc = (card||wrap).getBoundingClientRect()
    return {left:rc.left, top:rc.top, right:rc.right, bottom:rc.bottom}
  })
}
const VIEWPORTS = { desktop: {width:1440,height:900,deviceScaleFactor:1}, pixel7: {width:412,height:915,deviceScaleFactor:2.625,isMobile:true,hasTouch:true}, iphone14pro: {width:393,height:852,deviceScaleFactor:3,isMobile:true,hasTouch:true} }
const browser = await puppeteer.launch({ executablePath: EXE, headless:'new', defaultViewport:null })
for (const vpKey of ['desktop','pixel7','iphone14pro']) {
  let found=false
  for (let attempt=0; attempt<20 && !found; attempt++) {
    const page = await browser.newPage()
    await page.setViewport(VIEWPORTS[vpKey])
    await page.goto('http://localhost:5182/', {waitUntil:'load'})
    await page.evaluate(()=>{try{window.localStorage.clear()}catch{}})
    await page.reload({waitUntil:'load'}); await wait(400)
    await page.keyboard.press('Escape').catch(()=>{})
    await clickText(page, /ENTER THE DIVE/); await wait(300)
    await clickText(page, /REEF/i); await wait(150)
    const dim=14
    const cells = [[4,4],[5,4],[6,4],[7,4],[4,5],[5,5],[6,5],[7,5]]
    if (vpKey==='desktop') await desktopTrace(page, cells, dim)
    else for (const [c,r] of cells) { await mobilePan(page,c,r,dim); await wait(50) }
    await wait(150)
    await clickText(page, /^RUN THE LINE/)
    let won=false
    for (let i=0;i<90 && !won;i++){ await wait(70); const t=await page.evaluate(()=>document.body.innerText); if(/SECURED THE HAUL/.test(t)) won=true; else if (/RUGGED BY THE DEEP/.test(t)) break }
    if (won) {
      await wait(200)
      const board = await boardGeo(page)
      const hero = await heroRect(page)
      console.log(`[${vpKey}] board=${JSON.stringify(board)}`)
      console.log(`[${vpKey}] hero =${JSON.stringify(hero)}`)
      const within = hero.left >= board.left-4 && hero.right <= board.right+4 && hero.top >= board.top-4 && hero.bottom <= board.bottom+40
      console.log(`[${vpKey}] hero within board edges (tol 4px sides, 40px bottom for label overflow): ${within}`)
      found = true
    }
    await page.close()
  }
  if (!found) console.log(`[${vpKey}] FAILED to reach a win in 20 attempts`)
}
await browser.close()
