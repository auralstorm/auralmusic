import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('header and playback control opt into the intel mac fixed surface class', async () => {
  const [headerSource, playbackControlSource] = await Promise.all([
    readFile(
      new URL('../src/renderer/components/Header/index.tsx', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL(
        '../src/renderer/components/PlaybackControl/index.tsx',
        import.meta.url
      ),
      'utf8'
    ),
  ])

  assert.match(headerSource, /app-fixed-chrome-surface/)
  assert.match(playbackControlSource, /app-fixed-chrome-surface/)
})

test('globals.css defines an intel mac fixed surface override', async () => {
  const globalsSource = await readFile(
    new URL('../src/renderer/styles/globals.css', import.meta.url),
    'utf8'
  )

  assert.match(
    globalsSource,
    /data-backdrop-blur='disabled'\] \.app-fixed-chrome-surface/
  )
})
