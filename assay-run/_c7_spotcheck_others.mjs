import puppeteer from 'puppeteer-core'
import { EXE, URL, wait, reachPlanning, clickText } from './_a11yHelpers.mjs'

async function main() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
  const page = (await browser.pages())[0]
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await wait(500)

  const out = {}

  // 1) aria-live region present
  out.ariaLiveRegions = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-live]')].map(el => ({ tag: el.tagName, live: el.getAttribute('aria-live'), text: el.textContent?.slice(0,80) }))
  )

  // 2) Keyboard-only nav: Tab into ENTER THE DIVE, activate with Enter
  await page.keyboard.press('Tab')
  let active = await page.evaluate(() => document.activeElement?.textContent?.trim())
  let tabs = 0
  while (active && !active.includes('ENTER THE DIVE') && tabs < 15) {
    await page.keyboard.press('Tab')
    active = await page.evaluate(() => document.activeElement?.textContent?.trim())
    tabs++
  }
  out.foundEnterDiveViaTab = { active, tabs }
  await page.keyboard.press('Enter')
  await wait(400)
  out.afterEnterUrlPhaseText = (await page.evaluate(() => document.body.innerText)).slice(0, 60)

  // 3) Focus indicator check on a real focusable control (RUN THE LINE / a tier button)
  await page.keyboard.press('Tab')
  const focusRing = await page.evaluate(() => {
    const el = document.activeElement
    if (!el) return null
    const cs = getComputedStyle(el)
    return { tag: el.tagName, text: el.textContent?.slice(0,30), outline: cs.outline, outlineWidth: cs.outlineWidth, boxShadow: cs.boxShadow.slice(0,80) }
  })
  out.focusRingSample = focusRing

  // 4) aria-live text changes after a state transition (paint via keyboard not trivial;
  //    just re-check aria-live content differs from initial after entering planning)
  out.ariaLiveAfterPlanning = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-live]')].map(el => el.textContent?.slice(0,80))
  )

  console.log(JSON.stringify(out, null, 2))
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
