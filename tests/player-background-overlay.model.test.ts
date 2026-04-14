import assert from 'node:assert/strict'
import test from 'node:test'

import { resolvePlayerBackgroundOverlayState } from '../src/renderer/components/PlayerScene/player-background-overlay.model.ts'

test('resolvePlayerBackgroundOverlayState disables all overlay intensities when background is off', () => {
  assert.deepEqual(
    resolvePlayerBackgroundOverlayState({
      enabled: false,
      staticMode: false,
      isDarkTheme: false,
    }),
    {
      ambientOpacity: 0,
      lyricPanelOpacity: 0,
      vignetteOpacity: 0,
      glowOpacity: 0,
      bottomOpacity: 0,
    }
  )
})

test('resolvePlayerBackgroundOverlayState uses a lighter veil for dynamic AMLL backgrounds', () => {
  assert.deepEqual(
    resolvePlayerBackgroundOverlayState({
      enabled: true,
      staticMode: false,
      isDarkTheme: false,
    }),
    {
      ambientOpacity: 0.16,
      lyricPanelOpacity: 0.3,
      vignetteOpacity: 0.18,
      glowOpacity: 0.18,
      bottomOpacity: 0.28,
    }
  )
})

test('resolvePlayerBackgroundOverlayState uses a stronger veil for static AMLL backgrounds', () => {
  assert.deepEqual(
    resolvePlayerBackgroundOverlayState({
      enabled: true,
      staticMode: true,
      isDarkTheme: false,
    }),
    {
      ambientOpacity: 0.24,
      lyricPanelOpacity: 0.42,
      vignetteOpacity: 0.24,
      glowOpacity: 0.14,
      bottomOpacity: 0.36,
    }
  )
})

test('resolvePlayerBackgroundOverlayState switches to dark-theme overlay values', () => {
  assert.deepEqual(
    resolvePlayerBackgroundOverlayState({
      enabled: true,
      staticMode: false,
      isDarkTheme: true,
    }),
    {
      ambientOpacity: 0.18,
      lyricPanelOpacity: 0.22,
      vignetteOpacity: 0.42,
      glowOpacity: 0.08,
      bottomOpacity: 0.48,
    }
  )
})

test('resolvePlayerBackgroundOverlayState uses stronger lyric readability in dark static mode', () => {
  assert.deepEqual(
    resolvePlayerBackgroundOverlayState({
      enabled: true,
      staticMode: true,
      isDarkTheme: true,
    }),
    {
      ambientOpacity: 0.22,
      lyricPanelOpacity: 0.3,
      vignetteOpacity: 0.5,
      glowOpacity: 0.06,
      bottomOpacity: 0.56,
    }
  )
})
