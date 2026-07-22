import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/jesse-winbust'
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))

const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return (b.textContent || '').trim() } return null
}, re.source)

async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } }) }
async function trace(page, cells){
  const geo = await boardGeo(page); const TILE = geo.w/14
  for(const [col,row] of cells){ await page.mouse.click(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(30) }
}
const line8 = [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]

// inject a coin-fly counter (MutationObserver on added <img> with assayCoinFly animation)
async function installCoinCounter(page){
  await page.evaluate(() => {
    window.__coinFlies = 0
    window.__coinFlyMax = 0
    const check = (node) => {
      if (node && node.tagName === 'IMG') {
        const an = getComputedStyle(node).animationName || ''
        if (an.includes('assayCoinFly')) window.__coinFlies++
      }
    }
    const obs = new MutationObserver(muts => {
      for (const m of muts) { for (const n of m.addedNodes) { check(n); if (n.querySelectorAll) n.querySelectorAll('img').forEach(check) } }
      // also snapshot how many are on-screen at once
      const live = [...document.querySelectorAll('img')].filter(i => (getComputedStyle(i).animationName||'').includes('assayCoinFly')).length
      if (live > window.__coinFlyMax) window.__coinFlyMax = live
    })
    obs.observe(document.body, { childList: true, subtree: true })
  })
}

async function readSettle(page){
  return page.evaluate(() => {
    const txt = document.body.innerText
    const won = /SECURED THE HAUL/i.test(txt)
    const bust = /RUGGED BY THE DEEP/i.test(txt)
    // hero plaque text (LINE CLAIMED / LINE BROKE) + its sub-line
    const findExact = (s) => [...document.querySelectorAll('div,span')].find(x => (x.textContent||'').trim() === s)
    const heroEl = findExact('LINE CLAIMED') || findExact('LINE BROKE')
    let heroBlock = ''
    if (heroEl) { let p = heroEl; for(let i=0;i<4 && p;i++) p = p.parentElement; heroBlock = p ? (p.innerText||'').replace(/\n+/g,' | ') : '' }
    // HAUL rail: find the row containing HAUL label
    const haulRow = [...document.querySelectorAll('div')].find(x => /(^|\b)HAUL\b/.test((x.textContent||'')) && (x.textContent||'').length < 60)
    const haulTxt = haulRow ? (haulRow.innerText||'').replace(/\n+/g,' | ') : ''
    // PAYOUT value: the div labeled PAYOUT then its sibling value
    const payLabel = [...document.querySelectorAll('div')].find(x => (x.textContent||'').trim() === 'PAYOUT')
    const payVal = payLabel && payLabel.nextElementSibling ? (payLabel.nextElementSibling.innerText||'').trim() : ''
    return {
      won, bust,
      heroPlaqueText: heroEl ? (heroEl.textContent||'').trim() : '(none)',
      heroBlock,
      haulTxt,
      payVal,
      coinFlies: window.__coinFlies,
      coinFlyMax: window.__coinFlyMax,
      // grab any settle-panel sub line
      settleSub: (txt.match(/(SECURED THE HAUL|RUGGED BY THE DEEP)[\s\S]{0,120}/i)||[''])[0].replace(/\n+/g,' | ')
    }
  })
}

async function ensurePace(page, wantInstant){
  // read current PACE toggle, click if needed
  for(let i=0;i<3;i++){
    const cur = await page.evaluate(() => {
      const el = [...document.querySelectorAll('button,div,span')].find(x => /PACE:\s*(INSTANT|DUCAT)/i.test((x.textContent||'')))
      return el ? (el.textContent||'').trim() : null
    })
    if(!cur) return `no-pace-control`
    const isInstant = /INSTANT/i.test(cur)
    if(isInstant === wantInstant) return cur
    await clickText(page, /PACE:/)
    await wait(200)
  }
  return 'gave-up'
}

async function scenario(browser, { name, depth, wantInstant, expectWon }){
  for(let a=0; a<20; a++){
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    await page.goto(URL, { waitUntil: 'load' }); await wait(500)
    await page.evaluate(() => { try{ localStorage.clear() }catch{} })
    await page.reload({ waitUntil: 'load' }); await wait(500)
    await clickText(page, /ENTER THE DIVE/); await wait(300)
    await clickText(page, new RegExp(depth,'i')); await wait(200)
    const paceState = await ensurePace(page, wantInstant)
    await trace(page, line8); await wait(200)
    await installCoinCounter(page)
    await clickText(page, /^RUN THE LINE/); await wait(60)
    // dense capture reveal + settle
    const nFrames = wantInstant ? 16 : 34
    const gap = wantInstant ? 90 : 110
    for(let i=0;i<nFrames;i++){ await page.screenshot({ path: `${OUT}/${name}-f${String(i).padStart(2,'0')}.png` }); await wait(gap) }
    await wait(300)
    const s = await readSettle(page)
    const got = s.won ? 'WON' : s.bust ? 'BUST' : '?'
    console.log(`\n[${name}] pace=${paceState} depth=${depth} -> ${got}`)
    if((expectWon && s.won) || (!expectWon && s.bust)){
      console.log(JSON.stringify(s, null, 2))
      await page.screenshot({ path: `${OUT}/${name}-SETTLED.png` })
      await page.close()
      return s
    }
    // wrong outcome, clean frames & retry
    for(let i=0;i<nFrames;i++){ try{ fs.unlinkSync(`${OUT}/${name}-f${String(i).padStart(2,'0')}.png`) }catch(e){} }
    await page.close()
  }
  console.log(`[${name}] FAILED to reach ${expectWon?'WIN':'BUST'} in 20 tries`)
  return null
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null, args:['--window-size=1500,1000'] })

// cold open
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'load' }); await wait(700)
  await page.evaluate(() => { try{ localStorage.clear() }catch{} })
  await page.reload({ waitUntil: 'load' }); await wait(700)
  await page.screenshot({ path: `${OUT}/00-cold-open.png` })
  await page.close()
}

const winStag = await scenario(browser, { name:'WIN-stag', depth:'REEF', wantInstant:false, expectWon:true })
const winInst = await scenario(browser, { name:'WIN-inst', depth:'REEF', wantInstant:true, expectWon:true })
const bustStag = await scenario(browser, { name:'BUST-stag', depth:'HADAL', wantInstant:false, expectWon:false })
const bustInst = await scenario(browser, { name:'BUST-inst', depth:'HADAL', wantInstant:true, expectWon:false })

console.log('\n\n===== SUMMARY =====')
const row = (n,s)=> console.log(n, s? JSON.stringify({won:s.won,bust:s.bust,hero:s.heroPlaqueText,pay:s.payVal,haul:s.haulTxt,coins:s.coinFlies,coinMax:s.coinFlyMax}) : 'NULL')
row('WIN-stag ', winStag)
row('WIN-inst ', winInst)
row('BUST-stag', bustStag)
row('BUST-inst', bustInst)
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({winStag,winInst,bustStag,bustInst}, (k,v)=> typeof v==='bigint'?v.toString():v, 2))
await browser.close()
