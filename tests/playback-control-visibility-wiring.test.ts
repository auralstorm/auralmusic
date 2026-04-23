import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const playbackControlSource = readFileSync(
  new URL(
    '../src/renderer/components/PlaybackControl/index.tsx',
    import.meta.url
  ),
  'utf8'
)

test('playback control keeps a shell mounted and delegates player scene visibility to a dedicated hook', () => {
  assert.match(playbackControlSource, /usePlaybackControlVisibility/)
  assert.doesNotMatch(
    playbackControlSource,
    /if\s*\(\s*isOpen\s*\)\s*\{\s*return null/
  )
  assert.match(playbackControlSource, /aria-hidden=\{isHidden\}/)
  assert.match(playbackControlSource, /shouldRenderLiveContent\s*\?/)
})

test('playback control visibility hook delays live content unmount while the shell fades out', () => {
  const hookSource = readFileSync(
    new URL(
      '../src/renderer/components/PlaybackControl/usePlaybackControlVisibility.ts',
      import.meta.url
    ),
    'utf8'
  )

  assert.match(hookSource, /PLAYBACK_CONTROL_VISUAL_EXIT_DURATION_MS\s*=\s*180/)
  assert.match(hookSource, /setShouldRenderLiveContent\(true\)/)
  assert.match(hookSource, /window\.setTimeout/)
  assert.match(hookSource, /setShouldRenderLiveContent\(false\)/)
})
