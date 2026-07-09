import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5211'
const OUT = 'shots-jesse-coldstart-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })

// ---------- text-scan helper: every visible element with a direct text node, sorted by fontSize ----------
async function textScan(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight
    const out = []
    const all = document.querySelectorAll('*')
    for (const el of all) {
      // direct text node only
      let txt = ''
      for (const n of el.childNodes) if (n.nodeType === 3) txt += n.textContent
      txt = txt.replace(/\s+/g, ' ').trim()
      if (!txt) continue
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      // in-viewport?
      const inVP = r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) continue
      out.push({
        txt: txt.slice(0, 70),
        fs: Math.round(parseFloat(cs.fontSize) * 10) / 10,
        weight: cs.fontWeight,
        color: cs.color,
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        bottom: Math.round(r.bottom),
        inVP, belowFold: r.top >= vh, clippedTop: r.top < 0,
      })
    }
    return { vw, vh, docScrollH: document.documentElement.scrollHeight, out: out.sort((a, bb) => bb.fs - a.fs) }
  })
}

// find any element whose text contains a phrase, report geometry + in-viewport
async function findPhrase(page, phrase) {
  return page.evaluate((phrase) => {
    const vh = window.innerHeight, vw = window.innerWidth
    const lc = phrase.toLowerCase()
    const all = [...document.querySelectorAll('*')]
    const hits = all.filter((el) => {
      let txt = ''
      for (const n of el.childNodes) if (n.nodeType === 3) txt += n.textContent
      return txt.replace(/\s+/g, ' ').trim().toLowerCase().includes(lc)
    })
    // deepest (smallest) match
    hits.sort((a, b) => (a.getBoundingClientRect().width * a.getBoundingClientRect().height) - (b.getBoundingClientRect().width * b.getBoundingClientRect().height))
    const el = hits[0]
    if (!el) return { found: false }
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      found: true, txt: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      fs: parseFloat(cs.fontSize), weight: cs.fontWeight, color: cs.color, opacity: cs.opacity,
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom),
      inViewport: r.top >= 0 && r.bottom <= vh && r.left >= 0 && r.right <= vw,
      topInView: r.top >= 0 && r.top < vh, belowFold: r.top >= vh, clippedTop: r.top < 0,
      vh, vw,
    }
  }, phrase)
}

async function run(label, vw, vh, dpr) {
  const p = await b.newPage()
  p.on('pageerror', (e) => console.log(`[${label}] PAGEERROR`, e.message))
  await p.setViewport({ width: vw, height: vh, deviceScaleFactor: dpr })
  // clear storage BEFORE the app boots
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(1200)
  // COLD screenshot — no interaction at all
  await p.screenshot({ path: `${OUT}/cold-${label}.png` })
  await p.screenshot({ path: `${OUT}/cold-${label}-full.png`, fullPage: true })

  const phrases = ['ape in', 'dodge the rug', 'crack compartments', 'pump your multiplier', 'one rug ends it', 'cash out', 'take profit', 'send it', 'pick your world']
  const found = {}
  for (const ph of phrases) found[ph] = await findPhrase(p, ph)

  const scan = await textScan(p)
  console.log(`\n===== ${label} (${vw}x${vh} dpr${dpr}) =====`)
  console.log('docScrollH', scan.docScrollH, 'vh', scan.vh)
  console.log('--- PHRASE PRESENCE (cold, no scroll) ---')
  for (const ph of phrases) {
    const f = found[ph]
    if (!f.found) { console.log(`  MISSING: "${ph}"`); continue }
    console.log(`  "${ph}" fs${f.fs} w${f.weight} inVP=${f.topInView} belowFold=${f.belowFold} clipTop=${f.clippedTop} @(${f.x},${f.y}) ${f.w}x${f.h} color=${f.color} op=${f.opacity}`)
  }
  console.log('--- TOP 18 LARGEST VISIBLE TEXT (in-viewport, cold) ---')
  scan.out.filter(o => o.inVP && !o.belowFold).slice(0, 18).forEach(o => {
    console.log(`  fs${o.fs} w${o.weight} @(${o.x},${o.y}) "${o.txt}" col=${o.color}`)
  })
  await p.close()
  return { label, scan, found }
}

await run('desktop-1440', 1440, 900, 1)
await run('mobile-390', 390, 844, 2)   // Pixel 7 viewport

await b.close()
console.log('\nDONE coldstart')
