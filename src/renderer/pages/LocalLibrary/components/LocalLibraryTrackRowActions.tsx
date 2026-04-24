import { FolderOpen, MoreHorizontal, Play, Trash, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type {
  LocalLibraryTrackDeleteMode,
  LocalLibraryTrackRecord,
} from '../../../../shared/local-library.ts'

interface LocalLibraryTrackRowActionsProps {
  track: LocalLibraryTrackRecord
  disabled?: boolean
  onPlay: () => void
  onRevealTrack: (track: LocalLibraryTrackRecord) => void
  onDelete: (
    track: LocalLibraryTrackRecord,
    mode: LocalLibraryTrackDeleteMode
  ) => void
}

const LocalLibraryTrackRowActions = ({
  track,
  disabled = false,
  onPlay,
  onRevealTrack,
  onDelete,
}: LocalLibraryTrackRowActionsProps) => {
  return (
    <div className='flex items-center justify-start gap-2'>
      <Button
        type='button'
        size='icon-sm'
        variant='outline'
        className='rounded-full border-white/90 bg-[#fbfbff] shadow-[0_12px_24px_rgba(15,23,42,0.06)] hover:bg-white dark:border-white/8 dark:bg-white/8 dark:text-white dark:shadow-[0_12px_24px_rgba(0,0,0,0.18)] dark:hover:bg-white/12'
        aria-label={`播放 ${track.title}`}
        onClick={onPlay}
      >
        <Play className='ml-0.5 size-3.5 fill-current' />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type='button'
            size='icon-sm'
            variant='outline'
            className='rounded-full border-white/90 bg-[#fbfbff] shadow-[0_12px_24px_rgba(15,23,42,0.06)] hover:bg-white dark:border-white/8 dark:bg-white/8 dark:text-white dark:shadow-[0_12px_24px_rgba(0,0,0,0.18)] dark:hover:bg-white/12'
            aria-label={`更多操作 ${track.title}`}
            disabled={disabled}
          >
            <MoreHorizontal className='size-3.5' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='end'
          className='rounded-2xl border-white/80 bg-white/95 p-1.5 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/8 dark:bg-[#161822]/96 dark:shadow-[0_20px_40px_rgba(0,0,0,0.3)]'
        >
          <DropdownMenuItem
            className='rounded-xl'
            onClick={() => onRevealTrack(track)}
          >
            <FolderOpen className='size-4' />
            打开所在位置
          </DropdownMenuItem>
          <DropdownMenuItem
            className='rounded-xl'
            onClick={() => onDelete(track, 'library-only')}
          >
            <Trash className='size-4' />
            本地删除
          </DropdownMenuItem>
          <DropdownMenuItem
            variant='destructive'
            className='rounded-xl'
            onClick={() => onDelete(track, 'permanent')}
          >
            <Trash2 className='size-4' />
            彻底删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default LocalLibraryTrackRowActions
