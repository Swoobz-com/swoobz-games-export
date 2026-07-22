const VAULT_FILES = [
  '/assets/raw/kenney/audio/vault/impactMetal_heavy_000.ogg',
  '/assets/raw/kenney/audio/vault/impactBell_heavy_002.ogg',
  '/assets/raw/kenney/audio/vault/tick_002.ogg',
]
const PULSE_FILES = [
  '/assets/raw/kenney/audio/pulse/impactBell_heavy_000.ogg',
  '/assets/raw/kenney/audio/pulse/impactMetal_heavy_000.ogg',
  '/assets/raw/kenney/audio/pulse/impactBell_heavy_002.ogg',
]
const PULSE_MUSIC = [
  '/assets/music/pulse/pondering-the-cosmos.ogg',
  '/assets/music/pulse/frequency-5.ogg',
  '/assets/music/pulse/void-field.ogg',
]

async function probe(origin, files, label) {
  console.log(`\n=== ${label} (${origin}) ===`)
  for (const f of files) {
    const url = origin + f
    try {
      const resp = await fetch(url)
      const buf = await resp.arrayBuffer()
      console.log(`${resp.status}\t${resp.headers.get('content-type')}\t${buf.byteLength}b\t${url}`)
    } catch (e) {
      console.log(`ERROR\t${String(e)}\t${url}`)
    }
  }
}

await probe('http://localhost:5281', VAULT_FILES, 'VAULT SFX (direct fetch)')
await probe('http://localhost:5180', PULSE_FILES, 'PULSE SFX (direct fetch)')
await probe('http://localhost:5180', PULSE_MUSIC, 'PULSE MUSIC (expected absent)')
