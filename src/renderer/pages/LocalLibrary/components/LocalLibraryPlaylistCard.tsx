import { ListMusic, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import AvatarCover from '@/components/AvatarCover'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { LocalLibraryPlaylistRecord } from '../../../../shared/local-library.ts'

interface LocalLibraryPlaylistCardProps {
  playlist: LocalLibraryPlaylistRecord
  onOpen: (playlist: LocalLibraryPlaylistRecord) => void
  onRename: (playlist: LocalLibraryPlaylistRecord) => void
  onDelete: (playlist: LocalLibraryPlaylistRecord) => void
}

const LocalLibraryPlaylistCard = ({
  playlist,
  onOpen,
  onRename,
  onDelete,
}: LocalLibraryPlaylistCardProps) => {
  return (
    <div
      className='group flex min-w-0 cursor-pointer flex-col gap-3 text-left'
      onClick={() => onOpen(playlist)}
    >
      <div className='relative overflow-hidden rounded-[22px] border border-transparent shadow-[0_18px_42px_rgba(15,23,42,0.12)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_28px_64px_rgba(15,23,42,0.18)] dark:border-white/8 dark:shadow-[0_18px_42px_rgba(0,0,0,0.24)]'>
        {playlist.coverUrl ? (
          <AvatarCover
            url={playlist.coverUrl}
            rounded='22px'
            className='w-full transition-transform duration-500 group-hover:scale-[1.04]'
            wrapperClass='aspect-square w-full overflow-hidden'
          />
        ) : (
          <div className='flex aspect-square w-full items-center justify-center rounded-[22px] bg-gradient-to-br from-[#f2ecff] via-[#eef3ff] to-[#f9f2ff] text-[#7b72ff] dark:from-[#232339] dark:via-[#1d2436] dark:to-[#231c34] dark:text-[#a69fff]'>
            <ListMusic className='size-12' />
          </div>
        )}

        <div className='absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/18' />
        <div className='absolute top-3 right-3 z-10'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                size='icon-sm'
                variant='outline'
                className='rounded-full border-white/90 bg-white/82 shadow-[0_12px_24px_rgba(15,23,42,0.08)] backdrop-blur-md hover:bg-white dark:border-white/10 dark:bg-black/20 dark:text-white dark:hover:bg-black/36'
                aria-label={`更多操作 ${playlist.name}`}
                onClick={event => event.stopPropagation()}
              >
                <MoreHorizontal className='size-3.5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='end'
              className='rounded-2xl border-white/80 bg-white/95 p-1.5 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/8 dark:bg-[#161822]/96 dark:shadow-[0_20px_40px_rgba(0,0,0,0.3)]'
              onClick={event => event.stopPropagation()}
            >
              <DropdownMenuItem
                className='rounded-xl'
                onClick={() => onRename(playlist)}
              >
                <Pencil className='size-4' />
                重命名
              </DropdownMenuItem>
              <DropdownMenuItem
                variant='destructive'
                className='rounded-xl'
                onClick={() => onDelete(playlist)}
              >
                <Trash2 className='size-4' />
                删除歌单
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className='min-w-0 space-y-1'>
        <div className='text-foreground group-hover:text-foreground/85 truncate text-[15px] font-semibold transition-colors duration-300 dark:text-white/92 dark:group-hover:text-white'>
          {playlist.name}
        </div>
        <div className='text-muted-foreground text-xs dark:text-white/40'>
          {playlist.trackCount} 首歌曲
        </div>
      </div>
    </div>
  )
}

export default LocalLibraryPlaylistCard
