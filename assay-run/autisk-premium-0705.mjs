import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-autisk-premium-0705'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, txt)
  const el = h.asElement(); if (!el) return false; await el.click(); return true
}
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas'); if (!c) return null
  const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }
})
// pixel + layout census
const census = (page) => page.evaluate(() => {
  const vw = window.innerWidth, vh = window.innerHeight
  const scrollW = document.documentElement.scrollWidth
  const scrollH = document.documentElement.scrollHeight
  const overflowX = scrollW > vw + 1
  // find widest shell/card
  const cards = [...document.querySelectorAll('div')].map(d=>{const r=d.getBoundingClientRect();return {w:r.width,h:r.height,x:r.x}}).filter(o=>o.w>300&&o.w<vw)
  cards.sort((a,b)=>b.w-a.w)
  const shellW = cards.length?Math.round(cards[0].w):null
  const marginPx = shellW? Math.round((vw-shellW)/2):null
  // treasure dressing / sconce / temple presence by testid or class hints
  const html = document.body.innerHTML
  const hints = {
    hasSvgTemple: /ziggurat|temple|skyline/i.test(html) || document.querySelectorAll('svg path').length,
    svgCount: document.querySelectorAll('svg').length,
    imgCount: document.querySelectorAll('img').length,
  }
  // any element wider than viewport (overflow culprit)
  const wide = [...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.right>vw+2||r.left<-2}).slice(0,8).map(e=>({tag:e.tagName,cls:(e.className&&e.className.toString().slice(0,40)),right:Math.round(e.getBoundingClientRect().right),left:Math.round(e.getBoundingClientRect().left)}))
  return {vw,vh,scrollW,scrollH,overflowX,shellW,marginPx,hints,wideCount:wide.length,wide}
})
// sample avg RGB of a rect from a screenshot is easier post-hoc; here sample DOM background via canvas not possible. skip.

async function run(label, width, height, dsf) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null,
    args: ['--autoplay-policy=no-user-gesture-required', `--window-size=${width},${height+120}`] })
  const page = (await browser.pages())[0]
  await page.setViewport({ width, height, deviceScaleFactor: dsf })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(900)
  await page.screenshot({ path: `${OUT}/${label}-1-lobby.png` })
  const cen = await census(page)
  fs.writeFileSync(`${OUT}/${label}-census.json`, JSON.stringify(cen,null,2))
  console.log(label,'census', JSON.stringify(cen))

  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(700)
  const box = await canvasBox(page)
  const tile = box.w / 10
  for (let r = 1; r <= 8; r++) {
    await page.mouse.click(box.x + 4 * tile + tile / 2, box.y + r * tile + tile / 2)
    await wait(70)
  }
  await wait(400)
  await page.screenshot({ path: `${OUT}/${label}-2-planning.png` })
  const cen2 = await census(page)
  console.log(label,'planning census', JSON.stringify({overflowX:cen2.overflowX,marginPx:cen2.marginPx,shellW:cen2.shellW}))

  // win-settle with burst capture
  let won = false
  for (let attempt = 0; attempt < 40 && !won; attempt++) {
    if (attempt > 0) {
      await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
      await wait(500)
      await clickText(page, 'ENTER THE ASSAY LINE')
      await wait(500)
      const b2 = await canvasBox(page)
      const t2 = b2.w / 10
      for (let r = 1; r <= 8; r++) { await page.mouse.click(b2.x + 4 * t2 + t2/2, b2.y + r * t2 + t2/2); await wait(55) }
      await wait(250)
    }
    await clickText(page, 'PACE: DISC-BY-DISC')
    await wait(120)
    await clickText(page, 'RUN THE LINE')
    let state = 'none'
    for (let p = 0; p < 25; p++) {
      await wait(150)
      state = await page.evaluate(() => {
        const t = document.body.innerText
        if (/LINE CLAIMED/.test(t)) return 'won'
        if (/BUSTED/.test(t)) return 'bust'
        return 'none'
      })
      if (state !== 'none') break
    }
    if (state === 'won') {
      // burst 12 frames every ~90ms to catch cartouche shine + board bloom
      for (let f=0; f<12; f++){ await page.screenshot({ path: `${OUT}/${label}-3-win-${String(f).padStart(2,'0')}.png` }); await wait(90) }
      won = true
      console.log(label, 'WON on attempt', attempt)
    } else {
      await clickText(page, 'ASSAY AGAIN'); await wait(150)
    }
  }
  if (!won) console.log(label, 'no win captured')
  await browser.close()
}
await run('d1440', 1440, 900, 1)
await run('m412', 412, 892, 2)
console.log('done')
