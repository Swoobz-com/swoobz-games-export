import puppeteer from 'puppeteer-core'
import fs from 'fs'
import { PNG } from 'pngjs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5216'
const OUT = 'shots-jesse-coldstart2-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const lum = ([r, g, bl]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(bl)
const ratio = (a, bg) => { const l1 = lum(a), l2 = lum(bg); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05) }
const px = (png, x, y) => { x = Math.round(x); y = Math.round(y); const i = (png.width * y + x) << 2; return [png.data[i], png.data[i + 1], png.data[i + 2]] }

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 }) // dpr2 for solid glyph cores
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await wait(1400)
const shot = `${OUT}/deskchip.png`
await p.screenshot({ path: shot })
// crop the chip for viewing
const rect = await p.evaluate(() => { const e = document.querySelector('[data-testid="vault-ctl-intro"]'); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bodyY: (() => { const s = e.querySelectorAll('span')[1]; const sr = s.getBoundingClientRect(); return { x: sr.x, y: sr.y, w: sr.width, h: sr.height } })() } })
await p.screenshot({ path: `${OUT}/deskchip-crop.png`, clip: { x: Math.round(rect.x) - 4, y: Math.round(rect.y) - 4, width: Math.round(rect.w) + 8, height: Math.round(rect.h) + 8 } })
const png = PNG.sync.read(fs.readFileSync(shot))
const dpr = 2
const bod = rect.bodyY
// bg band above & below the body line
const bgs = []
for (const by of [(bod.y - 5) * dpr, (bod.y + bod.h + 5) * dpr]) for (let xx = bod.x * dpr + 6; xx < (bod.x + bod.w) * dpr - 6; xx += 3) bgs.push(px(png, xx, by))
const med = (arr, ch) => { const s = arr.map((q) => q[ch]).sort((a, c) => a - c); return s[Math.floor(s.length / 2)] }
const bg = [med(bgs, 0), med(bgs, 1), med(bgs, 2)]
// glyph cores in the body band
const cand = []
for (let yy = (bod.y + bod.h * 0.15) * dpr; yy < (bod.y + bod.h * 0.85) * dpr; yy++) for (let xx = bod.x * dpr; xx < (bod.x + bod.w) * dpr; xx++) { const q = px(png, xx, yy); cand.push({ q, d: Math.abs(q[0] - bg[0]) + Math.abs(q[1] - bg[1]) + Math.abs(q[2] - bg[2]) }) }
cand.sort((a, c) => c.d - a.d)
const top = cand.slice(0, Math.max(20, Math.floor(cand.length * 0.03)))
const gc = [0, 1, 2].map((ch) => Math.round(top.reduce((s, o) => s + o.q[ch], 0) / top.length))
console.log('DESKTOP CHIP BODY (fs12, "crack compartments..." line, dpr2)')
console.log('  pixel bg rgb(' + bg + ')  glyph-core rgb(' + gc + ')')
console.log('  >>> PIXEL contrast body-vs-bg: ' + ratio(gc, bg).toFixed(2) + ':1')
await b.close()
