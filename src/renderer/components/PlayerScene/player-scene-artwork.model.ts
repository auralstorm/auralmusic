export interface ShouldRenderDynamicPlayerSceneArtworkInput {
  coverUrl: string
  dynamicCoverEnabled: boolean
  isSceneOpen: boolean
}

export function shouldRenderDynamicPlayerSceneArtwork(
  input: ShouldRenderDynamicPlayerSceneArtworkInput
) {
  return Boolean(
    input.isSceneOpen &&
    input.dynamicCoverEnabled &&
    input.coverUrl.trim().length > 0
  )
}
