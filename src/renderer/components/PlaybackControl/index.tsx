import { memo } from 'react'

import PlaybackPreferenceControls from './PlaybackPreferenceControls'
import PlaybackProgressBar from './PlaybackProgressBar'
import PlaybackTrackInfo from './PlaybackTrackInfo'
import PlaybackTransportControls from './PlaybackTransportControls'
import { usePlaybackControlVisibility } from './usePlaybackControlVisibility'
import { cn } from '@/lib/utils'
import { usePlaybackQueueDrawerStore } from '@/stores/playback-queue-drawer-store'
import { usePlaybackStore } from '@/stores/playback-store'

const PlaybackControl = () => {
  const hasTrack = usePlaybackStore(state => Boolean(state.currentTrack))
  const isOpen = usePlaybackStore(state => state.isPlayerSceneOpen)
  const openQueueDrawer = usePlaybackQueueDrawerStore(state => state.openDrawer)
  const { isHidden, shouldRenderLiveContent } =
    usePlaybackControlVisibility(isOpen)

  return (
    <footer
      aria-hidden={isHidden}
      className={cn(
        'app-fixed-chrome-surface window-no-drag bg-background/50 border-border/60 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur-2xl transition-[opacity,transform] duration-180 ease-out',
        isHidden
          ? 'pointer-events-none translate-y-3 opacity-0'
          : 'translate-y-0 opacity-100'
      )}
    >
      {shouldRenderLiveContent ? (
        <>
          <PlaybackProgressBar />

          <div className='grid h-18 grid-cols-[minmax(220px,1fr)_minmax(260px,420px)_minmax(220px,1fr)] items-center gap-6 px-12 xl:px-25 2xl:px-50'>
            <PlaybackTrackInfo hasTrack={hasTrack} />
            <PlaybackTransportControls />
            <PlaybackPreferenceControls onOpenQueueDrawer={openQueueDrawer} />
          </div>
        </>
      ) : null}
    </footer>
  )
}

export default memo(PlaybackControl)
