import type { RetroCoverPreset } from '../../../shared/config.ts'

export interface RetroColorProfile {
  tone: 'none' | 'sepia' | 'kodachrome' | 'vintage' | 'polaroid'
  saturationDelta: number
  contrastDelta: number
  brightness: number
  hue: number
}

export interface RetroOverlayProfile {
  vignetteAlpha: number
  vignettePower: number
  wearAlpha: number
  wearRoughness: number
  lightLeakAlpha: number
  scanlineAlpha: number
  scanlineGap: number
}

export interface RetroPresetPipeline {
  color: RetroColorProfile
  blurStrength: number
  noiseIntensity: number
  noiseAnimateSpeed: number
  overlay: RetroOverlayProfile
  flickerAmplitude: number
}

const RETRO_PRESET_PIPELINE_MAP: Record<RetroCoverPreset, RetroPresetPipeline> =
  {
    off: {
      color: {
        tone: 'none',
        saturationDelta: 0,
        contrastDelta: 0,
        brightness: 1,
        hue: 0,
      },
      blurStrength: 0,
      noiseIntensity: 0,
      noiseAnimateSpeed: 0,
      overlay: {
        vignetteAlpha: 0,
        vignettePower: 1.6,
        wearAlpha: 0,
        wearRoughness: 0,
        lightLeakAlpha: 0,
        scanlineAlpha: 0,
        scanlineGap: 4,
      },
      flickerAmplitude: 0,
    },
    ccd: {
      color: {
        tone: 'sepia',
        saturationDelta: -0.15, // 多降一点饱和
        contrastDelta: -0.13,
        brightness: 1.06, // 提亮高光溢出
        hue: -3,
      },
      blurStrength: 0.9,
      noiseIntensity: 0.1, // 加强颗粒
      noiseAnimateSpeed: 0.0012,
      overlay: {
        vignetteAlpha: 0.25, // 加深暗角
        vignettePower: 1.7,
        wearAlpha: 0.05,
        wearRoughness: 0,
        lightLeakAlpha: 0,
        scanlineAlpha: 0,
        scanlineGap: 4,
      },
      flickerAmplitude: 0,
    },
    kodak90s: {
      color: {
        tone: 'kodachrome',
        saturationDelta: -0.2,
        contrastDelta: -0.14,
        brightness: 0.98,
        hue: 5,
      },
      blurStrength: 1.1,
      noiseIntensity: 0.08,
      noiseAnimateSpeed: 0.001,
      overlay: {
        vignetteAlpha: 0.24,
        vignettePower: 1.75,
        wearAlpha: 0,
        wearRoughness: 0,
        lightLeakAlpha: 0,
        scanlineAlpha: 0,
        scanlineGap: 4,
      },
      flickerAmplitude: 0,
    },
    y2k: {
      color: {
        tone: 'none',
        saturationDelta: -0.08,
        contrastDelta: -0.07,
        brightness: 1.03,
        hue: -16,
      },
      blurStrength: 0.95,
      noiseIntensity: 0.1,
      noiseAnimateSpeed: 0.0016,
      overlay: {
        vignetteAlpha: 0.2,
        vignettePower: 1.8,
        wearAlpha: 0,
        wearRoughness: 0,
        lightLeakAlpha: 0.08,
        scanlineAlpha: 0,
        scanlineGap: 4,
      },
      flickerAmplitude: 0,
    },
    hkCinema: {
      color: {
        tone: 'vintage',
        saturationDelta: -0.18,
        contrastDelta: -0.16,
        brightness: 0.99,
        hue: 8,
      },
      blurStrength: 1.25,
      noiseIntensity: 0.055,
      noiseAnimateSpeed: 0.0009,
      overlay: {
        vignetteAlpha: 0.3,
        vignettePower: 1.9,
        wearAlpha: 0,
        wearRoughness: 0,
        lightLeakAlpha: 0,
        scanlineAlpha: 0,
        scanlineGap: 4,
      },
      flickerAmplitude: 0,
    },
    desaturatedFilm: {
      color: {
        tone: 'none',
        saturationDelta: -0.42,
        contrastDelta: -0.18,
        brightness: 1,
        hue: -1,
      },
      blurStrength: 0.7,
      noiseIntensity: 0.05,
      noiseAnimateSpeed: 0.0008,
      overlay: {
        vignetteAlpha: 0.16,
        vignettePower: 1.65,
        wearAlpha: 0,
        wearRoughness: 0,
        lightLeakAlpha: 0,
        scanlineAlpha: 0,
        scanlineGap: 4,
      },
      flickerAmplitude: 0,
    },
    vinylClassic: {
      color: {
        tone: 'sepia',
        saturationDelta: -0.46,
        contrastDelta: -0.2,
        brightness: 0.96,
        hue: 4,
      },
      blurStrength: 1.08,
      noiseIntensity: 0.11,
      noiseAnimateSpeed: 0.0011,
      overlay: {
        vignetteAlpha: 0.34,
        vignettePower: 2.06,
        wearAlpha: 0.28,
        wearRoughness: 0.72,
        lightLeakAlpha: 0,
        scanlineAlpha: 0,
        scanlineGap: 4,
      },
      flickerAmplitude: 0,
    },
    crt: {
      color: {
        tone: 'none',
        saturationDelta: -0.09,
        contrastDelta: -0.1,
        brightness: 0.97,
        hue: -5,
      },
      blurStrength: 1.35,
      noiseIntensity: 0.075,
      noiseAnimateSpeed: 0.0016,
      overlay: {
        vignetteAlpha: 0.26,
        vignettePower: 1.95,
        wearAlpha: 0,
        wearRoughness: 0,
        lightLeakAlpha: 0,
        scanlineAlpha: 0.13,
        scanlineGap: 3,
      },
      // 频闪强度故意保持温和，避免长时间播放导致视觉疲劳。
      flickerAmplitude: 0.035,
    },
    polaroid: {
      color: {
        tone: 'polaroid',
        saturationDelta: -0.06,
        contrastDelta: -0.11,
        brightness: 1.08,
        hue: 3,
      },
      blurStrength: 0.92,
      noiseIntensity: 0.05,
      noiseAnimateSpeed: 0.001,
      overlay: {
        vignetteAlpha: 0.18,
        vignettePower: 1.68,
        wearAlpha: 0,
        wearRoughness: 0,
        lightLeakAlpha: 0.12,
        scanlineAlpha: 0,
        scanlineGap: 4,
      },
      flickerAmplitude: 0,
    },
  }

function cloneRetroPresetPipeline(
  pipeline: RetroPresetPipeline
): RetroPresetPipeline {
  return {
    ...pipeline,
    color: { ...pipeline.color },
    overlay: { ...pipeline.overlay },
  }
}

/**
 * 统一由模型层输出预设参数，避免渲染层散落硬编码导致风格不可控。
 */
export function resolveRetroPresetPipeline(
  preset: RetroCoverPreset
): RetroPresetPipeline {
  // 返回副本，避免后续运行时调参误改预设基线。
  return cloneRetroPresetPipeline(RETRO_PRESET_PIPELINE_MAP[preset])
}
