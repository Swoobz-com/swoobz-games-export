// Quick empirical regression check: no >3Hz flashing in the bust flash /
// settle celebration (none of the 6 CRIT fixes touch this code path per
// source read, but verifying empirically rather than trusting that alone).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await tapText(page, 'ENTER THE ASSAY LINE')
await wait(300)
await tapText(page, 'Heavy Floor')
await wait(150)

// Paint a dense near-full board (Heavy = 8 bombs/100, high bust odds) to force a bust quickly.
const geo = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const cr = c.getBoundingClientRect()
  return { left: cr.left, top: cr.top, w: cr.width, h: cr.height }
})
const TILE = geo.w / 10
for (let i = 0; i < 60; i++) {
  const col = i % 10
  const row = Math.floor(i / 10)
  await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
}
await wait(150)
await tapText(page, 'RUN THE LINE')

// Sample average brightness of the board region every ~60ms for ~3s, watching for the bust flash.
const samples = []
const start = Date.now()
while (Date.now() - start < 3500) {
  const b64 = await page.screenshot({ encoding: 'base64', clip: { x: geo.left, y: geo.top, width: geo.w, height: geo.h } })
  const brightness = await page.evaluate((b64) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = 40; c.height = 40 // downsample for speed
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0, 40, 40)
        const d = ctx.getImageData(0, 0, 40, 40).data
        let sum = 0
        for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3
        resolve(sum / (d.length / 4))
      }
      img.src = 'data:image/png;base64,' + b64
    })
  }, b64)
  samples.push({ t: Date.now() - start, brightness })
}
const outcome = await page.evaluate(() => document.body.innerText.includes('CLAIM PROVEN') ? 'WIN' : (document.body.innerText.includes('BUST') || document.body.innerText.includes('busted') || document.body.innerText.includes('CRACKED') ? 'BUST-ish' : 'unknown'))

// Count sign-change transitions with threshold 0.1*avg (mirrors the memory's established method).
let transitions = 0
for (let i = 2; i < samples.length; i++) {
  const d1 = samples[i - 1].brightness - samples[i - 2].brightness
  const d2 = samples[i].brightness - samples[i - 1].brightness
  if (Math.abs(d1) > 2 && Math.abs(d2) > 2 && Math.sign(d1) !== Math.sign(d2)) transitions++
}
const elapsedS = (samples[samples.length - 1].t - samples[0].t) / 1000
const hz = transitions / elapsedS
console.log('OUTCOME:', outcome)
console.log('SAMPLES:', samples.length, 'over', elapsedS.toFixed(2), 's')
console.log('BRIGHTNESS TIMELINE:', JSON.stringify(samples.map((s) => ({ t: s.t, b: Math.round(s.brightness) }))))
console.log('TRANSITIONS:', transitions, 'ESTIMATED Hz:', hz.toFixed(2))

fs.writeFileSync('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-a11y-verify-0704/flash-check.json', JSON.stringify({ outcome, samples, transitions, hz }, null, 2))
await browser.close()
