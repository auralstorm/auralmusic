import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const artworkSource = readFileSync(
  new URL(
    '../src/renderer/components/PlayerScene/PlayerSceneArtwork.tsx',
    import.meta.url
  ),
  'utf8'
)

const pixiCoverSource = readFileSync(
  new URL(
    '../src/renderer/components/PlayerScene/WaterRippleCover.tsx',
    import.meta.url
  ),
  'utf8'
)

test('player scene artwork uses the unified pixi cover component', () => {
  assert.match(
    artworkSource,
    /import PlayerScenePixiCover from '\.\/WaterRippleCover'/
  )
  assert.match(artworkSource, /<PlayerScenePixiCover/)
  assert.match(artworkSource, /shouldAnimate=\{shouldAnimateArtwork\}/)
})

test('pixi cover file no longer depends on react-three or three runtime', () => {
  assert.doesNotMatch(pixiCoverSource, /@react-three\/fiber/)
  assert.doesNotMatch(pixiCoverSource, /@react-three\/drei/)
  assert.doesNotMatch(pixiCoverSource, /@react-three\/postprocessing/)
  assert.doesNotMatch(pixiCoverSource, /from 'three'/)
})

test('pixi cover host isolates canvas from layout feedback during window resize', () => {
  assert.match(pixiCoverSource, /canvas\.style\.position = 'absolute'/)
  assert.match(pixiCoverSource, /canvas\.style\.width = '100%'/)
  assert.match(pixiCoverSource, /canvas\.style\.height = '100%'/)
  assert.match(pixiCoverSource, /canvas\.style\.display = 'block'/)
  assert.match(pixiCoverSource, /className='absolute inset-0 overflow-hidden'/)
})

test('pixi cover uses auto water ripple motion instead of pointer bulge distortion', () => {
  assert.match(pixiCoverSource, /function createWaterRippleFilter/)
  assert.doesNotMatch(pixiCoverSource, /BulgePinchFilter/)
  assert.match(
    pixiCoverSource,
    /rippleFilter\.uniforms\.strength = shouldRunTicker \?/
  )
})

test('pixi cover loads local protocol artwork through native image loading', () => {
  assert.match(
    pixiCoverSource,
    /import \{ isLocalMediaUrl \} from '\.\.\/\.\.\/\.\.\/shared\/local-media\.ts'/
  )
  assert.match(pixiCoverSource, /function loadLocalMediaTexture/)
  assert.match(pixiCoverSource, /new Image\(\)/)
  assert.match(pixiCoverSource, /if \(isLocalMediaUrl\(src\)\)/)
})
