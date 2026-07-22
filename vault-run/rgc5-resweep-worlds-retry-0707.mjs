// rgc5-resweep-worlds-retry-0707.mjs — repeat rhythm probe multiple fresh
// rounds per world (mine placement is randomized per round) to empirically
// confirm BOTH badge tiers ('rhythm' chain3-4, 'perfect' chain>=5) are
// reachable on BLUECHIPS and SHITCOIN (ALTSEASON already confirmed both
// tiers in the main resweep run).
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5282'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
      null
    )
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function dismiss(page) { await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200) }
async function loadFresh(page) {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await dismiss(page)
}
function cellSeqFor(gridSize) {
  const seq = []
  for (let cy = 0; cy < gridSize; cy++) for (let cx = 0; cx < gridSize; cx++) seq.push([cx, cy])
  return seq
}
async function boardBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
async function rhythmProbe(page, world, gridSize, maxTaps) {
  await clickText(page, world)
  await wait(200)
  await clickText(page, 'send it')
  await wait(1000)
  const seq = cellSeqFor(gridSize)
  const tiers = new Set()
  let maxChainSeenTier = null
  for (let i = 0; i < Math.min(maxTaps, seq.length); i++) {
    const settledNow = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
    if (settledNow) return { tiers: [...tiers], settledAtTap: i }
    const box = await boardBox(page)
    if (!box) break
    const [cx, cy] = seq[i]
    const fx = 0.06 + ((cx + 0.5) / gridSize) * 0.88
    const fy = 0.08 + ((cy + 0.5) / gridSize) * 0.8
    await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
    await wait(90)
    const tier = await page.evaluate(() => document.querySelector('[data-testid="vault-rhythm-badge"]')?.getAttribute('data-tier') || null)
    if (tier) tiers.add(tier)
  }
  return { tiers: [...tiers], settledAtTap: null }
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const results = { bluechips: [], shitcoin: [] }
  for (let attempt = 0; attempt < 6; attempt++) {
    await loadFresh(page)
    const r = await rhythmProbe(page, 'bluechips', 5, 24)
    results.bluechips.push(r)
    if (r.tiers.includes('perfect')) break
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    await loadFresh(page)
    const r = await rhythmProbe(page, 'shitcoin', 7, 48)
    results.shitcoin.push(r)
    if (r.tiers.includes('perfect')) break
  }
  fs.writeFileSync('shots-rgc5-resweep-0707/worlds-retry-results.json', JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
