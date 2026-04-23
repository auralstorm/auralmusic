import { Application } from '@pixi/app'
import { Assets } from '@pixi/assets'
import { Container } from '@pixi/display'
import { BlurFilter } from '@pixi/filter-blur'
import { ColorMatrixFilter } from '@pixi/filter-color-matrix'
import { NoiseFilter } from '@pixi/filter-noise'
import { Filter, Texture } from '@pixi/core'
import '@pixi/events'
import { Sprite } from '@pixi/sprite'
import { useEffect, useMemo, useRef, useState } from 'react'
import { resolvePlayerSceneCoverFitMode } from './player-scene-artwork.model'
import { resolveRetroPresetPipeline } from './player-scene-retro.model'
import type { PlayerScenePixiCoverProps } from './types'

const MIN_RENDER_SIZE = 8
const NON_SQUARE_COVER_PADDING = 0.92
const NON_SQUARE_BACKDROP_ALPHA = 0.22
const WATER_RIPPLE_STRENGTH = 0.0065
const WATER_RIPPLE_FREQUENCY = 34
const WATER_RIPPLE_SPEED = 2.8
const WATER_RIPPLE_RADIUS = 0.92

function createWaterRippleFilter() {
  return new Filter(
    undefined,
    `
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform float time;
      uniform float strength;
      uniform float frequency;
      uniform float speed;
      uniform float radius;
      uniform vec2 center;

      void main(void) {
        vec2 uv = vTextureCoord;
        vec2 delta = uv - center;
        float dist = length(delta);
        float influence = smoothstep(radius, 0.0, dist);
        float waveA = sin(dist * frequency - time * speed);
        float waveB = sin(dist * (frequency * 0.58) - time * (speed * 0.66));
        float ripple = (waveA + waveB * 0.5) * strength * influence;
        vec2 direction = dist > 0.0001 ? delta / dist : vec2(0.0);
        gl_FragColor = texture2D(uSampler, uv + direction * ripple);
      }
    `,
    {
      time: 0,
      strength: 0,
      frequency: WATER_RIPPLE_FREQUENCY,
      speed: WATER_RIPPLE_SPEED,
      radius: WATER_RIPPLE_RADIUS,
      center: [0.5, 0.5],
    }
  )
}

function createVignetteCanvas(width: number, height: number, power: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(width, 1)
  canvas.height = Math.max(height, 1)
  const context = canvas.getContext('2d')

  if (!context) {
    return canvas
  }

  const centerX = width / 2
  const centerY = height / 2
  const innerRadius = Math.max(width, height) * 0.18
  const outerRadius = Math.max(width, height) * 0.72
  const gradient = context.createRadialGradient(
    centerX,
    centerY,
    innerRadius,
    centerX,
    centerY,
    outerRadius
  )

  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
  gradient.addColorStop(Math.min(0.92, power / 3), 'rgba(0, 0, 0, 0.56)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 1)')

  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  return canvas
}

function createScanlineCanvas(
  width: number,
  height: number,
  lineGap: number,
  alpha: number
) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(width, 1)
  canvas.height = Math.max(height, 1)
  const context = canvas.getContext('2d')

  if (!context) {
    return canvas
  }

  context.clearRect(0, 0, width, height)
  context.fillStyle = `rgba(0, 0, 0, ${Math.min(0.3, alpha + 0.08)})`

  const gap = Math.max(2, Math.floor(lineGap))
  for (let line = 0; line < height; line += gap) {
    context.fillRect(0, line, width, 1)
  }

  return canvas
}

function createLightLeakCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(width, 1)
  canvas.height = Math.max(height, 1)
  const context = canvas.getContext('2d')

  if (!context) {
    return canvas
  }

  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, 'rgba(255, 148, 82, 0.95)')
  gradient.addColorStop(0.45, 'rgba(255, 231, 181, 0.3)')
  gradient.addColorStop(1, 'rgba(255, 106, 145, 0.82)')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  return canvas
}

function createWearMaskCanvas(
  width: number,
  height: number,
  roughness: number
) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(width, 1)
  canvas.height = Math.max(height, 1)
  const context = canvas.getContext('2d')

  if (!context) {
    return canvas
  }

  context.clearRect(0, 0, width, height)

  const borderWidth = Math.max(12, Math.round(Math.min(width, height) * 0.045))
  const intensity = Math.min(0.9, Math.max(0.2, roughness))

  context.strokeStyle = `rgba(28, 22, 16, ${0.2 + intensity * 0.42})`
  context.lineWidth = borderWidth
  context.lineJoin = 'round'
  context.strokeRect(
    borderWidth * 0.5,
    borderWidth * 0.5,
    Math.max(width - borderWidth, 1),
    Math.max(height - borderWidth, 1)
  )

  context.fillStyle = `rgba(18, 14, 10, ${0.12 + intensity * 0.14})`
  for (let index = 0; index < 32; index += 1) {
    const edge = index % 4
    const size = borderWidth * (0.25 + ((index * 17) % 7) * 0.1)
    const offset = ((index * 53) % 100) / 100

    if (edge === 0) {
      context.fillRect(offset * width, 0, size, borderWidth * 0.65)
      continue
    }

    if (edge === 1) {
      context.fillRect(
        width - borderWidth * 0.65,
        offset * height,
        borderWidth,
        size
      )
      continue
    }

    if (edge === 2) {
      context.fillRect(
        offset * width,
        height - borderWidth * 0.65,
        size,
        borderWidth
      )
      continue
    }

    context.fillRect(0, offset * height, borderWidth * 0.65, size)
  }

  return canvas
}

function replaceOverlayTexture(
  sprite: Sprite | null,
  canvas: HTMLCanvasElement
) {
  if (!sprite) {
    return
  }

  const oldTexture = sprite.texture
  const nextTexture = Texture.from(canvas)
  sprite.texture = nextTexture

  if (
    !oldTexture.destroyed &&
    oldTexture !== Texture.WHITE &&
    oldTexture !== Texture.EMPTY
  ) {
    oldTexture.destroy(true)
  }
}

/**
 * 播放器封面统一走 Pixi，避免静态与动态封面走两条渲染链导致风格不一致。
 */
export default function PlayerScenePixiCover({
  src,
  className = '',
  shouldAnimate,
  isVisible,
  retroCoverPreset,
}: PlayerScenePixiCoverProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const rootRef = useRef<Container | null>(null)
  const backdropSpriteRef = useRef<Sprite | null>(null)
  const coverSpriteRef = useRef<Sprite | null>(null)
  const vignetteSpriteRef = useRef<Sprite | null>(null)
  const wearSpriteRef = useRef<Sprite | null>(null)
  const lightLeakSpriteRef = useRef<Sprite | null>(null)
  const scanlineSpriteRef = useRef<Sprite | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const frameTimeRef = useRef(0)
  const renderSizeRef = useRef({ width: 0, height: 0 })
  const loadRequestIdRef = useRef(0)
  const [isCoverReady, setIsCoverReady] = useState(false)
  const pipeline = useMemo(
    () => resolveRetroPresetPipeline(retroCoverPreset),
    [retroCoverPreset]
  )
  const pipelineRef = useRef(pipeline)
  pipelineRef.current = pipeline

  const colorFilterRef = useRef(new ColorMatrixFilter())
  const blurFilterRef = useRef(new BlurFilter(0))
  const noiseFilterRef = useRef(new NoiseFilter(0, 0.35))
  const rippleFilterRef = useRef(createWaterRippleFilter())

  const applyCoverLayout = () => {
    const backdropSprite = backdropSpriteRef.current
    const coverSprite = coverSpriteRef.current
    if (!backdropSprite || !coverSprite) {
      return
    }

    const { width, height } = renderSizeRef.current
    if (width < MIN_RENDER_SIZE || height < MIN_RENDER_SIZE) {
      return
    }

    const textureWidth = coverSprite.texture.width || width
    const textureHeight = coverSprite.texture.height || height
    const fitMode = resolvePlayerSceneCoverFitMode({
      textureWidth,
      textureHeight,
    })
    const coverScale = Math.max(width / textureWidth, height / textureHeight)
    const containScale =
      Math.min(width / textureWidth, height / textureHeight) *
      NON_SQUARE_COVER_PADDING

    // 长图封面保留完整主体，背景层负责补满方形舞台，避免主视觉退化成海报排版。
    backdropSprite.position.set(width / 2, height / 2)
    backdropSprite.scale.set(coverScale)
    backdropSprite.alpha = fitMode === 'contain' ? NON_SQUARE_BACKDROP_ALPHA : 0
    coverSprite.position.set(width / 2, height / 2)
    coverSprite.scale.set(fitMode === 'contain' ? containScale : coverScale)
  }

  const updateOverlayTextures = () => {
    const { width, height } = renderSizeRef.current
    if (width < MIN_RENDER_SIZE || height < MIN_RENDER_SIZE) {
      return
    }

    const { overlay } = pipelineRef.current

    replaceOverlayTexture(
      vignetteSpriteRef.current,
      createVignetteCanvas(width, height, overlay.vignettePower)
    )
    replaceOverlayTexture(
      scanlineSpriteRef.current,
      createScanlineCanvas(
        width,
        height,
        overlay.scanlineGap,
        overlay.scanlineAlpha
      )
    )
    replaceOverlayTexture(
      lightLeakSpriteRef.current,
      createLightLeakCanvas(width, height)
    )
    replaceOverlayTexture(
      wearSpriteRef.current,
      createWearMaskCanvas(width, height, overlay.wearRoughness)
    )

    if (vignetteSpriteRef.current) {
      vignetteSpriteRef.current.width = width
      vignetteSpriteRef.current.height = height
      vignetteSpriteRef.current.alpha = overlay.vignetteAlpha
    }

    if (scanlineSpriteRef.current) {
      scanlineSpriteRef.current.width = width
      scanlineSpriteRef.current.height = height
      scanlineSpriteRef.current.alpha = overlay.scanlineAlpha
    }

    if (lightLeakSpriteRef.current) {
      lightLeakSpriteRef.current.width = width
      lightLeakSpriteRef.current.height = height
      lightLeakSpriteRef.current.alpha = overlay.lightLeakAlpha
    }

    if (wearSpriteRef.current) {
      wearSpriteRef.current.width = width
      wearSpriteRef.current.height = height
      wearSpriteRef.current.alpha = overlay.wearAlpha
    }
  }

  const applyRetroFilters = () => {
    const colorFilter = colorFilterRef.current
    const blurFilter = blurFilterRef.current
    const noiseFilter = noiseFilterRef.current
    const rippleFilter = rippleFilterRef.current
    const coverSprite = coverSpriteRef.current

    if (!coverSprite) {
      return
    }

    const { color } = pipelineRef.current
    colorFilter.reset()
    if (color.tone === 'sepia') {
      colorFilter.sepia(false)
    } else if (color.tone === 'kodachrome') {
      colorFilter.kodachrome(false)
    } else if (color.tone === 'vintage') {
      colorFilter.vintage(false)
    } else if (color.tone === 'polaroid') {
      colorFilter.polaroid(false)
    }
    colorFilter.saturate(color.saturationDelta, true)
    colorFilter.contrast(color.contrastDelta, true)
    colorFilter.brightness(color.brightness, true)
    colorFilter.hue(color.hue, true)

    blurFilter.blur = pipelineRef.current.blurStrength
    noiseFilter.noise = pipelineRef.current.noiseIntensity
    coverSprite.filters = [rippleFilter, colorFilter, blurFilter, noiseFilter]
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    const app = new Application({
      width: 1,
      height: 1,
      antialias: true,
      autoDensity: true,
      backgroundAlpha: 0,
      autoStart: false,
      sharedTicker: false,
      resolution: Math.max(window.devicePixelRatio || 1, 1),
    })
    appRef.current = app
    const canvas = app.view as HTMLCanvasElement
    canvas.style.position = 'absolute'
    canvas.style.inset = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    host.appendChild(canvas)

    const root = new Container()
    rootRef.current = root
    app.stage.addChild(root)

    const backdropSprite = new Sprite(Texture.EMPTY)
    backdropSprite.anchor.set(0.5)
    backdropSpriteRef.current = backdropSprite

    const coverSprite = new Sprite(Texture.EMPTY)
    coverSprite.anchor.set(0.5)
    coverSpriteRef.current = coverSprite

    const lightLeakSprite = new Sprite(Texture.WHITE)
    lightLeakSpriteRef.current = lightLeakSprite
    const vignetteSprite = new Sprite(Texture.WHITE)
    vignetteSpriteRef.current = vignetteSprite
    const wearSprite = new Sprite(Texture.WHITE)
    wearSpriteRef.current = wearSprite
    const scanlineSprite = new Sprite(Texture.WHITE)
    scanlineSpriteRef.current = scanlineSprite

    root.addChild(backdropSprite)
    root.addChild(coverSprite)
    root.addChild(lightLeakSprite)
    root.addChild(vignetteSprite)
    root.addChild(wearSprite)
    root.addChild(scanlineSprite)

    const handleResize = () => {
      const nextWidth = Math.floor(host.clientWidth)
      const nextHeight = Math.floor(host.clientHeight)
      if (nextWidth < MIN_RENDER_SIZE || nextHeight < MIN_RENDER_SIZE) {
        return
      }

      if (
        renderSizeRef.current.width === nextWidth &&
        renderSizeRef.current.height === nextHeight
      ) {
        return
      }

      renderSizeRef.current = { width: nextWidth, height: nextHeight }
      app.renderer.resize(nextWidth, nextHeight)
      applyCoverLayout()
      updateOverlayTextures()
      applyRetroFilters()
      app.render()
    }

    resizeObserverRef.current = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserverRef.current.observe(host)
    handleResize()

    const handleTick = (delta: number) => {
      const coverSpriteNode = coverSpriteRef.current
      const rootNode = rootRef.current
      if (!coverSpriteNode || !rootNode) {
        return
      }

      frameTimeRef.current += delta
      const pipelineState = pipelineRef.current
      const noiseFilter = noiseFilterRef.current
      const rippleFilter = rippleFilterRef.current

      rippleFilter.uniforms.time = frameTimeRef.current * 0.016
      rippleFilter.uniforms.strength = WATER_RIPPLE_STRENGTH

      if (pipelineState.noiseAnimateSpeed > 0) {
        noiseFilter.seed =
          (noiseFilter.seed + delta * pipelineState.noiseAnimateSpeed) % 1
      }

      if (pipelineState.flickerAmplitude > 0) {
        rootNode.alpha =
          1 +
          Math.sin(frameTimeRef.current * 0.24) * pipelineState.flickerAmplitude
      } else {
        rootNode.alpha = 1
      }
    }

    app.ticker.add(handleTick)

    return () => {
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      app.ticker.remove(handleTick)
      app.stop()

      // 只销毁运行期生成的纹理，避免误清理 Assets 缓存中的封面纹理。
      const overlayTextures = [
        vignetteSpriteRef.current?.texture,
        wearSpriteRef.current?.texture,
        scanlineSpriteRef.current?.texture,
        lightLeakSpriteRef.current?.texture,
      ]

      overlayTextures.forEach(texture => {
        if (
          texture &&
          !texture.destroyed &&
          texture !== Texture.WHITE &&
          texture !== Texture.EMPTY
        ) {
          texture.destroy(true)
        }
      })

      app.destroy(true, {
        children: true,
        texture: false,
        baseTexture: false,
      })
      appRef.current = null
      rootRef.current = null
      backdropSpriteRef.current = null
      coverSpriteRef.current = null
      vignetteSpriteRef.current = null
      wearSpriteRef.current = null
      lightLeakSpriteRef.current = null
      scanlineSpriteRef.current = null
    }
  }, [])

  useEffect(() => {
    const app = appRef.current
    const backdropSprite = backdropSpriteRef.current
    const coverSprite = coverSpriteRef.current
    if (!app || !backdropSprite || !coverSprite || !src.trim()) {
      return
    }

    setIsCoverReady(false)
    const requestId = loadRequestIdRef.current + 1
    loadRequestIdRef.current = requestId

    const loadCoverTexture = async () => {
      try {
        const texture = await Assets.load(src)
        if (loadRequestIdRef.current !== requestId) {
          return
        }

        backdropSprite.texture = texture
        coverSprite.texture = texture
        applyCoverLayout()
        setIsCoverReady(true)
        applyRetroFilters()
        app.render()
      } catch (error) {
        if (loadRequestIdRef.current !== requestId) {
          return
        }
        console.error('load player scene cover texture failed', error)
      }
    }

    void loadCoverTexture()
  }, [src])

  useEffect(() => {
    const app = appRef.current
    if (!app || !src.trim()) {
      return
    }

    frameTimeRef.current = 0
    applyRetroFilters()
    updateOverlayTextures()
    app.render()
  }, [pipeline, src])

  useEffect(() => {
    const app = appRef.current
    if (!app || !src.trim()) {
      return
    }

    const shouldRunTicker = shouldAnimate && isVisible
    const rippleFilter = rippleFilterRef.current
    rippleFilter.uniforms.strength = shouldRunTicker ? WATER_RIPPLE_STRENGTH : 0
    rippleFilter.uniforms.time = shouldRunTicker
      ? rippleFilter.uniforms.time
      : 0

    // 场景隐藏或关闭动态效果时停帧，避免封面继续占用渲染预算。
    if (shouldRunTicker) {
      app.start()
      return
    }

    app.stop()
    app.render()
  }, [isVisible, shouldAnimate, src])

  return (
    <div
      className={`relative ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      {!isCoverReady ? (
        <div className='absolute inset-0 z-10 animate-pulse bg-black/20' />
      ) : null}
      <div ref={hostRef} className='absolute inset-0 overflow-hidden' />
    </div>
  )
}
