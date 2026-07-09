import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5197/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const VPS = [
  { name: 'pixel7', width: 412, height: 915, dsf: 2.625, ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile' },
  { name: 'iphone14pro', width: 390, height: 844, dsf: 3, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile' },
]
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const click = async (p, t) => p.evaluate((tx) => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes(tx)); if(b)b.click() }, t)
const errs = []
for (const vp of VPS) {
  const page = await browser.newPage()
  page.on('console', m => { if (m.type()==='error') errs.push(`[${vp.name}] ${m.text()}`) })
  page.on('pageerror', e => errs.push(`[${vp.name}] pageerror: ${e.message}`))
  await page.emulate({ viewport:{width:vp.width,height:vp.height,deviceScaleFactor:vp.dsf,isMobile:true,hasTouch:true,isLandscape:false}, userAgent:vp.ua })
  await page.goto(URL, { waitUntil:'networkidle2', timeout:60000 })
  await wait(500)
  console.log(`\n===== ${vp.name} (${vp.width}x${vp.height}) =====`)

  // DOM em-dash scan (rendered, user-facing text only)
  const emDash = await page.evaluate(() => {
    const hits = []
    const walk = document.createTextNodes = null
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let n
    while ((n = tw.nextNode())) { if (n.nodeValue.includes('—')) hits.push(n.nodeValue.trim().slice(0,60)) }
    return hits
  })
  console.log('LOBBY rendered em-dash(\u2014) text nodes:', JSON.stringify(emDash))

  await click(page, 'ENTER THE ASSAY LINE'); await wait(400)

  // play round1
  const box = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width} })
  const tile = box.w/32
  for (let i=0;i<8;i++){ await page.touchscreen.tap(box.x+(5+i*3)*tile+tile/2, box.y+(6+(i%4)*3)*tile+tile/2); await wait(60) }
  await click(page, 'PLUNGE'); await wait(3200)

  // exact hex length from the actual spans
  const hex = await page.evaluate(() => {
    const spans=[...document.querySelectorAll('span')]
    const seedSpan=spans.find(s=>s.textContent.trim().startsWith('seed'))
    const hashSpan=spans.find(s=>s.textContent.trim().startsWith('hash'))
    const strip=(t)=>t.replace(/^(seed|hash)/,'').replace(/[\s ]/g,'')
    return {
      seedRaw: seedSpan?seedSpan.textContent:null,
      hashRaw: hashSpan?hashSpan.textContent:null,
      seedLen: seedSpan?strip(seedSpan.textContent).length:0,
      hashLen: hashSpan?strip(hashSpan.textContent).length:0,
      seedHexOnly: seedSpan?/^[0-9a-f]+$/.test(strip(seedSpan.textContent)):false,
      hashHexOnly: hashSpan?/^[0-9a-f]+$/.test(strip(hashSpan.textContent)):false,
    }
  })
  console.log('SEED span len:', hex.seedLen, 'hexOnly:', hex.seedHexOnly, '->', hex.seedRaw)
  console.log('HASH span len:', hex.hashLen, 'hexOnly:', hex.hashHexOnly, '->', hex.hashRaw)

  // settled-screen em-dash scan
  const emDash2 = await page.evaluate(() => {
    const hits=[]; const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); let n
    while((n=tw.nextNode())){ if(n.nodeValue.includes('—')) hits.push(n.nodeValue.trim().slice(0,60)) }
    return hits
  })
  console.log('SETTLED rendered em-dash text nodes:', JSON.stringify(emDash2))

  // session chip
  const chip = await page.evaluate(() => { const s=[...document.querySelectorAll('span')].find(x=>x.textContent.includes('SESSION ·')); return s?s.textContent.trim():null })
  console.log('SESSION chip:', chip)

  // ASSAY AGAIN -> round2 controls
  await click(page,'ASSAY AGAIN'); await wait(500)
  const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b=>['CLEAR','PACE','SAME LINE','PLUNGE'].some(t=>b.textContent.includes(t))).map(b=>{const r=b.getBoundingClientRect();return{text:b.textContent.trim(),w:+r.width.toFixed(1),h:+r.height.toFixed(1),top:+r.top.toFixed(1)}}))
  console.log('ROUND-2 controls:', JSON.stringify(btns))
  console.log('all>=40:', btns.every(b=>b.w>=40&&b.h>=40), '| PLUNGE single-line(h<60):', btns.find(b=>b.text.includes('PLUNGE'))?.h < 60)
  await page.screenshot({ path: `../../scratchpad-${vp.name}-r2.png` }).catch(()=>{})

  // open safety panel + verify reachable + content + no celebration words
  await click(page,'PLAY SAFE'); await wait(400)
  const panel = await page.evaluate(() => {
    const d=document.querySelector('[role="dialog"]')
    if(!d) return {open:false}
    return { open:true, text:d.textContent.trim().slice(0,300), hasSelfExcl:/self-exclusion/i.test(d.textContent), hasLimits:/limit/i.test(d.textContent) }
  })
  console.log('SAFETY panel:', JSON.stringify(panel))
  await page.close()
}
console.log('\n=== CONSOLE ERRORS ===', errs.length?errs.join('\n'):'(none)')
await browser.close()
