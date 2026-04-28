import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { resolvePlayerSceneVisualCoverUrl } from '../src/renderer/components/PlayerScene/usePlayerSceneCoverUrl.ts'

const playerSceneSource = readFileSync(
  new URL('../src/renderer/components/PlayerScene/index.tsx', import.meta.url),
  'utf8'
)

const hookSourcePath = new URL(
  '../src/renderer/components/PlayerScene/usePlayerSceneCoverUrl.ts',
  import.meta.url
)

test('player scene resolves cover through cache before passing it to WebGL based renderers', () => {
  assert.match(playerSceneSource, /usePlayerSceneCoverUrl/)
  assert.match(
    playerSceneSource,
    /const\s+visualCoverUrl\s*=\s*usePlayerSceneCoverUrl/
  )
  assert.match(
    playerSceneSource,
    /<PlayerSceneAmllBackground[\s\S]*coverUrl=\{visualCoverUrl\}/
  )
  assert.match(
    playerSceneSource,
    /<PlayerSceneArtwork[\s\S]*coverUrl=\{visualCoverUrl\}/
  )
})

test('player scene cover url hook uses electron image cache bridge', () => {
  const hookSource = readFileSync(hookSourcePath, 'utf8')

  assert.match(hookSource, /window\.electronCache\.resolveImageSource/)
  assert.match(hookSource, /player-scene-cover:/)
})

test('player scene visual cover waits for cached local media url before using remote artwork', async () => {
  const calls: string[] = []
  const resolved = await resolvePlayerSceneVisualCoverUrl({
    coverUrl: 'https://d.musicapp.migu.cn/data/oss/resource/cover.webp',
    retryDelayMs: 0,
    resolveImageSource: async (_cacheKey, sourceUrl) => {
      calls.push(sourceUrl)
      if (calls.length === 1) {
        return {
          url: sourceUrl,
          fromCache: false,
        }
      }

      return {
        url: 'auralmusic-media://local-file?path=C%3A%5Ccache%5Ccover.webp',
        fromCache: true,
      }
    },
  })

  assert.equal(calls.length, 2)
  assert.equal(
    resolved,
    'auralmusic-media://local-file?path=C%3A%5Ccache%5Ccover.webp'
  )
})
