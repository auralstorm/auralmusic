import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const topArtistsSource = readFileSync(
  new URL(
    '../src/renderer/pages/Home/components/TopArtists.tsx',
    import.meta.url
  ),
  'utf8'
)

test('home top artists delegates swiper autoplay state to a dedicated hook', () => {
  assert.match(topArtistsSource, /useHomeTopArtistsAutoplay/)
  assert.match(topArtistsSource, /onSwiper=\{setSwiperInstance\}/)
  assert.doesNotMatch(topArtistsSource, /isPlayerSceneOpen/)
})

test('home swiper autoplay hook drives swiper autoplay start and stop', () => {
  const hookSource = readFileSync(
    new URL(
      '../src/renderer/pages/Home/hooks/useSwiperAutoplayControl.ts',
      import.meta.url
    ),
    'utf8'
  )

  assert.match(hookSource, /export function useSwiperAutoplayControl/)
  assert.match(hookSource, /swiper\.autoplay\.stop\(\)/)
  assert.match(hookSource, /swiper\.autoplay\.start\(\)/)
})

test('home top artists autoplay pauses outside home and while the player scene is open', () => {
  const homeHookSource = readFileSync(
    new URL(
      '../src/renderer/pages/Home/hooks/useHomeTopArtistsAutoplay.ts',
      import.meta.url
    ),
    'utf8'
  )

  assert.match(homeHookSource, /useKeepAliveContext/)
  assert.match(homeHookSource, /usePlaybackStore/)
  assert.match(homeHookSource, /paused:\s*!active\s*\|\|\s*isPlayerSceneOpen/)
})
