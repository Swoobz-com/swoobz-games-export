import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = './shots-abyss-reverify-0706'
fs.mkdirSync(OUT, { recursive: true })

function luminance(r,g,b){
  const lin = c => { c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4) }
  return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
}

async function sampleRect(page, x, y, w, h) {
  const buf = await page.screenshot({ type: 'png', clip: { x, y, width: w, height: h } })
  const png = PNG.sync.read(Buffer.from(buf))
  let rs=0,gs=0,bs=0,n=0
  for (let yy=0; yy<png.height; yy++){
    for (let xx=0; xx<png.width; xx++){
      const idx=(png.width*yy+xx)<<2
      rs+=png.data[idx]; gs+=png.data[idx+1]; bs+=png.data[idx+2]; n++
    }
  }
  return { r: rs/n, g: gs/n, b: bs/n, n }
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1440,900'] })
const results = { desktop: {}, mobile: {} }

// ---- DESKTOP ----
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
  await new Promise(r => setTimeout(r, 800))

  // click through to a phase that shows the control column (planning/betting).
  // try a generic "start"/"dive"/"play" button if lobby shown
  const bodyText = await page.evaluate(() => document.body.innerText)
  results.desktop.initialBodyTextSnippet = bodyText.slice(0, 300)

  // attempt to find and click a start-ish button
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const target = btns.find(b => /DIVE|START|PLAY|BEGIN|ENTER/i.test(b.textContent||''))
    if (target) { target.click(); return target.textContent }
    return null
  })
  results.desktop.clickedStart = clicked
  await new Promise(r => setTimeout(r, 600))

  await page.screenshot({ path: `${OUT}/desktop-full.png`, fullPage: false })

  // find the control column bezel-ring / RailShell region via BRASS_MID border color match, or just grab rightmost panel
  const rect = await page.evaluate(() => {
    // heuristic: element with border-color close to rgb(44,67,86) or background rgba(16,26,36,...)
    const all = Array.from(document.querySelectorAll('div'))
    let best = null
    for (const el of all) {
      const cs = getComputedStyle(el)
      const bg = cs.backgroundColor
      if (bg && bg.includes('16, 26, 36')) {
        const r = el.getBoundingClientRect()
        if (r.width > 150 && r.height > 150) { best = r; break }
      }
    }
    return best ? { x: best.x, y: best.y, width: best.width, height: best.height } : null
  })
  results.desktop.controlColumnRect = rect

  if (rect) {
    const sampleX = Math.min(rect.x + rect.width * 0.5, 1439)
    const sampleY = Math.min(rect.y + rect.height * 0.3, 899)
    const s = await sampleRect(page, Math.max(0,sampleX-20), Math.max(0,sampleY-20), 40, 40)
    results.desktop.controlColumnSample = s
    results.desktop.controlColumnLuminance = luminance(s.r, s.g, s.b)
  } else {
    // fallback: sample the right ~300px column generally
    const s = await sampleRect(page, 1100, 300, 300, 300)
    results.desktop.controlColumnSampleFallback = s
  }

  // computed style probe: CalibKnob / CalibToggle buttons (small buttons, look for text CLEAR/PACE/SAME LINE or +/-)
  const fontProbe = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const results = []
    for (const b of btns) {
      const txt = (b.textContent||'').trim()
      if (/^CLEAR$|^SAME LINE$|PACE/i.test(txt) || /^[+\-]$/.test(txt)) {
        const cs = getComputedStyle(b)
        results.push({ text: txt, fontFamily: cs.fontFamily })
      }
    }
    return results
  })
  results.desktop.fontProbe = fontProbe

  // BreakerLever pilot light color
  const pilotProbe = await page.evaluate(() => {
    const runBtn = Array.from(document.querySelectorAll('button')).find(b => /RUN THE LINE/i.test(b.textContent||''))
    if (!runBtn) return null
    // pilot light is the small circular span inside, right:4,bottom:4
    const spans = Array.from(runBtn.querySelectorAll('span[aria-hidden]'))
    const pilot = spans.find(s => {
      const cs = getComputedStyle(s)
      return cs.borderRadius === '50%' && parseFloat(cs.width) < 10
    })
    return pilot ? { backgroundColor: getComputedStyle(pilot).backgroundColor } : { note: 'runBtn found but pilot span not matched', spanCount: spans.length }
  })
  results.desktop.pilotProbe = pilotProbe

  // check webfont actually loaded
  const fontsLoaded = await page.evaluate(async () => {
    await document.fonts.ready
    const names = Array.from(document.fonts).map(f => f.family)
    return { uniqueFamilies: [...new Set(names)], geistMonoLoaded: [...document.fonts].some(f => /Geist Mono/i.test(f.family) && f.status === 'loaded') }
  })
  results.desktop.fontsLoaded = fontsLoaded

  await page.close()
}

// ---- MOBILE ----
{
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, isMobile: true })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
  await new Promise(r => setTimeout(r, 800))

  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const target = btns.find(b => /DIVE|START|PLAY|BEGIN|ENTER/i.test(b.textContent||''))
    if (target) { target.click(); return target.textContent }
    return null
  })
  results.mobile.clickedStart = clicked
  await new Promise(r => setTimeout(r, 600))

  await page.screenshot({ path: `${OUT}/mobile-full.png`, fullPage: false })

  // bottom dock region: bottom ~200px of viewport
  const s = await sampleRect(page, 20, 700, 350, 100)
  results.mobile.bottomDockSample = s
  results.mobile.bottomDockLuminance = luminance(s.r, s.g, s.b)

  // PLAY SAFE pill
  const playSafeRect = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e => (e.textContent||'').trim() === 'PLAY SAFE' && e.children.length === 0)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el.parentElement || el)
    return { rect: { x: r.x, y: r.y, width: r.width, height: r.height }, parentBg: cs.backgroundColor }
  })
  results.mobile.playSafeRect = playSafeRect
  if (playSafeRect && playSafeRect.rect) {
    const pr = playSafeRect.rect
    const s2 = await sampleRect(page, Math.max(0,pr.x-5), Math.max(0,pr.y-5), Math.min(pr.width+10, 390-pr.x+5), Math.min(pr.height+10, 30))
    results.mobile.playSafeSample = s2
    results.mobile.playSafeLuminance = luminance(s2.r, s2.g, s2.b)
  }

  await page.close()
}

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
await browser.close()
