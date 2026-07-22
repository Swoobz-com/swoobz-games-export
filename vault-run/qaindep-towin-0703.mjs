import puppeteer from 'puppeteer-core';
import fs from 'fs';

// INDEPENDENT verification driver — written fresh, does NOT reuse the maker's
// towin-gap-measure.mjs locator logic. Cross-checks col3 TO WIN geometry,
// computed styles (alignItems / borderLeft / paddingLeft), cyan probe, and
// screenshots, at 1440 and 1920.

const PORT = process.argv[2] || '5183';
const TAG = process.argv[3] || 'indep';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
];

function findCyan(str) {
  return /#00b8c4/i.test(str || '');
}

async function measure(browser, vp) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 700));

  // Independent path into bet-entry: click any button whose text matches
  // a world/mode CTA pattern ("ape in" is this game's specific copy but we
  // widen the matcher independently in case copy differs) OR fall back to
  // clicking the FIRST button inside a [data-testid="bet-console"] sibling
  // region if already on bet-entry.
  const clicked = await page.evaluate(() => {
    const already = document.querySelector('[data-testid="bet-console"]');
    if (already) return 'already-present';
    const btns = Array.from(document.querySelectorAll('button'));
    const cand = btns.find((b) => /ape in|play|enter|start/i.test(b.textContent || ''));
    if (cand) { cand.click(); return cand.textContent; }
    return null;
  });
  await new Promise((r) => setTimeout(r, 600));

  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="bet-console"]');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await new Promise((r) => setTimeout(r, 300));

  const data = await page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    const cs = (el, props) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const out = {};
      for (const p of props) out[p] = c[p];
      return out;
    };

    // Independent locator: walk the DOM tree structurally instead of by
    // text-content search. bet-console -> find columnsRow (direct child
    // div whose children count === 3 and whose 3rd child contains a TO WIN
    // labelled span) -> its 3rd child IS columnToWin.
    const panel = document.querySelector('[data-testid="bet-console"]');
    if (!panel) return { error: 'no bet-console panel found' };

    // columnsRow is a direct child div with exactly 3 children (columnWager,
    // columnSlot, columnToWin) OR (if columns=false) there is no such row.
    let columnsRow = null;
    for (const child of Array.from(panel.children)) {
      if (child.tagName === 'DIV' && child.children.length === 3) {
        columnsRow = child;
        break;
      }
    }
    if (!columnsRow) return { error: 'no 3-child columnsRow found (columns branch not active)' };

    const col1 = columnsRow.children[0];
    const col2 = columnsRow.children[1];
    const col3 = columnsRow.children[2];

    // Inside col3, the toWin pill is its single child div (s.toWin).
    const pill = col3.children[0] || null;
    // pill children: [labelSpan, valueSpan, subSpan?]
    const valueEl = pill ? pill.children[1] : null;
    const subEl = pill ? pill.children[2] : null;

    return {
      col2ComputedBorder: cs(col2, ['borderLeftWidth', 'borderLeftColor', 'paddingLeft']),
      col3ComputedBorder: cs(col3, ['borderLeftWidth', 'borderLeftColor', 'paddingLeft', 'alignItems', 'justifyContent']),
      column: rect(col3),
      pill: rect(pill),
      value: rect(valueEl),
      sub: rect(subEl),
      gapValueToSub: valueEl && subEl ? rect(subEl).left - rect(valueEl).right : null,
      pillFillsColumn: pill && col3 ? Math.abs(rect(pill).width - rect(col3).width) < 2 : null,
    };
  });

  // Cyan probe scoped to the whole panel subtree.
  const cyanHit = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="bet-console"]');
    if (!panel) return null;
    const all = [panel, ...panel.querySelectorAll('*')];
    const hits = [];
    for (const el of all) {
      const c = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderColor', 'borderLeftColor', 'boxShadow']) {
        const v = c[prop];
        if (v && /0,\s*184,\s*196|#00b8c4/i.test(v)) hits.push({ prop, v, tag: el.tagName });
      }
    }
    return hits;
  });

  fs.mkdirSync('shots', { recursive: true });
  await page.screenshot({ path: `shots/qaindep-towin-${TAG}-D${vp.name}.png`, fullPage: false });
  // Also a tight clip of just the panel for visual proof.
  const panelBox = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="bet-console"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
  });
  if (panelBox && panelBox.width > 0 && panelBox.height > 0) {
    await page.screenshot({ path: `shots/qaindep-towin-${TAG}-panel-D${vp.name}.png`, clip: panelBox });
  }
  await page.close();
  return { vp: vp.name, clicked, ...data, cyanHit };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = [];
  for (const vp of VIEWPORTS) {
    results.push(await measure(browser, vp));
  }
  await browser.close();
  fs.writeFileSync(`qaindep-towin-${TAG}.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
