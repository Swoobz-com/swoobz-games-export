import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5784/'
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function clickText(page, text) {
  const handle = await page.evaluateHandle((t) => {
    const all = Array.from(document.querySelectorAll('button'))
    return all.find((b) => b.textContent && b.textContent.trim().toLowerCase().includes(t.toLowerCase())) || null
  }, text)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

async function cardACount(page) {
  return page.evaluate(() => document.querySelectorAll('[data-testid="vault-gutter-card-a"]').length)
}
async function gutterLeftPresent(page) {
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-gutter-left"]'))
}

async function playOneRound(page) {
  await clickText(page, 'ape in')
  await sleep(300)
  const sendIt = await page.$('[data-testid="vault-betentry-confirm"] button')
  if (sendIt) await sendIt.click()
  await sleep(400)
  await clickText(page, 'MANUAL')
  const canvas = await page.$('[data-testid="vault-canvas-shell"] canvas')
  const box = canvas ? await canvas.boundingBox() : null
  if (box) {
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await sleep(300)
    const settled = await page.$('[data-testid="vault-settled-betagain"]')
    if (!settled) await clickText(page, 'take profit')
    await sleep(400)
  }
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await sleep(400)

  const out = {}
  const debugState = () => page.evaluate(() => {
    const settled = !!document.querySelector('[data-testid="vault-settled-betagain"]')
    const playingLeft = !!document.querySelector('[data-testid="vault-playing-left"]')
    const lobbyLeft = !!document.querySelector('[data-testid="vault-lobby-left"]')
    const headerText = document.querySelector('header') ? document.querySelector('header').textContent : document.body.textContent.slice(0, 200)
    return { settled, playingLeft, lobbyLeft, headerSnippet: headerText.slice(0, 160) }
  })
  // Lobby, round 0 — history.length === 0, Card A must be ABSENT.
  out.lobby_history0 = { cardA: await cardACount(page), gutterLeft: await gutterLeftPresent(page), dbg: await debugState() }

  // Play round 1 to settle (history becomes 1 after settlement).
  await playOneRound(page)
  out.settled_round1 = { cardA: await cardACount(page), gutterLeft: await gutterLeftPresent(page), dbg: await debugState() }

  // -> new setup -> lobby again. History should now be >=1 -> Card A present, ONCE.
  const newSetupClicked = await clickText(page, 'new setup')
  await sleep(300)
  out.lobby_history1 = { cardA: await cardACount(page), gutterLeft: await gutterLeftPresent(page), newSetupClicked, dbg: await debugState() }

  // -> ape in -> playing phase, history still >=1 -> Card A present, ONCE (not mirrored right).
  const apeInClicked = await clickText(page, 'ape in')
  await sleep(300)
  const sendIt2 = await page.$('[data-testid="vault-betentry-confirm"] button')
  if (sendIt2) await sendIt2.click()
  await sleep(400)
  out.playing_history1 = { cardA: await cardACount(page), gutterLeft: await gutterLeftPresent(page), apeInClicked, dbg: await debugState() }
  await page.screenshot({ path: 'shots-rgc5-revert-reverify-0705/playing-history1-cardA.png', fullPage: true })

  await browser.close()
  console.log(JSON.stringify(out, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
