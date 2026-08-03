// HARVEST — poll the derived CloudFront URL for a finished Higgsfield job and save the mp4.
//
// WHY THIS EXISTS (phase 142). The result URL is derivable:
//   https://d8j0ntlcm91z4.cloudfront.net/<user>/hf_<YYYYMMDD>_<HHMMSS>_<jobId>.mp4
// where the timestamp is createdAt in UTC. That makes harvesting a cheap curl loop instead of
// repeated MCP polling (each show_generations/job_status reply carries the whole 7-8k-char prompt
// back, which is the single most expensive thing in a long autonomous loop).
//
// It exists as a FILE because the inline bash version silently failed twice: a `T0=$(...)` capture
// did not survive into a backgrounded `nohup bash -c '...'` subshell, the `$((T0+off))` arithmetic
// became `$(( +off ))`, every derived URL was wrong, and the poll spun happily forever while a
// FINISHED render sat on the CDN for ~10 minutes. Nothing reported an error, because a 404 is the
// poll's normal case. Same failure family as the vacuous gate: a loop whose "not yet" and whose
// "broken" look identical.
//
// So this script FAILS LOUD instead:
//   · it refuses to start unless jobId looks like a uuid and the window is sane
//   · it prints the exact window it will scan, up front
//   · on timeout it says how many URLs it tried, so "never found" cannot be mistaken for "not ready"
//
// usage:
//   node qa-boss/harvest.mjs <jobId> <outFile> [--at <unixSeconds>] [--back N] [--fwd N] [--tries N]
//     --at    centre of the timestamp scan (default: now)
//     --back  seconds before centre to scan (default 240) — createdAt is EARLIER than your capture
//     --fwd   seconds after centre (default 10)
//     --tries polling rounds, ~15s apart (default 70)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

// THE ACCOUNT IS A SCAN PARAMETER, NOT A CONSTANT (phase 229). The derived URL embeds the USER, and
// FIRE-PLAN records that the account FLIPS between sessions (at least three seen). Harvesting under
// the wrong user prefix 404s on every single URL — and a 404 is this poll's NORMAL case, so the run
// looks exactly like "not ready yet" and then reports a timeout that blames the window. That is the
// same "not-yet and broken look identical" failure the header above says this file exists to stop;
// it was hardened on the TIMESTAMP axis and left open on the ACCOUNT axis. So: --user overrides, the
// prefix is PRINTED up front beside the window, and the timeout names the account as a suspect.
const DEFAULT_USER = 'user_3HFAtp47rDRPDwG2FFOzR2CP7fn';
const CDN = 'https://d8j0ntlcm91z4.cloudfront.net';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : Number(argv[i + 1]); };
const sflag = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const USER = sflag('user', DEFAULT_USER);
// A positional is any arg that is not a --flag AND does not directly follow one. The old test
// excluded flag VALUES by /^\d+$/, which silently breaks the moment a flag takes a non-numeric
// value — `--user user_ABC` would have been swallowed as the jobId.
const [jobId, outFile] = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(jobId || '')) {
  console.error('ERROR: first argument must be a job uuid. got: ' + JSON.stringify(jobId));
  process.exit(2);
}
if (!outFile) { console.error('ERROR: second argument must be an output path'); process.exit(2); }

const at = flag('at', Math.floor(Date.now() / 1000));
const back = flag('back', 240), fwd = flag('fwd', 10), tries = flag('tries', 70);
if (!(back >= 0 && fwd >= 0 && back + fwd > 0 && back + fwd <= 3600)) {
  console.error(`ERROR: nonsensical scan window back=${back} fwd=${fwd}`); process.exit(2);
}

const stamp = (ts) => {
  const d = new Date(ts * 1000), p = (n) => String(n).padStart(2, '0');
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + '_' +
         p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds());
};
const head = (url) => (spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '-I', url],
  { encoding: 'utf8' }).stdout || '').trim();

const lo = at - back, hi = at + fwd;
console.log(`harvest ${jobId}`);
console.log(`  user   ${USER}${USER === DEFAULT_USER ? '  (default — override with --user if the account flipped)' : '  (via --user)'}`);
console.log(`  window ${lo}..${hi}  (${hi - lo + 1} timestamps)  ${stamp(lo)} .. ${stamp(hi)}`);
console.log(`  tries  ${tries} rounds, ~15s apart`);

let tried = 0;
for (let round = 1; round <= tries; round++) {
  for (let ts = lo; ts <= hi; ts++) {
    const url = `${CDN}/${USER}/hf_${stamp(ts)}_${jobId}.mp4`;
    tried++;
    if (head(url) === '200') {
      spawnSync('curl', ['-s', '-o', outFile, url]);
      const sz = fs.statSync(outFile).size;
      console.log(`READY  ts=${ts}  ${sz} bytes  round ${round}  (${tried} URLs tried)`);
      if (sz < 100000) { console.error(`ERROR: ${sz} bytes is too small to be a clip`); process.exit(3); }
      process.exit(0);
    }
  }
  if (round < tries) spawnSync('sleep', ['15']);
}
console.error(`TIMEOUT after ${tries} rounds, ${tried} URLs tried, none returned 200.`);
console.error('That means one of THREE things — it does NOT mean "not ready":');
console.error(`  1. WRONG ACCOUNT. Every URL was built under ${USER}. If the session flipped accounts,`);
console.error('     all of them 404 and this looks identical to "not finished". Read the user id out of');
console.error('     a CDN url in show_generations and re-run with --user <id>. CHECK THIS FIRST.');
console.error('  2. The window is wrong — widen with --back / --at, or read createdAt from job_status.');
console.error('  3. The job genuinely is not finished.');
process.exit(1);
