import { execFileSync } from 'child_process'
import fs from 'fs'
// Use sharp via python? No — use puppeteer to re-crop by taking element screenshots + contrast sampling instead.
import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5211'
const OUT = 'shots-jesse-coldstart-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })

// contrast helper
function lum(r, g, bch) { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bch) }
function contrast(a, c) { const l1 = lum(...a), l2 = lum(...c); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05) }

async function shotAndSample(label, vw, vh, dpr, phraseSel) {
  const p = await b.newPage()
  await p.setViewport({ width: vw, height: vh, deviceScaleFactor: dpr })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1000)

  // find the explainer container (element containing 'crack compartments'), crop it, and get its effective bg
  const info = await p.evaluate(() => {
    const all = [...document.querySelectorAll('*')]
    const findByText = (needle) => all.filter((el) => {
      let t = ''; for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent
      return t.replace(/\s+/g, ' ').toLowerCase().includes(needle)
    }).sort((a, b) => (a.getBoundingClientRect().width * a.getBoundingClientRect().height) - (b.getBoundingClientRect().width * b.getBoundingClientRect().height))[0]
    const hint = findByText('crack compartments')
    const eyebrow = findByText('dodge the rug')
    const rectOf = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }
    // walk up to first element with a non-transparent background for effective bg
    const bgOf = (el) => { let e = el; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; e = e.parentElement } return 'rgb(0,0,0)' }
    const csOf = (el) => { const c = getComputedStyle(el); return { color: c.color, fs: c.fontSize, weight: c.fontWeight } }
    return {
      hintRect: rectOf(hint), hintCs: hint ? csOf(hint) : null, hintBg: hint ? bgOf(hint) : null,
      eyebrowRect: rectOf(eyebrow), eyebrowCs: eyebrow ? csOf(eyebrow) : null, eyebrowBg: eyebrow ? bgOf(eyebrow) : null,
    }
  })

  // crop the explainer region (union of eyebrow+hint) padded
  const r = info.hintRect
  const e = info.eyebrowRect
  const x = Math.max(0, Math.min(r.x, e.x) - 8)
  const y = Math.max(0, Math.min(r.y, e.y) - 8)
  const w = Math.min(vw - x, Math.max(r.x + r.w, e.x + e.w) - x + 8)
  const h = Math.min(vh - y, Math.max(r.y + r.h, e.y + e.h) - y + 8)
  await p.screenshot({ path: `${OUT}/explainer-${label}.png`, clip: { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) } })

  // parse rgba color into components (composite over bg for the hint alpha)
  const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number)
  const comp = (fg, bg) => { const f = parse(fg), g = parse(bg); const a = f.length > 3 ? f[3] : 1; return [0, 1, 2].map((i) => Math.round(f[i] * a + g[i] * (1 - a))) }
  const hintFg = comp(info.hintCs.color, info.hintBg)
  const hintBg = parse(info.hintBg).slice(0, 3)
  const ebFg = comp(info.eyebrowCs.color, info.eyebrowBg)
  const ebBg = parse(info.eyebrowBg).slice(0, 3)

  console.log(`\n===== ${label} explainer legibility =====`)
  console.log(`  EYEBROW  "${info.eyebrowCs ? '' : 'MISSING'}" fs${info.eyebrowCs?.fs} w${info.eyebrowCs?.weight} color=${info.eyebrowCs?.color} bg=${info.eyebrowBg}`)
  console.log(`           composited fg=[${ebFg}] contrast=${contrast(ebFg, ebBg).toFixed(2)}:1`)
  console.log(`  HINT     fs${info.hintCs?.fs} w${info.hintCs?.weight} color=${info.hintCs?.color} bg=${info.hintBg}`)
  console.log(`           composited fg=[${hintFg}] contrast=${contrast(hintFg, hintBg).toFixed(2)}:1`)
  console.log(`  crop @(${Math.round(x)},${Math.round(y)}) ${Math.round(w)}x${Math.round(h)}`)
  await p.close()
}

await shotAndSample('desktop', 1440, 900, 2)
await shotAndSample('mobile', 390, 844, 3)
await b.close()
console.log('\nDONE explainer crops')
