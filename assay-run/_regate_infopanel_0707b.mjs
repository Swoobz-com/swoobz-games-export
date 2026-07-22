// Independent re-gate driver: verify the ABYSS LINE info/how-to-play panel
// rule-of-three fix (eyebrow header color BONE, cyan only on action spans)
// and the RTP "96.50%" formatting fix, via LIVE computed styles.
import { launch, wait, clickText } from './_a11yHelpers.mjs'
import fs from 'node:fs'

const OUT = 'shots-regate-infopanel-0707b'
fs.mkdirSync(OUT, { recursive: true })

function toRgb(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}
const BONE = toRgb('e6f1f5')
const GOLD = toRgb('f0b542')
const BLOOD = toRgb('ff5d5d')
const PLAYER_TEXT = toRgb('8ff2e8')

const { browser, page, consoleErrors } = await launch({ width: 1440, height: 900 })

// Open the "How to play" dialog via its aria-label.
const opened = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(
    (b) => b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('How to play'),
  )
  if (!btn) return false
  btn.click()
  return true
})
await wait(500)

const result = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]')
  if (!dialog) return { error: 'no dialog found' }

  // All 5 section-header <p> elements: find by their text content.
  const headerTexts = ['THE DIVE', 'DIVE DEPTH', 'REVEAL PACE', 'HAUL', 'PROVABLY FAIR']
  const ps = [...dialog.querySelectorAll('p')]
  const headers = headerTexts.map((t) => {
    const el = ps.find((p) => p.textContent && p.textContent.trim().startsWith(t))
    if (!el) return { label: t, found: false }
    const cs = getComputedStyle(el)
    return { label: t, found: true, text: el.textContent.trim(), color: cs.color, fontFamily: cs.fontFamily }
  })

  // Cyan/PLAYER_TEXT spans (action terms) inside the dialog.
  const spans = [...dialog.querySelectorAll('span')]
  const cyanSpans = spans
    .map((s) => ({ text: s.textContent.trim(), color: getComputedStyle(s).color }))
    .filter((s) => s.color === 'rgb(143, 242, 232)')

  // RTP text nodes.
  const rtpSpans = spans
    .filter((s) => /%/.test(s.textContent))
    .map((s) => ({ text: s.textContent.trim(), color: getComputedStyle(s).color, letterSpacing: getComputedStyle(s).letterSpacing, fontFamily: getComputedStyle(s).fontFamily }))

  // Any element in the dialog with cyan-family color other than the 2 expected spans.
  const allCyan = spans
    .map((s) => ({ text: s.textContent.trim(), color: getComputedStyle(s).color }))
    .filter((s) => s.color === 'rgb(143, 242, 232)')

  return { headers, cyanSpans, rtpSpans, allCyan, dialogFontFamily: getComputedStyle(dialog).fontFamily }
})

console.log(JSON.stringify({ opened, result }, null, 2))
console.log('EXPECTED BONE:', BONE, 'GOLD:', GOLD, 'BLOOD:', BLOOD, 'PLAYER_TEXT:', PLAYER_TEXT)

await page.screenshot({ path: `${OUT}/info-panel.png` })
console.log('consoleErrors:', consoleErrors)

await browser.close()
