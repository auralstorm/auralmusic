import { Music2 } from 'lucide-react'

import AvatarCover from '@/components/AvatarCover'
import type { LocalLibraryAlbumRecord } from '../../../../shared/local-library.ts'

interface LocalLibraryAlbumCardProps {
  album: LocalLibraryAlbumRecord
  onOpen: (album: LocalLibraryAlbumRecord) => void
}

const LocalLibraryAlbumCard = ({
  album,
  onOpen,
}: LocalLibraryAlbumCardProps) => {
  return (
    <div
      className='group flex min-w-0 flex-col gap-3 text-left'
      onClick={() => onOpen(album)}
    >
      <div className='relative overflow-hidden rounded-[22px] border border-transparent shadow-[0_18px_42px_rgba(15,23,42,0.12)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_28px_64px_rgba(15,23,42,0.18)] dark:border-white/8 dark:shadow-[0_18px_42px_rgba(0,0,0,0.24)]'>
        {album.coverUrl ? (
          <AvatarCover
            url={album.coverUrl}
            rounded='22px'
            className='w-full transition-transform duration-500 group-hover:scale-[1.04]'
            wrapperClass='aspect-square w-full overflow-hidden'
          />
        ) : (
          <div className='from-muted via-muted/90 to-muted/70 text-foreground/45 flex aspect-square w-full items-center justify-center rounded-[22px] bg-gradient-to-br'>
            <Music2 className='size-12' />
          </div>
        )}

        <div className='absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/24' />
        {/* <div
          className='absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-white/14 text-white opacity-0 shadow-none backdrop-blur-md transition-all duration-300 group-hover:opacity-100'
          onClick={event => {
            event.stopPropagation()
            onOpen(album)
          }}
        >
          <Play className='ml-0.5 size-4 fill-current' />
        </div> */}
      </div>

      <div className='min-w-0 space-y-1'>
        <div className='text-foreground group-hover:text-foreground/85 truncate text-[15px] font-semibold transition-colors duration-300 dark:text-white/92 dark:group-hover:text-white'>
          {album.name}
        </div>
        <div className='text-muted-foreground truncate text-sm dark:text-white/46'>
          {album.artistName}
        </div>
        <div className='text-muted-foreground text-xs dark:text-white/40'>
          {album.trackCount} 首歌曲
        </div>
      </div>
    </div>
  )
}

export default LocalLibraryAlbumCard
