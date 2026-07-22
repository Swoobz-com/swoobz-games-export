import { launch, wait } from './_a11yHelpers.mjs'
import fs from 'node:fs'

const OUT = 'shots-codotty-infopanel-ruleof3-0707'
fs.mkdirSync(OUT, { recursive: true })
const INFO_SEL = 'button[aria-label="How to play · Abyss Line game info"]'
const DIALOG_SEL = '[role="dialog"][aria-labelledby="abyss-info-title"]'
const HEADERS = ['THE DIVE', 'DIVE DEPTH', 'REVEAL PACE', 'HAUL', 'PROVABLY FAIR']
const ACTIONS = ['CLAIM LINE', 'RUN THE LINE']

async function openPanel(page) {
  const ok = await page.evaluate((sel) => {
    const b = document.querySelector(sel)
    if (!b) return false
    b.click()
    return true
  }, INFO_SEL)
  await wait(500)
  return ok
}

async function probe(page) {
  return page.evaluate((dlgSel, headers, actions) => {
    const dlg = document.querySelector(dlgSel)
    if (!dlg) return { error: 'no dialog' }
    const rgb = (el) => getComputedStyle(el).color
    // section headers = the eyebrow <p> elements (short all-caps, class-less)
    const ps = [...dlg.querySelectorAll('p')]
    const headerColors = headers.map((h) => {
      const p = ps.find((el) => el.textContent.trim().toUpperCase().startsWith(h))
      return { header: h, text: p ? p.textContent.trim() : null, color: p ? rgb(p) : null }
    })
    const spans = [...dlg.querySelectorAll('span')]
    const actionColors = actions.map((a) => {
      const s = spans.find((el) => el.textContent.trim() === a)
      return { action: a, color: s ? rgb(s) : null }
    })
    // RTP token: span whose text matches NN.NN%
    const rtpSpan = spans.find((el) => /^\d{2}\.\d{2}%$/.test(el.textContent.trim()))
    const rtp = rtpSpan
      ? { text: rtpSpan.textContent.trim(), color: rgb(rtpSpan), letterSpacing: getComputedStyle(rtpSpan).letterSpacing }
      : { text: null }
    // any span reading NN.N% (single decimal) = the old un-padded bug
    const oldRtp = spans.find((el) => /^\d{2}\.\d%$/.test(el.textContent.trim()))
    return { headerColors, actionColors, rtp, oldRtpPresent: !!oldRtp }
  }, DIALOG_SEL, HEADERS, ACTIONS)
}

async function run(name, viewport) {
  const { browser, page, consoleErrors } = await launch(viewport)
  const opened = await openPanel(page)
  const dlg = await page.$(DIALOG_SEL)
  if (dlg) await dlg.screenshot({ path: `${OUT}/${name}.png` })
  const data = await probe(page)
  console.log(`\n===== ${name} (${viewport.width}x${viewport.height}) opened=${opened} =====`)
  console.log(JSON.stringify(data, null, 2))
  if (consoleErrors.length) console.log('CONSOLE ERRORS:', consoleErrors)
  await browser.close()
  return data
}

const BONE = 'rgb(230, 241, 245)'
const CYAN = 'rgb(143, 242, 232)'

const d = await run('desktop-1440', { width: 1440, height: 900 })
const m = await run('mobile-412', { width: 412, height: 915 })

function verdict(tag, data) {
  const headersBone = data.headerColors.every((h) => h.color === BONE)
  const noHeaderCyan = data.headerColors.every((h) => h.color !== CYAN)
  const actionsCyan = data.actionColors.every((a) => a.color === CYAN)
  const rtpClean = data.rtp.text === '96.50%'
  const noOld = !data.oldRtpPresent
  console.log(`\n--- HOLDGATE ${tag} ---`)
  console.log('headers all BONE:', headersBone, '| no header cyan:', noHeaderCyan,
    '| action spans cyan:', actionsCyan, '| RTP == 96.50%:', rtpClean,
    '| ls:', data.rtp.letterSpacing, '| no old 96.5%:', noOld)
  return headersBone && noHeaderCyan && actionsCyan && rtpClean && noOld
}
const pd = verdict('desktop', d)
const pm = verdict('mobile', m)
console.log('\n=== OVERALL HOLDGATE:', pd && pm ? 'PASS' : 'FAIL', '===')
