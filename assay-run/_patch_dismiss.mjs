import fs from 'fs'
const f='_autisk_evenlight_0706.mjs'
let s=fs.readFileSync(f,'utf8')
const anchor="  await wait(1200)\n  await page.screenshot({ path:`${OUT}/${prefix}-full.png` })"
const repl="  await wait(1200)\n  // dismiss first-run coachmark (LABYSSTOWIN: it overlaps the top of the board)\n  await page.evaluate(() => {\n    const x=[...document.querySelectorAll('button, span, div')].find(e=>{const t=(e.textContent||'').trim(); return (t==='\u00d7'||t==='x'||t==='X'||/close|dismiss|got it/i.test(t)) && e.getBoundingClientRect().width<60})\n    if(x) x.click()\n  })\n  await wait(600)\n  await page.screenshot({ path:`${OUT}/${prefix}-full.png` })"
if(!s.includes(anchor)){ console.error('ANCHOR NOT FOUND'); process.exit(1) }
s=s.replace(anchor, repl)
fs.writeFileSync(f,s)
console.log('patched')
