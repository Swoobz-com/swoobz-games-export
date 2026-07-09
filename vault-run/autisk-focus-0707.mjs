import puppeteer from 'puppeteer-core'
import { spawn, execSync } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5321
const OUT = process.env.OUT
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
function waitForServer(port, t = 45000) {
  const s = Date.now()
  return new Promise((res, rej) => {
    const go = () => { const rq = http.get({ host: 'localhost', port, path: '/', timeout: 2000 }, (r) => { r.resume(); res(true) }); rq.on('error', () => { if (Date.now() - s > t) rej(new Error('x')); else setTimeout(go, 500) }); rq.on('timeout', () => { rq.destroy(); if (Date.now() - s > t) rej(new Error('x')); else setTimeout(go, 500) }) }
    go()
  })
}
function killTree(pid) { if (!pid) return; try { execSync('taskkill /pid ' + pid + ' /T /F', { stdio: 'ignore' }) } catch (e) {} }
async function clickTestId(page, id) { const h = await page.$('[data-testid="' + id + '"]'); if (!h) return false; const b = await h.boundingBox(); if (!b) return false; await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); return true }
async function clickText(page, text) {
  const h = await page.evaluateHandle((t) => { const els = [...document.querySelectorAll('button,[role=button],a')]; const n = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase(); const lc = t.toLowerCase(); return els.find((e) => e.offsetParent !== null && n(e) === lc) || els.find((e) => e.offsetParent !== null && n(e).includes(lc)) || null }, text)
  const el = h.asElement(); if (!el) return false; const b = await el.boundingBox(); if (!b) return false; await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); return true
}
async function dismiss(page) { await clickText(page, 'got it'); await wait(120); await clickText(page, 'skip'); await wait(150) }
async function loadFresh(page, dev) {
  await page.setViewport({ width: dev.w, height: dev.h, deviceScaleFactor: dev.mobile ? 2 : 1, isMobile: dev.mobile, hasTouch: dev.mobile })
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await page.reload({ waitUntil: 'networkidle0' }); await wait(500); await dismiss(page)
}
async function focusBoard(page) { await page.evaluate(() => { const c = document.querySelector('canvas'); if (c) { c.setAttribute('tabindex', '0'); c.focus() } }) }
async function isSettled(page) { return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]')) }
async function outcome(page) { return page.evaluate(() => { const el = document.querySelector('[data-testid="vault-settled-banner"]'); if (!el) return null; const t = el.textContent || ''; if (/SECURED THE BAG/i.test(t)) return 'win'; if (/RUGGED/i.test(t)) return 'loss'; return 'unknown' }) }
async function hasBadge(page) { return page.evaluate(() => { const b = document.querySelector('[data-testid="vault-rhythm-badge"]'); return b ? (b.getAttribute('data-tier') + ':' + (b.textContent || '').trim()) : null }) }
const MOVES = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowLeft']
async function kbReveal(page, i, gap) { await focusBoard(page); await page.keyboard.press(MOVES[i % MOVES.length]); await wait(50); await page.keyboard.press('Enter'); await wait(gap) }
async function snap(page, n) { await page.screenshot({ path: path.join(OUT, n + '.png') }) }
async function driveWinSteady(page, dev, world, label) {
  for (let a = 0; a < 30; a++) {
    await loadFresh(page, dev)
    await clickTestId(page, 'vault-world-card-' + world); await wait(200)
    await clickText(page, 'send it'); await wait(800)
    await kbReveal(page, 0, 450); if (await isSettled(page)) continue
    await kbReveal(page, 1, 450); if (await isSettled(page)) continue
    await clickText(page, 'take profit'); await wait(900)
    if ((await outcome(page)) !== 'win') continue
    await wait(3500) // steady state
    await snap(page, label)
    return true
  }
  return false
}
async function driveLossSteady(page, dev, world, label) {
  await loadFresh(page, dev)
  await clickTestId(page, 'vault-world-card-' + world); await wait(200)
  await clickText(page, 'send it'); await wait(800)
  for (let i = 0; i < 45; i++) { await kbReveal(page, i, 350); if (await isSettled(page)) break }
  if ((await outcome(page)) !== 'loss') return false
  await wait(3500); await snap(page, label); return true
}
async function driveRhythm(page, dev, world, label) {
  for (let a = 0; a < 40; a++) {
    await loadFresh(page, dev)
    await clickTestId(page, 'vault-world-card-' + world); await wait(200)
    await clickText(page, 'send it'); await wait(700)
    let got = null
    for (let i = 0; i < 6; i++) {
      await kbReveal(page, i, 300)
      if (await isSettled(page)) break
      const b = await hasBadge(page)
      if (b) { got = b; await snap(page, label + '-' + i + '-' + b.split(':')[0]); }
    }
    if (got) { console.log('[rhythm] ' + label + ' -> ' + got); return got }
  }
  return null
}
async function main() {
  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: __dirname, shell: true })
  let browser
  try {
    await waitForServer(PORT); await wait(500)
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
    const page = await browser.newPage(); page.setDefaultTimeout(15000)
    const PX = { name: 'Pixel7', w: 412, h: 915, mobile: true }
    const IP = { name: 'iPhone14Pro', w: 393, h: 852, mobile: true }
    const DK = { name: 'Desktop1440', w: 1440, h: 900, mobile: false }
    console.log('win steady px bluechips', await driveWinSteady(page, PX, 'bluechips', 'STEADY-Pixel7-bluechips-win'))
    console.log('loss steady px shitcoin', await driveLossSteady(page, PX, 'shitcoin', 'STEADY-Pixel7-shitcoin-loss'))
    console.log('win steady ip altseason', await driveWinSteady(page, IP, 'altseason', 'STEADY-iPhone14Pro-altseason-win'))
    console.log('rhythm dk bluechips', await driveRhythm(page, DK, 'bluechips', 'RHYTHM-Desktop1440-bluechips'))
    console.log('rhythm px bluechips', await driveRhythm(page, PX, 'bluechips', 'RHYTHM-Pixel7-bluechips'))
  } catch (e) { console.error('FATAL', e); process.exitCode = 1 } finally { try { if (browser) await browser.close() } catch (e) {} killTree(vite.pid); console.log('[driver] down') }
}
main()
