import { memo, useMemo } from 'react'

import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { resolvePlayerArtworkStyleComponent } from './artwork-styles/registry'
import { shouldRenderDynamicPlayerSceneArtwork } from './player-scene-artwork.model'
import type { PlayerSceneArtworkProps } from './types'

const PlayerSceneArtwork = (props: PlayerSceneArtworkProps) => {
  const {
    coverUrl,
    dynamicCoverEnabled,
    isPlaying,
    isSceneOpen,
    playerArtworkStyle,
  } = props
  const sizedCoverUrl = resizeImageUrl(
    coverUrl,
    imageSizes.playerCover.width,
    imageSizes.playerCover.height
  )
  const shouldAnimateArtwork = shouldRenderDynamicPlayerSceneArtwork({
    coverUrl,
    dynamicCoverEnabled,
    isPlaying,
    isSceneOpen,
  })
  const ArtworkStyleComponent = useMemo(
    () => resolvePlayerArtworkStyleComponent(playerArtworkStyle),
    [playerArtworkStyle]
  )

  return (
    <ArtworkStyleComponent
      {...props}
      sizedCoverUrl={sizedCoverUrl}
      shouldAnimateArtwork={shouldAnimateArtwork}
    />
  )
}

export default memo(PlayerSceneArtwork)
