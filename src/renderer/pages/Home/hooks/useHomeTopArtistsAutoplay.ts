import { useKeepAliveContext } from 'keepalive-for-react'

import { usePlaybackStore } from '@/stores/playback-store'
import { useSwiperAutoplayControl } from './useSwiperAutoplayControl'

export function useHomeTopArtistsAutoplay() {
  const { active } = useKeepAliveContext()
  const isPlayerSceneOpen = usePlaybackStore(state => state.isPlayerSceneOpen)

  return useSwiperAutoplayControl({
    paused: !active || isPlayerSceneOpen,
  })
}
