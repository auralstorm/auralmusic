import { DownloadCloudIcon } from 'lucide-react'
import { memo, useState } from 'react'
import { toast } from 'sonner'

import {
  createPlaybackDownloadSong,
  shouldShowPlaybackDownloadButton,
} from './model'
import {
  handleTrackDownload,
  TRACK_DOWNLOAD_TOASTS,
} from '@/components/TrackList/track-list-download.model'
import { cn } from '@/lib/utils'
import { useConfigStore } from '@/stores/config-store'
import { usePlaybackStore } from '@/stores/playback-store'

const buttonBaseClassName =
  'text-primary/72 hover:text-primary flex size-9 items-center justify-center rounded-full transition-colors hover:bg-primary/10'

const PlaybackDownloadButton = () => {
  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const downloadEnabled = useConfigStore(state => state.config.downloadEnabled)
  const downloadQuality = useConfigStore(state => state.config.downloadQuality)
  const downloadQualityPolicy = useConfigStore(
    state => state.config.downloadQualityPolicy
  )
  const [pending, setPending] = useState(false)

  if (!shouldShowPlaybackDownloadButton(downloadEnabled)) {
    return null
  }

  const handleDownload = async () => {
    if (pending) {
      return
    }

    const item = createPlaybackDownloadSong(currentTrack)
    if (!item) {
      return
    }

    const electronDownload = window.electronDownload
    if (!electronDownload) {
      toast.error(TRACK_DOWNLOAD_TOASTS.unavailable)
      return
    }

    setPending(true)
    try {
      const didEnqueue = await handleTrackDownload({
        item,
        requestedQuality: downloadQuality,
        downloadEnabled,
        downloadQualityPolicy,
        enqueueSongDownload: payload =>
          electronDownload.enqueueSongDownload(payload),
        toastError: message => toast.error(message),
      })

      if (didEnqueue) {
        toast.success(TRACK_DOWNLOAD_TOASTS.enqueued)
      }
    } catch (error) {
      console.error('enqueue current playback download failed', error)
      toast.error(TRACK_DOWNLOAD_TOASTS.enqueueFailed)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type='button'
      aria-label='下载当前歌曲'
      disabled={!currentTrack || pending}
      onClick={handleDownload}
      className={cn(
        buttonBaseClassName,
        (!currentTrack || pending) &&
          'cursor-not-allowed opacity-45 hover:bg-transparent'
      )}
    >
      <DownloadCloudIcon className='size-5' />
    </button>
  )
}

export default memo(PlaybackDownloadButton)
