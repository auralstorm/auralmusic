import AvatarCover from '@/components/AvatarCover'
import { Button } from '@/components/ui/button'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import { Heart, LoaderCircle, Music4, Plus } from 'lucide-react'
import type { CollectToPlaylistTargetListProps } from '../types'

const COLLECT_PLAYLIST_LOADING_LABEL = '\u6b63\u5728\u52a0\u8f7d\u6b4c\u5355'
const COLLECT_PLAYLIST_EMPTY_LABEL =
  '\u6682\u65e0\u53ef\u6dfb\u52a0\u7684\u6b4c\u5355'
const COLLECT_PLAYLIST_LIKED_BADGE = '\u559c\u6b22'
const COLLECT_PLAYLIST_TRACK_COUNT_SUFFIX = '\u9996\u6b4c\u66f2'

const CollectToPlaylistTargetList = ({
  playlists,
  loading,
  pendingPlaylistId,
  onAdd,
}: CollectToPlaylistTargetListProps) => {
  if (loading) {
    return (
      <div className='flex flex-1 items-center justify-center px-6 py-10'>
        <div className='text-muted-foreground flex items-center gap-2 text-sm'>
          <LoaderCircle className='size-4 animate-spin' />
          {COLLECT_PLAYLIST_LOADING_LABEL}
        </div>
      </div>
    )
  }

  if (playlists.length === 0) {
    return (
      <div className='text-muted-foreground flex flex-1 items-center justify-center px-6 py-10 text-sm'>
        {COLLECT_PLAYLIST_EMPTY_LABEL}
      </div>
    )
  }

  return (
    <div className='no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-4'>
      {playlists.map(playlist => {
        const isPending = pendingPlaylistId === playlist.id

        return (
          <div
            key={playlist.id}
            className='hover:bg-foreground/5 flex items-center gap-3 rounded-[22px] px-2 py-2 transition-colors'
          >
            {playlist.coverImgUrl ? (
              <AvatarCover
                url={resizeImageUrl(
                  playlist.coverImgUrl,
                  imageSizes.listCover.width,
                  imageSizes.listCover.height
                )}
                className='size-12 shrink-0'
                wrapperClass='shrink-0'
                rounded='16px'
              />
            ) : (
              <div className='bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-[16px]'>
                <Music4 className='size-5' />
              </div>
            )}

            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2'>
                <p className='truncate text-sm font-semibold'>
                  {playlist.name}
                </p>
                {playlist.isLikedPlaylist ? (
                  <span className='bg-primary/10 text-primary inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold'>
                    <Heart className='size-3 fill-current' />
                    {COLLECT_PLAYLIST_LIKED_BADGE}
                  </span>
                ) : null}
              </div>
              <p className='text-muted-foreground truncate text-xs'>
                {playlist.trackCount} {COLLECT_PLAYLIST_TRACK_COUNT_SUFFIX}
              </p>
            </div>

            <Button
              type='button'
              variant='ghost'
              size='icon'
              disabled={isPending}
              onClick={() => onAdd(playlist)}
              className={cn(
                'text-primary hover:bg-primary/10 size-9 rounded-full',
                isPending && 'opacity-70'
              )}
              aria-label={`\u6dfb\u52a0\u5230 ${playlist.name}`}
            >
              {isPending ? (
                <LoaderCircle className='size-4 animate-spin' />
              ) : (
                <Plus className='size-4' />
              )}
            </Button>
          </div>
        )
      })}
    </div>
  )
}

export default CollectToPlaylistTargetList
