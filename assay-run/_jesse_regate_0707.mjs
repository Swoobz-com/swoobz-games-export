import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/jesse-regate'
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

// In-page 8ms sampler: records hero plaque text, live HAUL number, in-flight coin count, per tick.
async function installSampler(page){
  await page.evaluate(() => {
    window.__log = []
    window.__t0 = performance.now()
    const readHero = () => {
      const findExact = (s) => [...document.querySelectorAll('div,span')].find(x => (x.textContent||'').trim() === s)
      const el = findExact('LINE CLAIMED') || findExact('LINE BROKE')
      return el ? (el.textContent||'').trim() : ''
    }
    const readHaul = () => {
      // HAUL rail row: contains HAUL label, short text
      const row = [...document.querySelectorAll('div')].find(x => /(^|\b)HAUL\b/.test((x.textContent||'')) && (x.textContent||'').length < 80)
      const t = row ? (row.innerText||'').replace(/\n+/g,' ') : ''
      // parse a number like 1.14 or 0.00 (ignore the word HAUL)
      const m = t.replace(/HAUL/ig,'').match(/(\d+\.\d+)/)
      return { txt: t.trim(), num: m ? parseFloat(m[1]) : null }
    }
    const coinsLive = () => [...document.querySelectorAll('img')].filter(i => (getComputedStyle(i).animationName||'').includes('assayCoinFly')).length
    window.__coinEver = 0
    const obs = new MutationObserver(muts => {
      for (const m of muts) for (const n of m.addedNodes) {
        const chk = (nd)=>{ if(nd&&nd.tagName==='IMG'&&(getComputedStyle(nd).animationName||'').includes('assayCoinFly')) window.__coinEver++ }
        chk(n); if(n.querySelectorAll) n.querySelectorAll('img').forEach(chk)
      }
    })
    obs.observe(document.body,{childList:true,subtree:true})
    window.__iv = setInterval(() => {
      const h = readHaul()
      window.__log.push({ t: Math.round(performance.now()-window.__t0), hero: readHero(), haul: h.num, haulTxt: h.txt, coins: coinsLive() })
    }, 8)
  })
}
async function stopSampler(page){
  return page.evaluate(() => { clearInterval(window.__iv); return { log: window.__log, coinEver: window.__coinEver } })
}

async function readSettle(page){
  return page.evaluate(() => {
    const txt = document.body.innerText
    const won = /SECURED THE HAUL/i.test(txt)
    const bust = /RUGGED BY THE DEEP/i.test(txt)
    const findExact = (s) => [...document.querySelectorAll('div,span')].find(x => (x.textContent||'').trim() === s)
    const heroEl = findExact('LINE CLAIMED') || findExact('LINE BROKE')
    let heroBlock = ''
    if (heroEl) { let p = heroEl; for(let i=0;i<4 && p;i++) p = p.parentElement; heroBlock = p ? (p.innerText||'').replace(/\n+/g,' | ') : '' }
    const haulRow = [...document.querySelectorAll('div')].find(x => /(^|\b)HAUL\b/.test((x.textContent||'')) && (x.textContent||'').length < 80)
    const haulTxt = haulRow ? (haulRow.innerText||'').replace(/\n+/g,' | ') : ''
    const payLabel = [...document.querySelectorAll('div')].find(x => (x.textContent||'').trim() === 'PAYOUT')
    const payVal = payLabel && payLabel.nextElementSibling ? (payLabel.nextElementSibling.innerText||'').trim() : ''
    return { won, bust, heroPlaqueText: heroEl?(heroEl.textContent||'').trim():'(none)', heroBlock, haulTxt, payVal }
  })
}

async function ensurePace(page, wantInstant){
  for(let i=0;i<3;i++){
    const cur = await page.evaluate(() => { const el=[...document.querySelectorAll('button,div,span')].find(x=>/PACE:\s*(INSTANT|DUCAT)/i.test((x.textContent||''))); return el?(el.textContent||'').trim():null })
    if(!cur) return 'no-pace-control'
    const isInstant = /INSTANT/i.test(cur)
    if(isInstant===wantInstant) return cur
    await clickText(page, /PACE:/); await wait(200)
  }
  return 'gave-up'
}

async function scenario(browser, { name, depth, wantInstant, expectWon }){
  for(let a=0;a<24;a++){
    const page = await browser.newPage()
    await page.setViewport({ width:1440, height:900, deviceScaleFactor:1 })
    await page.goto(URL,{waitUntil:'load'}); await wait(500)
    await page.evaluate(()=>{try{localStorage.clear()}catch{}})
    await page.reload({waitUntil:'load'}); await wait(500)
    await clickText(page, /ENTER THE DIVE/); await wait(300)
    await clickText(page, new RegExp(depth,'i')); await wait(200)
    const paceState = await ensurePace(page, wantInstant)
    await trace(page, line8); await wait(200)
    await installSampler(page)
    await clickText(page, /^RUN THE LINE/); await wait(50)
    // dense screenshots to eyeball, tighter for staggered to catch the transition
    const nFrames = wantInstant ? 14 : 30
    const gap = wantInstant ? 90 : 70
    for(let i=0;i<nFrames;i++){ await page.screenshot({ path:`${OUT}/${name}-f${String(i).padStart(2,'0')}.png` }); await wait(gap) }
    await wait(400)
    const samp = await stopSampler(page)
    const s = await readSettle(page)
    const got = s.won?'WON':s.bust?'BUST':'?'
    console.log(`\n[${name}] pace=${paceState} depth=${depth} -> ${got}`)
    if((expectWon&&s.won)||(!expectWon&&s.bust)){
      // analyse sampler: transition = first tick hero==LINE BROKE; contradictions after that
      const log = samp.log
      const firstBroke = log.findIndex(r=>r.hero==='LINE BROKE')
      const firstClaimed = log.findIndex(r=>r.hero==='LINE CLAIMED')
      let contradictions=[], coinsAfterBrokeMax=0
      if(firstBroke>=0){
        for(let i=firstBroke;i<log.length;i++){
          const r=log[i]
          if(r.haul && r.haul>0.001) contradictions.push({t:r.t, haul:r.haul, coins:r.coins})
          if(r.coins>coinsAfterBrokeMax) coinsAfterBrokeMax=r.coins
        }
      }
      const analysis = {
        outcome: got, paceState,
        firstBrokeT: firstBroke>=0?log[firstBroke].t:null,
        firstClaimedT: firstClaimed>=0?log[firstClaimed].t:null,
        haulAtBroke: firstBroke>=0?log[firstBroke].haul:null,
        coinsAtBroke: firstBroke>=0?log[firstBroke].coins:null,
        contradictionCount: contradictions.length,
        contradictionsSample: contradictions.slice(0,8),
        coinsAfterBrokeMax,
        coinEver: samp.coinEver,
        // window around transition for eyeball correlation
        windowAroundBroke: firstBroke>=0? log.slice(Math.max(0,firstBroke-4), firstBroke+12) : [],
        settle: s
      }
      console.log(JSON.stringify(analysis,null,2))
      await page.screenshot({ path:`${OUT}/${name}-SETTLED.png` })
      fs.writeFileSync(`${OUT}/${name}-log.json`, JSON.stringify(samp.log))
      fs.writeFileSync(`${OUT}/${name}-analysis.json`, JSON.stringify(analysis,null,2))
      await page.close()
      return analysis
    }
    for(let i=0;i<nFrames;i++){ try{fs.unlinkSync(`${OUT}/${name}-f${String(i).padStart(2,'0')}.png`)}catch(e){} }
    await page.close()
  }
  console.log(`[${name}] FAILED to reach ${expectWon?'WIN':'BUST'} in 24 tries`); return null
}

const browser = await puppeteer.launch({ executablePath:EXE, headless:false, defaultViewport:null, args:['--window-size=1500,1000'] })
{
  const page = await browser.newPage()
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
  await page.goto(URL,{waitUntil:'load'}); await wait(700)
  await page.evaluate(()=>{try{localStorage.clear()}catch{}})
  await page.reload({waitUntil:'load'}); await wait(700)
  await page.screenshot({ path:`${OUT}/00-cold-open.png` })
  await page.close()
}
const bustStag = await scenario(browser,{name:'BUST-stag',depth:'HADAL',wantInstant:false,expectWon:false})
const bustInst = await scenario(browser,{name:'BUST-inst',depth:'HADAL',wantInstant:true,expectWon:false})
const winStag  = await scenario(browser,{name:'WIN-stag', depth:'REEF', wantInstant:false,expectWon:true})
const winInst  = await scenario(browser,{name:'WIN-inst', depth:'REEF', wantInstant:true, expectWon:true})
console.log('\n\n===== SUMMARY =====')
const row=(n,a)=>console.log(n, a?JSON.stringify({out:a.outcome,hero:a.settle.heroPlaqueText,pay:a.settle.payVal,haul:a.settle.haulTxt,contradictions:a.contradictionCount,coinsAfterBroke:a.coinsAfterBrokeMax,haulAtBroke:a.haulAtBroke,coinsAtBroke:a.coinsAtBroke}):'NULL')
row('BUST-stag',bustStag); row('BUST-inst',bustInst); row('WIN-stag ',winStag); row('WIN-inst ',winInst)
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({bustStag,bustInst,winStag,winInst},null,2))
await browser.close()
