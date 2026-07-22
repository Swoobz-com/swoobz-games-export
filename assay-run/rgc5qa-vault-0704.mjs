import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:6303/'
const OUT = 'shots-rgc5-qa-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.trim().includes(t)) || null
  }, txt)
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}
const isClickable = async (page, txt) => {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.trim().includes(t))
    if (!b) return { found: false }
    const r = b.getBoundingClientRect()
    const cs = getComputedStyle(b)
    return {
      found: true,
      disabled: b.disabled,
      visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0,
      w: r.width, h: r.height, top: r.top, left: r.left,
    }
  }, txt)
}
const canvasBox = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

// Injected BEFORE any page script runs — logs every oscillator/gain param fired.
const AUDIO_PROBE = () => {
  window.__audioLog = []
  const OrigOsc = window.OfflineAudioContext // no-op placeholder to appease bundlers
  const patch = (proto) => {
    const origCreateOscillator = proto.createOscillator
    proto.createOscillator = function (...args) {
      const osc = origCreateOscillator.apply(this, args)
      const entry = { kind: 'osc', type: null, freqStart: null, freqEnd: null, t: performance.now() }
      window.__audioLog.push(entry)
      const origType = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(osc), 'type')
      osc.addEventListener('ended', () => {})
      const origSetValueAtTime = osc.frequency.setValueAtTime.bind(osc.frequency)
      osc.frequency.setValueAtTime = (v, t) => {
        entry.freqStart = v
        return origSetValueAtTime(v, t)
      }
      const origRamp = osc.frequency.exponentialRampToValueAtTime.bind(osc.frequency)
      osc.frequency.exponentialRampToValueAtTime = (v, t) => {
        entry.freqEnd = v
        return origRamp(v, t)
      }
      const origStart = osc.start.bind(osc)
      osc.start = (t) => {
        entry.type = osc.type
        entry.startedAt = performance.now()
        return origStart(t)
      }
      const origStop = osc.stop.bind(osc)
      osc.stop = (t) => {
        entry.stopScheduledAt = t
        return origStop(t)
      }
      return osc
    }
    const origCreateGain = proto.createGain
    proto.createGain = function (...args) {
      const g = origCreateGain.apply(this, args)
      const entry = { kind: 'gain', peakGain: 0, t: performance.now() }
      window.__audioLog.push(entry)
      const origSetValueAtTime = g.gain.setValueAtTime.bind(g.gain)
      g.gain.setValueAtTime = (v, t) => {
        if (v > entry.peakGain) entry.peakGain = v
        return origSetValueAtTime(v, t)
      }
      const origRamp = g.gain.exponentialRampToValueAtTime.bind(g.gain)
      g.gain.exponentialRampToValueAtTime = (v, t) => {
        if (v > entry.peakGain) entry.peakGain = v
        return origRamp(v, t)
      }
      return g
    }
    const origCreateBiquad = proto.createBiquadFilter
    proto.createBiquadFilter = function (...args) {
      const f = origCreateBiquad.apply(this, args)
      const entry = { kind: 'biquad', type: f.type, freq: null, q: null, t: performance.now() }
      window.__audioLog.push(entry)
      // capture value assignment via a getter/setter proxy on frequency.value / Q.value
      let freqVal = f.frequency.value
      Object.defineProperty(f.frequency, 'value', {
        configurable: true,
        get: () => freqVal,
        set: (v) => { freqVal = v; entry.freq = v },
      })
      let qVal = f.Q.value
      Object.defineProperty(f.Q, 'value', {
        configurable: true,
        get: () => qVal,
        set: (v) => { qVal = v; entry.q = v },
      })
      return f
    }
    const origCreateBufferSource = proto.createBufferSource
    proto.createBufferSource = function (...args) {
      const s = origCreateBufferSource.apply(this, args)
      window.__audioLog.push({ kind: 'noiseBufferSource', t: performance.now() })
      return s
    }
  }
  patch(AudioContext.prototype)
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required'] })

async function runOnFloor({ page, floorLabel, trailLen, maxAttempts, tag }) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(300)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(300)
    // select floor tier (visible during planning rail)
    const gotTier = await clickText(page, floorLabel)
    await wait(150)

    const box = await canvasBox(page)
    const tile = box.w / 10 // GRID_DIM = 10
    // paint a connected trail of trailLen tiles, snake pattern from bottom-left
    let r = 8, c = 1
    for (let i = 0; i < trailLen; i++) {
      await page.mouse.click(box.x + c * tile + tile / 2, box.y + r * tile + tile / 2)
      await wait(20)
      c += 1
      if (c >= 9) { c = 1; r -= 1 }
    }
    await wait(150)
    await clickText(page, 'THROW BREAKER')
    // Poll for settle (staggered cascade) instead of one fixed wait, so we can
    // grab the hero-pop's LIVE computed animation while it is still mounted
    // (it auto-unmounts after HERO_POP_HOLD_MS=1700ms from the moment settle fires).
    let info = { won: false, bust: false }
    let heroAnimEarly = null
    for (let poll = 0; poll < 40; poll++) {
      await wait(100)
      info = await page.evaluate(() => {
        const t = document.body.innerText
        return { won: /CLAIM PROVEN/.test(t), bust: /BAD VEIN/.test(t) || /BUSTED/.test(t) }
      })
      if (info.won && !heroAnimEarly) {
        heroAnimEarly = await page.evaluate(() => {
          // Find the literal <span>SECURED</span> text node's element, then
          // its DIRECT parent is the pill <div> carrying the inline
          // `animation` style (querySelectorAll('div') in doc order would
          // instead match an outer ANCESTOR div first, since svg/canvas
          // siblings contribute no text — that outer div has no animation of
          // its own, which was the bug in the previous capture).
          const spans = [...document.querySelectorAll('span')]
          const secSpan = spans.find((s) => s.textContent && s.textContent.trim() === 'SECURED')
          const hero = secSpan ? secSpan.parentElement : null
          if (!hero) return null
          const cs = getComputedStyle(hero)
          const rect = hero.getBoundingClientRect()
          return {
            animation: cs.animation,
            animationDuration: cs.animationDuration,
            animationName: cs.animationName,
            transform: cs.transform,
            fontSize: cs.fontSize,
            rectW: Math.round(rect.width),
            rectH: Math.round(rect.height),
          }
        })
      }
      if (info.won || info.bust) break
    }
    console.log(`[${tag}] attempt ${attempt} tierClicked=${gotTier} trailLen=${trailLen} ->`, info.won ? 'WON' : info.bust ? 'BUST' : 'UNKNOWN')

    if (info.won) {
      // capture hero-pop callout computed animation + oscillator log + payout text
      const heroAnim = heroAnimEarly ?? await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('div')]
        const hero = nodes.find((d) => d.textContent && d.textContent.trim() === 'SECURED')
        if (!hero) return null
        const wrap = hero.parentElement
        const cs = getComputedStyle(wrap)
        return { animation: cs.animation, animationDuration: cs.animationDuration }
      })
      const payoutText = await page.evaluate(() => {
        const el = [...document.querySelectorAll('*')].find((n) => n.textContent && /CLAIM PROVEN/.test(n.textContent) && n.children.length === 0)
        return el ? el.parentElement?.textContent?.slice(0, 400) : document.body.innerText.slice(0, 800)
      })
      const audioLog = await page.evaluate(() => window.__audioLog || [])
      await page.screenshot({ path: `${OUT}/${tag}-WIN-settled.png` })
      fs.writeFileSync(`${OUT}/${tag}-audiolog.json`, JSON.stringify(audioLog, null, 2))
      fs.writeFileSync(`${OUT}/${tag}-heroanim.json`, JSON.stringify(heroAnim, null, 2))
      fs.writeFileSync(`${OUT}/${tag}-payout.txt`, payoutText || '')
      return { won: true, heroAnim, audioLog, payoutText, trailLen, attempt }
    }
  }
  return { won: false }
}

const page = await browser.newPage()
await page.evaluateOnNewDocument(AUDIO_PROBE) // registered ONCE; applies fresh on every future navigation
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
page.on('console', (m) => { if (m.type() === 'error') console.log('[console error]', m.text()) })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))

console.log('=== SMALL WIN on LEAN FLOOR (trail = MIN_TRAIL = 8), heroAnim fix rerun ===')
const leanResult = await runOnFloor({ page, floorLabel: 'Lean Floor', trailLen: 8, maxAttempts: 6, tag: 'lean-small-v2' })

console.log('\n=== BIGGER WIN on FLOODED FLOOR (trail = 8, higher risk tier -> bigger per-nub delta) ===')
const floodedResult = await runOnFloor({ page, floorLabel: 'Flooded Floor', trailLen: 8, maxAttempts: 15, tag: 'flooded-bigger-v2' })

console.log('\n=== EVEN BIGGER WIN on FLOODED FLOOR (trail = 14) ===')
const floodedResult2 = await runOnFloor({ page, floorLabel: 'Flooded Floor', trailLen: 14, maxAttempts: 20, tag: 'flooded-biggest-v2' })

fs.writeFileSync(`${OUT}/summary3.json`, JSON.stringify({ leanResult, floodedResult, floodedResult2 }, null, 2))
console.log('\n=== DONE, see', OUT, '===')

await browser.close()
