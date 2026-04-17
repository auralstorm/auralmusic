import { Button } from '@/components/ui/button'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { Play } from 'lucide-react'
import type { NewSong } from '../home.type'

interface SongItemProps {
  song: NewSong
  onPlay?: () => void
}

const SongItem = ({ song, onPlay }: SongItemProps) => {
  return (
    <div className='group hover:bg-primary/5 mb-5 flex cursor-pointer items-center rounded-md px-2 py-2 transition-all duration-500'>
      <div
        className='h-15 w-15 shrink-0 rounded-md bg-cover bg-center'
        style={{
          backgroundImage: `url(${resizeImageUrl(
            song.picUrl,
            imageSizes.listCover.width,
            imageSizes.listCover.height
          )})`,
        }}
      ></div>
      <div className='ml-5 min-w-0 flex-1'>
        <div className='truncate'>{song.name}</div>
        <div className='truncate text-sm'>{song.artist?.name}</div>
      </div>
      <Button
        type='button'
        size='icon'
        className='bg-primary text-background size-10 flex-shrink-0 scale-95 cursor-pointer rounded-full border border-white/10 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100'
        onClick={event => {
          event.stopPropagation()
          onPlay?.()
        }}
      >
        <Play className='ml-0.5 size-3 fill-current' />
      </Button>
    </div>
  )
}

export default SongItem
