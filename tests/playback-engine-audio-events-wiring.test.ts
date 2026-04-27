import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

test('playback engine audio events suppress runtime progress sync while track loading is in progress', async () => {
  const source = await readFile(
    fileURLToPath(
      new URL(
        '../src/renderer/components/PlaybackControl/usePlaybackEngineAudioEvents.ts',
        import.meta.url
      )
    ),
    'utf8'
  )

  assert.match(source, /shouldApplyRuntimePlaybackProgress/)
  assert.match(source, /status:\s*playbackState\.status/)
})

test('playback track loader does not overwrite runtime metadata duration with zero', async () => {
  const source = await readFile(
    fileURLToPath(
      new URL(
        '../src/renderer/components/PlaybackControl/usePlaybackEngineTrackLoader.ts',
        import.meta.url
      )
    ),
    'utf8'
  )

  assert.match(
    source,
    /const\s+resolvedDuration\s*=\s*result\.time\s*\|\|\s*track\.duration/
  )
  assert.match(source, /if\s*\(\s*resolvedDuration\s*>\s*0\s*\)/)
  assert.doesNotMatch(
    source,
    /setDuration\(\s*result\.time\s*\|\|\s*track\.duration\s*\)/
  )
})
