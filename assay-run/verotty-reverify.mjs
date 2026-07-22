import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5203/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]

const clickText = async (txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, txt)
  const el = h.asElement(); if (!el) return false; await el.click(); return true
}
const canvasBox = () => page.evaluate(() => {
  const c = document.querySelector('canvas'); const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
async function paint(n, box) {
  const tile = box.w / 32; let count = 0
  for (let row = 3; row < 30 && count < n; row += 2) {
    for (let col = 2; col < 30 && count < n; col += 3) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++; await wait(8)
    }
  }
}
// font helpers — find element by predicate on textContent, return computed font + text
const fontOf = (needle, exact=false) => page.evaluate(({needle,exact}) => {
  const els = [...document.querySelectorAll('*')]
  // pick the DEEPEST element whose direct text matches (smallest subtree)
  let match = null
  for (const e of els) {
    const t = (e.textContent||'').trim()
    const ok = exact ? t === needle : t.includes(needle)
    if (!ok) continue
    // prefer leaf-ish: no child element also matching
    const childMatch = [...e.children].some(c => {
      const ct=(c.textContent||'').trim(); return exact? ct===needle : ct.includes(needle)
    })
    if (!childMatch) { match = e; break }
  }
  if (!match) return { found:false, needle }
  const cs = getComputedStyle(match)
  return { found:true, needle, text: match.textContent.trim().slice(0,60), fontFamily: cs.fontFamily }
}, {needle,exact})

const report = { desktop:{}, mobile:{}, fonts:{} }

// ---------- DESKTOP: board px + CTA + overflow ----------
for (const vp of [{n:'1440x900',w:1440,h:900},{n:'1920x1080',w:1920,h:1080},{n:'2560x1440',w:2560,h:1440}]) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  const lobbyOv = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight, sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
  await clickText('ENTER THE ASSAY LINE'); await wait(250)
  const planOv = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight }))
  let box = await canvasBox()
  const boardPx = Math.round(box.w)
  // switch to INSTANT pace for fast deterministic settle, retry until WIN
  await clickText('PACE'); await wait(80)
  let won=false, settled=null, tries=0
  while (!won && tries < 12) {
    tries++
    box = await canvasBox()
    await paint(8, box); await wait(150)
    await clickText('PLUNGE'); await wait(900)
    const st = await page.evaluate(() => {
      const txt = document.body.innerText
      const btns=[...document.querySelectorAll('button')]
      const cta = btns.find(b=>b.textContent && b.textContent.includes('ASSAY AGAIN'))
      const won = txt.includes('CLAIM PROVEN')
      if(!cta) return {settled:false, won}
      const r=cta.getBoundingClientRect()
      return { settled:true, won, ctaBottom:r.bottom, ctaTop:r.top, ctaW:r.width, ctaH:r.height,
        sh: document.documentElement.scrollHeight, ih: window.innerHeight }
    })
    if (st.settled && st.won) { won=true; settled=st; break }
    // busted or not settled -> assay again and retry
    if (st.settled) { await clickText('ASSAY AGAIN'); await wait(200) }
    else { await wait(600) }
  }
  report.desktop[vp.n] = { boardPx, lobbyOv, planOv, tries, won,
    ctaBottom: settled?Math.round(settled.ctaBottom):null, ctaH: settled?Math.round(settled.ctaH):null,
    ctaBelowFold: settled?Math.round(settled.ctaBottom - vp.h):null,
    settledSh: settled?settled.sh:null, settledIh: settled?settled.ih:null }
}

// ---------- FONTS at 1440 (wide): a,b,c during planning; d at settled; e in panel ----------
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 }); await wait(400)
await clickText('ENTER THE ASSAY LINE'); await wait(300)
report.fonts.a_RTP = await fontOf('96.50%', true)
report.fonts.b_atGO = await fontOf('at GO', false)
report.fonts.c_odometer = await fontOf('/ 8 min', true)
// settle to a win to reach summary
await clickText('PACE'); await wait(80)
let dgot=false, t2=0
while(!dgot && t2<12){ t2++
  let box=await canvasBox(); await paint(8,box); await wait(150)
  await clickText('PLUNGE'); await wait(900)
  const won = await page.evaluate(()=>document.body.innerText.includes('CLAIM PROVEN'))
  if(won){ dgot=true; break }
  const settled = await page.evaluate(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('ASSAY AGAIN')))
  if(settled){ await clickText('ASSAY AGAIN'); await wait(200) } else await wait(600)
}
report.fonts.d_summary = await fontOf('nubs ·', false)
// open PLAY SAFE -> panel
await clickText('PLAY SAFE'); await wait(300)
report.fonts.e_safety = await fontOf('net.', false)
const panelOpen = await page.evaluate(()=>!!document.querySelector('[role="dialog"]'))
report.fonts.panelOpenedFromDesktop = panelOpen
// document.fonts diagnostic
report.fonts.geistMonoLoaded = await page.evaluate(()=>{ try{return document.fonts.check('12px "Geist Mono"')}catch(e){return 'err:'+e.message} })

// ---------- MOBILE: PLAY SAFE tap target + opens dialog ----------
for (const vp of [{n:'390x844',w:390,h:844},{n:'412x915',w:412,h:915}]) {
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 2, isMobile:true, hasTouch:true })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 }); await wait(400)
  await clickText('ENTER THE ASSAY LINE'); await wait(250)
  const ps = await page.evaluate(() => {
    const b=[...document.querySelectorAll('button')].find(x=>x.textContent && x.textContent.trim()==='PLAY SAFE')
    if(!b) return {found:false}
    const r=b.getBoundingClientRect()
    return { found:true, w:r.width, h:r.height }
  })
  // tap it
  let opened=false
  if(ps.found){
    await clickText('PLAY SAFE'); await wait(300)
    opened = await page.evaluate(()=>!!document.querySelector('[role="dialog"]'))
    // close
    await page.evaluate(()=>{ const d=document.querySelector('[role="dialog"]'); if(d) d.click() })
    await wait(150)
  }
  report.mobile[vp.n] = { psFound:ps.found, psW: ps.found?+ps.w.toFixed(2):null, psH: ps.found?+ps.h.toFixed(2):null, opensDialog:opened }
}

console.log(JSON.stringify(report,null,2))
await browser.close()
