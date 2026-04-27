import type { ComponentType } from 'react'
import type { PlayerArtworkStyle } from '../../../../shared/config.ts'

import DefaultArtwork from './DefaultArtwork'
import HolographicCdArtwork from './HolographicCdArtwork'
import VinylRecordArtwork from './VinylRecordArtwork'
import type { PlayerArtworkStyleComponentProps } from './types'

export const PLAYER_ARTWORK_STYLE_COMPONENTS: Record<
  PlayerArtworkStyle,
  ComponentType<PlayerArtworkStyleComponentProps>
> = {
  default: DefaultArtwork,
  vinylRecord: VinylRecordArtwork,
  holographicCd: HolographicCdArtwork,
}

export function resolvePlayerArtworkStyleComponent(style: PlayerArtworkStyle) {
  return PLAYER_ARTWORK_STYLE_COMPONENTS[style] ?? DefaultArtwork
}
