import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveAmllBackgroundState } from '../src/renderer/components/PlayerScene/player-background-amll.model.ts'

test('resolveAmllBackgroundState disables AMLL background when mode is off', () => {
  assert.deepEqual(
    resolveAmllBackgroundState('off', 'https://example.com/cover.jpg'),
    {
      enabled: false,
      staticMode: true,
      playing: false,
    }
  )
})

test('resolveAmllBackgroundState enables static AMLL background when mode is static and cover exists', () => {
  assert.deepEqual(
    resolveAmllBackgroundState('static', 'https://example.com/cover.jpg'),
    {
      enabled: true,
      staticMode: true,
      playing: true,
    }
  )
})

test('resolveAmllBackgroundState enables dynamic AMLL background when mode is dynamic and cover exists', () => {
  assert.deepEqual(
    resolveAmllBackgroundState('dynamic', 'https://example.com/cover.jpg'),
    {
      enabled: true,
      staticMode: false,
      playing: true,
    }
  )
})

test('resolveAmllBackgroundState disables AMLL background when cover is missing', () => {
  assert.deepEqual(resolveAmllBackgroundState('dynamic', ''), {
    enabled: false,
    staticMode: false,
    playing: false,
  })
})
