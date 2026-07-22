import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r=>setTimeout(r,ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button')].find(x => r.test((x.textContent || '').trim()))
  if (b) { b.click(); return true } return false
}, re.source)
async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } }) }
async function trace(page, cells){ const geo = await boardGeo(page); const TILE = geo.w/14; for(const [col,row] of cells){ await page.mouse.click(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(30) } }
function rectOf(r){ return r ? {left:+r.left.toFixed(1),top:+r.top.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1)} : null }
function overlap(a,b){ if(!a||!b) return null; const ox=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left)); const oy=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)); return {ox:+ox.toFixed(1),oy:+oy.toFixed(1),area:+(ox*oy).toFixed(1)} }

const VIEWPORTS = [ {name:'pixel412', w:412, h:915}, {name:'iphone14pro', w:393, h:852} ]
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
for (const vp of VIEWPORTS) {
  const page = await browser.newPage()
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(()=>{try{window.localStorage.clear()}catch{}})
  await page.reload({waitUntil:'load'})
  await wait(500)
  await clickText(page, /ENTER THE DIVE/); await wait(300)
  await trace(page, [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]); await wait(250)
  const info = await page.evaluate(() => {
    function rectOf(r){ return r ? {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height} : null }
    const note = document.querySelector('[role="note"][aria-label="How to play"]')
    const noteRect = rectOf(note ? note.getBoundingClientRect() : null)
    const labels = [...document.querySelectorAll('div,span')].filter(x => (x.textContent||'').trim() === 'TO WIN')
    const heroParent = labels.length ? rectOf(labels[0].parentElement.getBoundingClientRect()) : null
    // RUN THE LINE button bottom vs fold
    const runBtn = [...document.querySelectorAll('button')].find(b => /RUN THE LINE/i.test((b.textContent||'').trim()))
    const runRect = rectOf(runBtn ? runBtn.getBoundingClientRect() : null)
    return { noteRect, heroParent, runRect }
  })
  console.log(`\n=== ${vp.name} (${vp.w}x${vp.h}) ===`)
  console.log('coachmark:', JSON.stringify(rectOf(info.noteRect)))
  console.log('hero:     ', JSON.stringify(rectOf(info.heroParent)))
  console.log('overlap:  ', JSON.stringify(overlap(info.noteRect, info.heroParent)))
  console.log('RUN THE LINE:', JSON.stringify(rectOf(info.runRect)), '| fold', vp.h, '| clears:', info.runRect ? (info.runRect.bottom <= vp.h) : 'n/a')
  await page.close()
}
await browser.close()
