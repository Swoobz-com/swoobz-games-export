/* fire-unlimited.js — BROWSER snippet library for firing a clip on Higgsfield Unlimited.
 *
 * Paste the whole file into the page via javascript_tool, then call the helpers. It is NOT a node
 * script — it must run in the logged-in Higgsfield tab.
 *
 * WHY THIS EXISTS. Firing has been ad-hoc JS retyped every session, and the same small number of
 * operational rules kept being re-derived — each one after it had already cost money or hours:
 *
 *   1. Unlimited RESETS TO `Generate2418` ON EVERY RELOAD. The credit-billing button and the free
 *      one look the same. A pre-flight that asserts the label in the SAME JS TASK as the click has
 *      already blocked THREE would-be 2418-credit fires (sessions 14, 15).
 *   2. The status badge is NOT always "Processing" — it also reads "Generating", "Queued", "Starting".
 *      A poll matching only /Processing/ never went true. The widened /starting/i regex then matched
 *      the words "starting stance" inside a HISTORY CARD'S PROMPT TEXT, so it never went FALSE.
 *      => Match elements whose EXACT TRIMMED TEXT is a status word. Never substring-match the page.
 *   3. Harvest by scanning the DOM for `hf_<UTC>_<uuid>` ids. NEVER click a card's play button — it
 *      raises a "Confirm rights" terms dialog which must NOT be accepted on Tim's behalf.
 *   4. NSFW moderation LOOKS EXACTLY LIKE A SLOW RENDER. A `victory` clip was polled as "rendering"
 *      for 37 minutes before a reload surfaced an "NSFW / Credits refunded" banner. Anything
 *      materially past ~25 min gets RELOADED and read for a banner, not polled again.
 *   5. The Lexical editor SILENTLY DROPS NEWLINES WITHOUT substituting a space, joining words across
 *      every line break ("ends on" -> "endson"). build-prompt.mjs already flattens to one line so
 *      that `textContent.length === source.length` is a real gate. ASSERT IT before firing.
 *   6. Unlimited is SERIALIZED — one generation at a time, ~20-60 min each. A second fire is silently
 *      rejected with only a toast. A successful .click() is NOT evidence a job started; confirm a new
 *      card in History.
 *
 * VERIFIED vs UNVERIFIED, stated plainly: rules 1-6 above are all recorded defects from prior
 * sessions, so the LOGIC here is grounded. The DOM SELECTORS are NOT verified against the live app —
 * this file was written while the browser was logged out and could not be exercised. Every selector
 * helper therefore RETURNS NULL RATHER THAN GUESSING, and each entry point throws a labelled error
 * instead of proceeding on a bad match. Expect to fix selectors on first use; do not expect the file
 * to silently do the right thing.
 */

(() => {
  const STATUS_WORDS = ['processing', 'generating', 'queued', 'starting', 'pending', 'in progress'];
  const DONE_WORDS = ['completed', 'complete', 'done', 'ready', 'finished'];
  const FAIL_WORDS = ['failed', 'error', 'nsfw', 'rejected', 'refunded', 'moderation'];

  const txt = (el) => (el.textContent || '').trim();

  // RULE 2. Exact trimmed text only. Substring matching against the page body is what produced both
  // polling bugs: a badge that changed wording, then a prompt containing "starting stance".
  function statusElements(words) {
    const out = [];
    for (const el of document.querySelectorAll('span,div,p,button,small')) {
      if (el.children.length) continue;             // leaf nodes only — a parent contains everything
      const t = txt(el).toLowerCase();
      if (words.includes(t)) out.push({ el, text: txt(el) });
    }
    return out;
  }

  // RULE 1. Resolve the generate button AND read its label in the same call, so the caller cannot
  // hold a stale label across a reload. Returns null rather than picking a plausible-looking button.
  function generateButton() {
    const cands = [...document.querySelectorAll('button')]
      .filter((b) => /generate/i.test(txt(b)) && b.offsetParent !== null);
    if (cands.length !== 1) return null;            // ambiguous: refuse, do not guess
    return { btn: cands[0], label: txt(cands[0]).replace(/\s+/g, '') };
  }

  const api = {
    /* Report what the page currently looks like. Always run this first — it is the only way to learn
     * the real selectors, since this file's were never exercised against the live app. */
    inspect() {
      const g = generateButton();
      return {
        url: location.href,
        loggedOut: [...document.querySelectorAll('button,a')].some((b) => /^(login|sign up|log in)$/i.test(txt(b))),
        generateButton: g ? g.label : '(no unambiguous generate button found)',
        generateCandidates: [...document.querySelectorAll('button')].filter((b) => /generate/i.test(txt(b))).map(txt),
        active: statusElements(STATUS_WORDS).map((s) => s.text),
        failed: statusElements(FAIL_WORDS).map((s) => s.text),
        editors: [...document.querySelectorAll('[contenteditable="true"],textarea')].length,
      };
    },

    /* RULE 1 + RULE 5 + RULE 6, all in ONE JS task so nothing can change between check and click.
     * Throws on any doubt. Returns what it actually did. */
    fire(promptText, { expectLen } = {}) {
      if (typeof promptText !== 'string' || !promptText.length) throw new Error('fire: no prompt text');
      if (/\n/.test(promptText)) throw new Error('fire: prompt contains a NEWLINE — build-prompt.mjs flattens for a reason (rule 5)');

      // RULE 6: never fire on top of a running job.
      const running = statusElements(STATUS_WORDS);
      if (running.length) throw new Error('fire: a generation is ALREADY RUNNING (' + running.map((r) => r.text).join(',') + ') — Unlimited is serialized');

      const ed = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
      if (!ed) throw new Error('fire: no prompt editor found — run inspect() and fix the selector');

      // RULE 5: paste, then assert the length survived. Lexical drops newlines without a space.
      ed.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, promptText);
      const got = (ed.value !== undefined ? ed.value : ed.textContent) || '';
      const want = expectLen != null ? expectLen : promptText.length;
      if (got.trim().length !== want) {
        throw new Error('fire: PASTE LENGTH MISMATCH got=' + got.trim().length + ' want=' + want + ' — text was mangled, NOT firing');
      }

      // RULE 1: read the label and click in the same task. Never trust a label read earlier.
      const g = generateButton();
      if (!g) throw new Error('fire: could not resolve exactly one generate button — refusing to click');
      if (g.label !== 'GenerateUnlimited') {
        throw new Error('fire: button reads "' + g.label + '", NOT "GenerateUnlimited" — this would BILL CREDITS. Re-arm Unlimited and retry.');
      }
      g.btn.click();
      return { clicked: true, label: g.label, pastedLen: got.trim().length };
    },

    /* RULE 2 + RULE 4. Poll result. `elapsedMin` is supplied by the CALLER (the page has no memory of
     * when you fired, and Date.now() drift across reloads has bitten before). */
    status(elapsedMin) {
      const active = statusElements(STATUS_WORDS).map((s) => s.text);
      const failed = statusElements(FAIL_WORDS).map((s) => s.text);
      const done = statusElements(DONE_WORDS).map((s) => s.text);
      const out = { active, failed, done, verdict: 'unknown' };
      if (failed.length) out.verdict = 'FAILED';
      else if (active.length) out.verdict = 'RUNNING';
      else if (done.length) out.verdict = 'DONE';
      // RULE 4: past ~25 min with nothing moving, a reload is the diagnostic, not another poll.
      if (elapsedMin != null && elapsedMin > 25 && out.verdict !== 'DONE') {
        out.advice = 'RELOAD and read the page for an NSFW / refunded banner — moderation looks exactly like a slow render (rule 4). Note the reload RESETS Unlimited (rule 1).';
      }
      return out;
    },

    /* RULE 3. Harvest by id. Never clicks anything — clicking a card's play button raises the
     * "Confirm rights" dialog, which must not be accepted on Tim's behalf. */
    harvest() {
      const ids = new Set();
      const RE = /hf_\d{8}_\d{6}_[0-9a-f-]{8,}/gi;
      for (const m of (document.body.innerHTML || '').matchAll(RE)) ids.add(m[0]);
      const urls = new Set();
      for (const el of document.querySelectorAll('video,source,a')) {
        const u = el.currentSrc || el.src || el.href || '';
        if (/cloudfront|\.mp4/i.test(u)) urls.add(u);
      }
      return { ids: [...ids], urls: [...urls] };
    },
  };

  window.SF = api;
  return api.inspect();
})();
