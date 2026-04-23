export interface ShouldRenderDynamicPlayerSceneArtworkInput {
  coverUrl: string
  dynamicCoverEnabled: boolean
  isPlaying: boolean
  isSceneOpen: boolean
}

export interface ResolvePlayerSceneCoverFitModeInput {
  textureWidth: number
  textureHeight: number
}

const SQUARE_COVER_RATIO_DELTA = 0.2

// 场景不可见时禁止连续帧更新，避免后台封面动画持续占用主线程。
export function shouldRenderDynamicPlayerSceneArtwork(
  input: ShouldRenderDynamicPlayerSceneArtworkInput
) {
  return Boolean(
    input.isSceneOpen &&
    input.isPlaying &&
    input.dynamicCoverEnabled &&
    input.coverUrl.trim().length > 0
  )
}

/**
 * 判断封面使用铺满还是完整显示，避免长图封面把播放器主视觉挤成海报比例。
 * @param input 封面原始纹理尺寸
 * @returns `cover` 保持铺满，`contain` 显示完整长图
 */
export function resolvePlayerSceneCoverFitMode(
  input: ResolvePlayerSceneCoverFitModeInput
): 'cover' | 'contain' {
  if (input.textureWidth <= 0 || input.textureHeight <= 0) {
    return 'cover'
  }

  const aspectRatio = input.textureWidth / input.textureHeight
  return Math.abs(aspectRatio - 1) <= SQUARE_COVER_RATIO_DELTA
    ? 'cover'
    : 'contain'
}
