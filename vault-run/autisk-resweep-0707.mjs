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
function waitForServer(port, timeoutMs = 45000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get({ host: 'localhost', port, path: '/', timeout: 2000 }, (res) => { res.resume(); resolve(true) })
      req.on('error', () => { if (Date.now() - start > timeoutMs) reject(new Error('no server')); else setTimeout(tryOnce, 500) })
      req.on('timeout', () => { req.destroy(); if (Date.now() - start > timeoutMs) reject(new Error('no server')); else setTimeout(tryOnce, 500) })
    }
    tryOnce()
  })
}
function killTree(pid) { if (!pid) return; try { execSync('taskkill /pid ' + pid + ' /T /F', { stdio: 'ignore' }) } catch (e) {} }
const DEVICES = [
  { name: 'Desktop1440', w: 1440, h: 900, mobile: false },
  { name: 'Pixel7', w: 412, h: 915, mobile: true },
  { name: 'iPhone14Pro', w: 393, h: 852, mobile: true },
]
const WORLDS = [
  { key: 'bluechips', grid: 5 },
  { key: 'altseason', grid: 5 },
  { key: 'shitcoin', grid: 7 },
]
async function clickTestId(page, id) {
  const h = await page.$('[data-testid="' + id + '"]')
  if (!h) return false
  await h.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const box = await h.boundingBox()
  if (!box) return false
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  return true
}
async function clickText(page, text) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && norm(e) === lc) || els.find((e) => e.offsetParent !== null && norm(e).includes(lc)) || null
  }, text)
  const el = h.asElement()
  if (!el) return false
  await el.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  const box = await el.boundingBox()
  if (!box) return false
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  return true
}
async function dismiss(page) {
  await clickText(page, 'got it'); await wait(120)
  await clickText(page, 'skip'); await wait(150)
}
async function loadFresh(page, dev) {
  await page.setViewport({ width: dev.w, height: dev.h, deviceScaleFactor: dev.mobile ? 2 : 1, isMobile: dev.mobile, hasTouch: dev.mobile })
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await dismiss(page)
}
async function focusBoard(page) {
  await page.evaluate(() => { const c = document.querySelector('canvas'); if (c) { c.setAttribute('tabindex', '0'); c.focus() } })
}
async function isSettled(page) { return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]')) }
async function outcome(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-banner"]'); if (!el) return null
    const t = el.textContent || ''; if (/SECURED THE BAG/i.test(t)) return 'win'; if (/RUGGED/i.test(t)) return 'loss'; return 'unknown'
  })
}
const MOVES = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowDown', 'ArrowLeft']
async function kbRevealStep(page, i) {
  await focusBoard(page)
  await page.keyboard.press(MOVES[i % MOVES.length]); await wait(60)
  await page.keyboard.press('Enter'); await wait(450)
}
async function snap(page, name) { await page.screenshot({ path: path.join(OUT, name + '.png') }) }
async function driveWin(page, dev, world) {
  for (let attempt = 0; attempt < 30; attempt++) {
    await loadFresh(page, dev)
    await clickTestId(page, 'vault-world-card-' + world.key); await wait(200)
    await clickText(page, 'send it'); await wait(800)
    await kbRevealStep(page, 0)
    if (await isSettled(page)) continue
    await kbRevealStep(page, 1)
    if (await isSettled(page)) continue
    const took = await clickText(page, 'take profit'); await wait(900)
    if (!took) continue
    if (!(await isSettled(page))) { await wait(600) }
    if ((await outcome(page)) === 'win') return true
  }
  return false
}
async function driveLoss(page, dev, world) {
  await loadFresh(page, dev)
  await clickTestId(page, 'vault-world-card-' + world.key); await wait(200)
  await clickText(page, 'send it'); await wait(800)
  for (let i = 0; i < 45; i++) {
    await kbRevealStep(page, i)
    if (await isSettled(page)) break
  }
  return (await outcome(page)) === 'loss'
}
async function main() {
  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: __dirname, shell: true })
  let log = ''
  vite.stdout.on('data', (d) => (log += d))
  vite.stderr.on('data', (d) => (log += d))
  let browser
  const errs = []
  try {
    await waitForServer(PORT)
    await wait(500)
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
    const page = await browser.newPage()
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
    page.setDefaultTimeout(15000)
    for (const dev of DEVICES) {
      await loadFresh(page, dev)
      await snap(page, dev.name + '-00-worldpicker')
      for (const world of WORLDS) {
        await loadFresh(page, dev)
        await clickTestId(page, 'vault-world-card-' + world.key); await wait(250)
        await snap(page, dev.name + '-' + world.key + '-01-betentry')
        await clickText(page, 'send it'); await wait(900)
        await snap(page, dev.name + '-' + world.key + '-02-playing')
        await focusBoard(page); await page.keyboard.press('ArrowRight'); await wait(120)
        await snap(page, dev.name + '-' + world.key + '-03-focusring')
        const wonOk = await driveWin(page, dev, world)
        await snap(page, dev.name + '-' + world.key + '-04-settled-win' + (wonOk ? '' : '-FAILWIN'))
        await clickText(page, 'view receipt'); await wait(400)
        await snap(page, dev.name + '-' + world.key + '-05-receipt')
        const lostOk = await driveLoss(page, dev, world)
        await snap(page, dev.name + '-' + world.key + '-06-settled-loss' + (lostOk ? '' : '-FAILLOSS'))
        await clickText(page, 'view receipt'); await wait(400)
        await snap(page, dev.name + '-' + world.key + '-07-receipt-loss')
        console.log('[done] ' + dev.name + '/' + world.key + ' win=' + wonOk + ' loss=' + lostOk)
      }
    }
    console.log('[console errors] ' + errs.length)
    errs.slice(0, 25).forEach((e) => console.log('  ' + e))
  } catch (e) {
    console.error('FATAL', e); process.exitCode = 1
    console.error(log.slice(-1500))
  } finally {
    try { if (browser) await browser.close() } catch (e) {}
    killTree(vite.pid)
    console.log('[driver] shut down.')
  }
}
main()
