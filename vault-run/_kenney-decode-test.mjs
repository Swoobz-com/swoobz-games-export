import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const VAULT_FILES = [
  'http://localhost:5281/assets/raw/kenney/audio/vault/impactMetal_heavy_000.ogg',
  'http://localhost:5281/assets/raw/kenney/audio/vault/impactBell_heavy_002.ogg',
  'http://localhost:5281/assets/raw/kenney/audio/vault/tick_002.ogg',
]
const PULSE_FILES = [
  'http://localhost:5180/assets/raw/kenney/audio/pulse/impactBell_heavy_000.ogg',
  'http://localhost:5180/assets/raw/kenney/audio/pulse/impactMetal_heavy_000.ogg',
  'http://localhost:5180/assets/raw/kenney/audio/pulse/impactBell_heavy_002.ogg',
]

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.goto('http://localhost:5281/', { waitUntil: 'domcontentloaded' })

const results = await page.evaluate(async (files) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const out = []
  for (const url of files) {
    try {
      const resp = await fetch(url)
      const buf = await resp.arrayBuffer()
      const decoded = await ctx.decodeAudioData(buf.slice(0))
      out.push({ url, decodeOk: true, durationSec: decoded.duration, channels: decoded.numberOfChannels, sampleRate: decoded.sampleRate })
    } catch (e) {
      out.push({ url, decodeOk: false, error: String(e) })
    }
  }
  return out
}, VAULT_FILES)

console.log('=== VAULT decode results ===')
for (const r of results) console.log(JSON.stringify(r))

await page.close()
const page2 = await browser.newPage()
await page2.goto('http://localhost:5180/full-pulse.html', { waitUntil: 'domcontentloaded' })
const results2 = await page2.evaluate(async (files) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const out = []
  for (const url of files) {
    try {
      const resp = await fetch(url)
      const buf = await resp.arrayBuffer()
      const decoded = await ctx.decodeAudioData(buf.slice(0))
      out.push({ url, decodeOk: true, durationSec: decoded.duration, channels: decoded.numberOfChannels, sampleRate: decoded.sampleRate })
    } catch (e) {
      out.push({ url, decodeOk: false, error: String(e) })
    }
  }
  return out
}, PULSE_FILES)

console.log('=== PULSE decode results ===')
for (const r of results2) console.log(JSON.stringify(r))

await browser.close()
