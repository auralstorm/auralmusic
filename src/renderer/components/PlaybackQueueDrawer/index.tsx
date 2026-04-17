import { Music2, Pause, Play } from 'lucide-react'

import AvatarCover from '@/components/AvatarCover'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import { usePlaybackStore } from '@/stores/playback-store'
import { getPlaybackQueueItemState } from '../../../shared/playback.ts'

type PlaybackQueueDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PlaybackQueueDrawer = ({
  open,
  onOpenChange,
}: PlaybackQueueDrawerProps) => {
  const queue = usePlaybackStore(state => state.queue)
  const currentIndex = usePlaybackStore(state => state.currentIndex)
  const status = usePlaybackStore(state => state.status)
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)

  const hasQueue = queue.length > 0

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction='right'>
      <DrawerContent
        data-vaul-custom-container='true'
        className='border-border/70 bg-background/92 !top-[15vh] !right-4 !bottom-auto h-[70vh] w-[calc(100vw-32px)] max-w-none rounded-[28px] border p-0 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-2xl data-[vaul-drawer-direction=right]:!top-[15vh] data-[vaul-drawer-direction=right]:!right-4 data-[vaul-drawer-direction=right]:!bottom-auto data-[vaul-drawer-direction=right]:!h-[70vh] data-[vaul-drawer-direction=right]:!w-[calc(100vw-32px)] data-[vaul-drawer-direction=right]:!max-w-none data-[vaul-drawer-direction=right]:!rounded-[28px] data-[vaul-drawer-direction=right]:!border data-[vaul-drawer-direction=right]:sm:!w-[420px] data-[vaul-drawer-direction=right]:sm:!max-w-[420px]'
      >
        <DrawerHeader className='border-border/60 border-b px-5 py-4'>
          <DrawerTitle className='text-lg font-semibold'>播放列表</DrawerTitle>
          <DrawerDescription>
            {hasQueue ? `共 ${queue.length} 首歌曲` : '暂无播放列表'}
          </DrawerDescription>
        </DrawerHeader>

        {hasQueue ? (
          <div className='no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3'>
            {queue.map((track, index) => {
              const { isActive, isPlaying } = getPlaybackQueueItemState(
                index,
                currentIndex,
                status
              )

              return (
                <button
                  key={`${track.id}-${index}`}
                  type='button'
                  onClick={() => {
                    playQueueFromIndex(queue, index)
                  }}
                  className={cn(
                    'group flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
                    'hover:bg-foreground/6 focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none',
                    isActive && 'bg-primary/10 hover:bg-primary/12'
                  )}
                >
                  <AvatarCover
                    url={resizeImageUrl(
                      track.coverUrl,
                      imageSizes.listCover.width,
                      imageSizes.listCover.height
                    )}
                    className='size-12 shrink-0'
                    wrapperClass='shrink-0'
                    rounded='14px'
                    isAutoHovered={isActive}
                  />

                  <div className='min-w-0 flex-1'>
                    <div
                      className={cn(
                        'truncate text-sm font-semibold',
                        isActive ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {track.name}
                    </div>
                    <div className='text-muted-foreground truncate text-xs'>
                      {track.artistNames}
                    </div>
                  </div>

                  {isActive ? (
                    <span
                      className={cn(
                        'bg-primary/12 text-primary flex size-8 shrink-0 items-center justify-center rounded-full',
                        status === 'loading' && 'animate-pulse'
                      )}
                      aria-label={isPlaying ? '播放中' : '当前歌曲'}
                    >
                      {isPlaying ? (
                        <Pause className='size-4 fill-current' />
                      ) : (
                        <Play className='ml-0.5 size-4 fill-current' />
                      )}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : (
          <div className='flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center'>
            <div className='bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl'>
              <Music2 className='size-7' />
            </div>
            <div className='flex flex-col gap-1'>
              <p className='text-sm font-medium'>暂无播放列表</p>
              <p className='text-muted-foreground text-xs'>
                点击歌曲后会在这里显示当前播放队列
              </p>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}

export default PlaybackQueueDrawer
