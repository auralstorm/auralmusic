import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const equalizerDialogSource = readFileSync(
  new URL(
    '../src/renderer/pages/Settings/components/EqualizerSettingsDialog.tsx',
    import.meta.url
  ),
  'utf8'
)

test('equalizer dialog previews through playback runtime instead of config store writes', () => {
  assert.match(
    equalizerDialogSource,
    /import\s+\{\s*playbackRuntime\s*\}\s+from\s+'@\/audio\/playback-runtime\/playback-runtime'/
  )
  assert.match(
    equalizerDialogSource,
    /const\s+applyEqualizerPreview\s*=\s*\(nextConfig:\s*EqualizerConfig\)\s*=>\s*\{[\s\S]*playbackRuntime\.applyEqualizer\(nextConfig\)/
  )
  assert.doesNotMatch(
    equalizerDialogSource,
    /function\s+setEqualizerPreview\s*\(/
  )
})

test('equalizer slider commit persists the current draft without replaying the same preview update', () => {
  assert.match(
    equalizerDialogSource,
    /onValueCommit=\{value => \{[\s\S]*void persistDraft\(draftRef\.current\)/
  )
})
