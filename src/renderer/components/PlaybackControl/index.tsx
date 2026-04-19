import { memo, useCallback, useState } from 'react'

import PlaybackQueueDrawer from '@/components/PlaybackQueueDrawer'
import PlaybackPreferenceControls from './PlaybackPreferenceControls'
import PlaybackProgressBar from './PlaybackProgressBar'
import PlaybackTrackInfo from './PlaybackTrackInfo'
import PlaybackTransportControls from './PlaybackTransportControls'
import { usePlaybackStore } from '@/stores/playback-store'

const PlaybackControl = () => {
  const track = usePlaybackStore(state => state.currentTrack)
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false)
  const openQueueDrawer = useCallback(() => setIsQueueDrawerOpen(true), [])
  const isOpen = usePlaybackStore(state => state.isPlayerSceneOpen)

  // 避免在播放器打开状态下继续渲染
  if (isOpen) {
    return null
  }
  return (
    <>
      <footer className='window-no-drag bg-background/50 border-border/60 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur-2xl'>
        <PlaybackProgressBar />

        <div className='grid h-18 grid-cols-[minmax(220px,1fr)_minmax(260px,420px)_minmax(220px,1fr)] items-center gap-6 px-12 xl:px-25 2xl:px-50'>
          <PlaybackTrackInfo hasTrack={Boolean(track)} />
          <PlaybackTransportControls />
          <PlaybackPreferenceControls onOpenQueueDrawer={openQueueDrawer} />
        </div>
      </footer>

      <PlaybackQueueDrawer
        open={isQueueDrawerOpen}
        onOpenChange={setIsQueueDrawerOpen}
      />
    </>
  )
}

export default memo(PlaybackControl)
