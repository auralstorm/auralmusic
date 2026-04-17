import AvatarCover from '@/components/AvatarCover'
import { Button } from '@/components/ui/button'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import type { CollectPlaylistTarget } from '@/model/collect-to-playlist.model'
import { Heart, LoaderCircle, Music4, Plus } from 'lucide-react'

interface CollectToPlaylistTargetListProps {
  playlists: CollectPlaylistTarget[]
  loading: boolean
  pendingPlaylistId: number | null
  onAdd: (playlist: CollectPlaylistTarget) => void
}

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
          正在加载歌单
        </div>
      </div>
    )
  }

  if (playlists.length === 0) {
    return (
      <div className='text-muted-foreground flex flex-1 items-center justify-center px-6 py-10 text-sm'>
        暂无可添加的歌单
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
                  <span className='bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold'>
                    <Heart className='size-3 fill-current' />
                    喜欢
                  </span>
                ) : null}
              </div>
              <p className='text-muted-foreground truncate text-xs'>
                {playlist.trackCount} 首歌曲
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
              aria-label={`添加到${playlist.name}`}
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
