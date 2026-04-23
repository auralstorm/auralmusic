import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  CopyPlusIcon,
  DownloadCloudIcon,
  Heart,
  PlaySquareIcon,
} from 'lucide-react'

import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'

import {
  getMusicContextMenuDownloadHandler,
  shouldShowMusicContextMenuDownload,
} from './music-context-menu.model'
import type { MusicContextMenuProps } from './types'

const MusicContextMenu = ({
  children,
  onPlayClick,
  onAddToQueueClick,
  onToggleClick,
  onCollectToPlaylist,
  onDownload,
  coverUrl,
  artistName,
  name,
  likeStatus,
  songId,
}: MusicContextMenuProps) => {
  const downloadHandler = getMusicContextMenuDownloadHandler(onDownload)
  const showDownloadAction = shouldShowMusicContextMenuDownload(onDownload)

  const handleCollectToPlaylist = () => {
    if (!songId || !name) {
      return
    }

    onCollectToPlaylist?.({
      songId,
      songName: name,
      artistName: artistName || '未知歌手',
      coverUrl: coverUrl || '',
    })
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className='w-52.5'>
        <ContextMenuItem>
          <div className='flex w-full items-center justify-between'>
            <img
              src={resizeImageUrl(
                coverUrl,
                imageSizes.listCover.width,
                imageSizes.listCover.height
              )}
              className='mr-4 h-10 w-10 shrink-0 rounded-[12px] shadow-md'
            />
            <div className='min-w-0 flex-1'>
              <div className='text-md truncate'>{name}</div>
              <div className='text-foreground/70 truncate'>{artistName}</div>
            </div>
          </div>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onPlayClick}>
          <PlaySquareIcon size='4' />
          播放
        </ContextMenuItem>
        <ContextMenuItem onClick={onAddToQueueClick}>
          <CopyPlusIcon size='4' />
          添加到播放列表中
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onToggleClick?.()}>
          <Heart
            className={cn(
              'size-4 transition-colors',
              likeStatus ? 'fill-current text-red-500' : 'text-neutral-700'
            )}
          />
          {likeStatus ? '取消喜欢' : '喜欢'}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCollectToPlaylist}>
          <CopyPlusIcon size='4' />
          收藏到歌单
        </ContextMenuItem>
        {showDownloadAction ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={downloadHandler}>
              <DownloadCloudIcon size='4' />
              下载
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default MusicContextMenu
