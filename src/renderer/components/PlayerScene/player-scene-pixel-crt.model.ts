import type { RetroCoverPreset } from '../../../shared/config.ts'

/**
 * 根据封面显示尺寸推导街机像素块大小，保证大封面也保持明确的像素颗粒。
 */
export function resolvePixelArcadeBlockSize(input: {
  width: number
  height: number
}): number {
  const shortestEdge = Math.max(1, Math.min(input.width, input.height))
  return Math.max(6, Math.round(shortestEdge / 56))
}

/** 像素街机 CRT 与水波纹形变冲突，只保留屏幕语义的微动态。 */
export function shouldSuppressWaterRipple(preset: RetroCoverPreset): boolean {
  return preset === 'pixelArcade'
}
