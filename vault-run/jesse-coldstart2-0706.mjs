import puppeteer from 'puppeteer-core'
import fs from 'fs'
import { PNG } from 'pngjs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5216'
const OUT = 'shots-jesse-coldstart2-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })

// ---- WCAG helpers ----
const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const lum = ([r, g, bl]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(bl)
const ratio = (a, bg) => { const l1 = lum(a), l2 = lum(bg); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05) }
const over = (fg, a, bg) => fg.map((f, i) => Math.round(f * a + bg[i] * (1 - a))) // src-over composite

// parse rgb/rgba string -> [r,g,b,a]
function parseColor(s) {
  const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null
  const parts = m[1].split(',').map((x) => parseFloat(x.trim()))
  return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1]
}

// find element whose direct-or-descendant text contains phrase; return the SMALLEST such (deepest)
async function findEl(page, phrase) {
  return page.evaluate((phrase) => {
    const lc = phrase.toLowerCase()
    const all = [...document.querySelectorAll('*')]
    const hits = all.filter((el) => (el.textContent || '').replace(/\s+/g, ' ').toLowerCase().includes(lc))
    hits.sort((a, b) => (a.getBoundingClientRect().width * a.getBoundingClientRect().height) - (b.getBoundingClientRect().width * b.getBoundingClientRect().height))
    const el = hits[0]; if (!el) return { found: false }
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
    // walk up ancestors collecting bgColor to composite a DOM-only bg
    let node = el; const bgStack = []
    while (node && node !== document.documentElement) {
      const c = getComputedStyle(node); bgStack.push({ bg: c.backgroundColor, bgImg: c.backgroundImage, op: c.opacity })
      node = node.parentElement
    }
    return {
      found: true, txt: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140),
      fs: parseFloat(cs.fontSize), weight: cs.fontWeight, color: cs.color, opacity: cs.opacity,
      x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right,
      inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
      belowFold: r.top >= window.innerHeight, clippedTop: r.top < 0,
      bgStack, vh: window.innerHeight, vw: window.innerWidth,
    }
  }, phrase)
}

// sample a pixel (device px) from a decoded PNG
function px(png, x, y) {
  x = Math.max(0, Math.min(png.width - 1, Math.round(x)))
  y = Math.max(0, Math.min(png.height - 1, Math.round(y)))
  const i = (png.width * y + x) << 2
  return [png.data[i], png.data[i + 1], png.data[i + 2]]
}

// Pixel-sample the BACKGROUND the text sits on: take a strip just BELOW the text (same card bg, below glyph descenders)
// and just ABOVE it; return the modal/median bg color. Also find the glyph-core color (extreme toward text) in the text band.
function samplePixels(png, el, dpr) {
  // el rect in CSS px; screenshot is device px (dpr)
  const x0 = el.left * dpr, x1 = el.right * dpr
  const yTop = el.top * dpr, yBot = el.bottom * dpr, hh = el.h * dpr
  // background band: a few device-px BELOW the text bottom (still inside card gradient), and ABOVE the top
  const bgYs = [yBot + Math.max(3, hh * 0.35), yTop - Math.max(3, hh * 0.35)]
  const bgSamples = []
  for (const by of bgYs) for (let xx = x0 + 4; xx < x1 - 4; xx += 3) bgSamples.push(px(png, xx, by))
  // median bg
  const med = (arr, ch) => { const s = arr.map((p) => p[ch]).sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
  const bg = bgSamples.length ? [med(bgSamples, 0), med(bgSamples, 1), med(bgSamples, 2)] : null
  // glyph band: sample the middle 60% of the text height across width, keep the pixels FURTHEST from bg (=glyph stroke cores)
  const yMid0 = yTop + hh * 0.2, yMid1 = yBot - hh * 0.2
  const glyphCand = []
  for (let yy = yMid0; yy < yMid1; yy += 1) for (let xx = x0; xx < x1; xx += 1) {
    const p = px(png, xx, yy)
    if (!bg) { glyphCand.push(p); continue }
    const d = Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2])
    glyphCand.push({ p, d })
  }
  glyphCand.sort((a, b) => b.d - a.d)
  const topGlyph = glyphCand.slice(0, Math.max(20, Math.floor(glyphCand.length * 0.03))) // brightest 3% strokes
  const gAvg = [0, 1, 2].map((ch) => Math.round(topGlyph.reduce((s, o) => s + o.p[ch], 0) / topGlyph.length))
  return { bg, glyphCore: gAvg, nBg: bgSamples.length, nGlyph: glyphCand.length }
}

async function measureHint(page, dpr, label, shotPath) {
  const el = await findEl(page, 'crack compartments to pump')
  if (!el.found) { console.log(`[${label}] HINT NOT FOUND`); return null }
  // decode screenshot
  const png = PNG.sync.read(fs.readFileSync(shotPath))
  const sp = samplePixels(png, el, dpr)
  // DOM composited contrast: text rgba composited over pixel-sampled bg
  const tc = parseColor(el.color) // [r,g,b,a]
  const compFg = sp.bg ? over([tc[0], tc[1], tc[2]], tc[3], sp.bg) : [tc[0], tc[1], tc[2]]
  const domContrast = sp.bg ? ratio(compFg, sp.bg) : null
  // Pixel-only contrast: measured glyph-core vs measured bg
  const pxContrast = (sp.bg && sp.glyphCore) ? ratio(sp.glyphCore, sp.bg) : null
  console.log(`\n[${label}] ===== MOBILE HINT MEASUREMENT (dpr ${dpr}) =====`)
  console.log(`  text: "${el.txt}"`)
  console.log(`  fontSize: ${el.fs}px  weight:${el.weight}  DOMcolor:${el.color}  opacity:${el.opacity}`)
  console.log(`  geometry @(${Math.round(el.x)},${Math.round(el.y)}) ${Math.round(el.w)}x${Math.round(el.h)} inVP=${el.inViewport} belowFold=${el.belowFold} clipTop=${el.clippedTop} vh=${el.vh}`)
  console.log(`  pixel-sampled BG (median, device-px): rgb(${sp.bg}) [nBg=${sp.nBg}]`)
  console.log(`  pixel-sampled GLYPH-CORE (brightest strokes): rgb(${sp.glyphCore}) [nGlyph=${sp.nGlyph}]`)
  console.log(`  parsed text rgba: [${tc}]  -> composited over pixel bg = rgb(${compFg})`)
  console.log(`  >>> DOM-alpha-over-pixelBG WCAG contrast: ${domContrast ? domContrast.toFixed(2) : 'n/a'}:1`)
  console.log(`  >>> PIXEL-only glyph-vs-bg WCAG contrast: ${pxContrast ? pxContrast.toFixed(2) : 'n/a'}:1`)
  console.log(`  bgStack(top5): ${JSON.stringify(el.bgStack.slice(0, 5))}`)
  return { fs: el.fs, domContrast, pxContrast, el }
}

async function measureIntroChip(page) {
  // desktop HOW IT WORKS chip
  const chip = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-ctl-intro"]')
    if (!el) return { found: false }
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
    // children text pieces
    const spans = [...el.querySelectorAll('span, strong')].map((s) => {
      const sr = s.getBoundingClientRect(); const sc = getComputedStyle(s)
      let direct = ''; for (const n of s.childNodes) if (n.nodeType === 3) direct += n.textContent
      return { tag: s.tagName, txt: (direct || s.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90), fs: parseFloat(sc.fontSize), weight: sc.fontWeight, color: sc.color, x: Math.round(sr.x), y: Math.round(sr.y) }
    })
    // find SEND IT cta
    let cta = null
    for (const btn of document.querySelectorAll('button, [role="button"], [data-testid*="cta"]')) {
      if ((btn.textContent || '').toUpperCase().includes('SEND IT')) { const br = btn.getBoundingClientRect(); cta = { txt: btn.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), x: Math.round(br.x), y: Math.round(br.y), fs: parseFloat(getComputedStyle(btn).fontSize), bg: getComputedStyle(btn).backgroundColor } }
    }
    return {
      found: true, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top),
      border: cs.border, borderColor: cs.borderColor, borderWidth: cs.borderWidth, bg: cs.backgroundColor, bgImg: cs.backgroundImage.slice(0, 60), radius: cs.borderRadius, padding: cs.padding,
      spans, cta, vh: window.innerHeight,
    }
  })
  console.log(`\n[desktop] ===== HOW IT WORKS CHIP =====`)
  if (!chip.found) { console.log('  CHIP NOT FOUND (data-testid=vault-ctl-intro)'); return chip }
  console.log(`  chip @(${chip.x},${chip.y}) ${chip.w}x${chip.h} top=${chip.top}`)
  console.log(`  border:${chip.border} | borderColor:${chip.borderColor} width:${chip.borderWidth} | radius:${chip.radius} | pad:${chip.padding}`)
  console.log(`  bg:${chip.bg} bgImg:${chip.bgImg}`)
  console.log(`  text pieces:`)
  chip.spans.forEach((s) => console.log(`     [${s.tag}] fs${s.fs} w${s.weight} col${s.color} @(${s.x},${s.y}) "${s.txt}"`))
  if (chip.cta) console.log(`  SEND IT cta: "${chip.cta.txt}" fs${chip.cta.fs} bg${chip.cta.bg} @(${chip.cta.x},${chip.cta.y})`)
  console.log(`  chip TOP (${chip.top}) vs SEND IT y (${chip.cta ? chip.cta.y : '?'}) -> chip is ${chip.cta && chip.top < chip.cta.y ? 'ABOVE' : 'BELOW/na'} the CTA`)
  return chip
}

// full text scan sorted by fontSize (largest live text)
async function textScan(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight; const out = []
    for (const el of document.querySelectorAll('*')) {
      let txt = ''; for (const n of el.childNodes) if (n.nodeType === 3) txt += n.textContent
      txt = txt.replace(/\s+/g, ' ').trim(); if (!txt) continue
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) continue
      const inVP = r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw && r.top >= 0
      if (!inVP) continue
      out.push({ txt: txt.slice(0, 55), fs: Math.round(parseFloat(cs.fontSize) * 10) / 10, weight: cs.fontWeight, color: cs.color, x: Math.round(r.x), y: Math.round(r.y) })
    }
    return out.sort((a, b) => b.fs - a.fs)
  })
}

async function run(label, vw, vh, dpr) {
  const p = await b.newPage()
  p.on('pageerror', (e) => console.log(`[${label}] PAGEERROR`, e.message))
  await p.setViewport({ width: vw, height: vh, deviceScaleFactor: dpr })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(1400)
  const shot = `${OUT}/cold-${label}.png`
  await p.screenshot({ path: shot })
  console.log(`\n########## ${label} (${vw}x${vh} dpr${dpr}) ##########`)

  // largest live text (hierarchy context)
  const scan = await textScan(p)
  console.log('--- TOP 14 LARGEST IN-VP TEXT ---')
  scan.slice(0, 14).forEach((o) => console.log(`  fs${o.fs} w${o.weight} @(${o.x},${o.y}) col${o.color} "${o.txt}"`))

  if (label.startsWith('mobile')) {
    await measureHint(p, dpr, label, shot)
    // where does the mobile hint rank in the size hierarchy?
    const hintRank = scan.findIndex((o) => o.txt.includes('crack compartments'))
    console.log(`  mobile hint size-rank among in-VP text: ${hintRank} of ${scan.length} (0=largest)`)
  } else {
    await measureIntroChip(p)
    const introRank = scan.findIndex((o) => o.txt.toUpperCase().includes('HOW IT WORKS'))
    console.log(`  "HOW IT WORKS" label size-rank among in-VP text: ${introRank} of ${scan.length}`)
  }
  await p.close()
}

await run('desktop-1440', 1440, 900, 1)
await run('mobile-390', 390, 844, 3)   // Pixel 7 ~ dpr 2.6; use 3 for solid glyph cores
await b.close()
console.log('\nDONE coldstart2')
