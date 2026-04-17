import { Play } from 'lucide-react'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { Button } from '../ui/button'

interface CoverCardData {
  id?: number | string
  coverImgUrl?: string
  count?: number | string
  name?: string
}

interface CoverCardProps {
  data?: CoverCardData
  isResize?: boolean
  onOpen?: (id: number | string) => void
  onPlay?: (id: number | string) => void
}

const CoverCard = ({
  data = {},
  onOpen,
  onPlay,
  isResize = true,
}: CoverCardProps) => {
  const { coverImgUrl, count, name, id } = data
  const coverUrl = isResize
    ? resizeImageUrl(
        coverImgUrl,
        imageSizes.cardCover.width,
        imageSizes.cardCover.height
      )
    : coverImgUrl

  return (
    <div>
      <div
        className='group flex aspect-square cursor-pointer items-center justify-center rounded-[15px] bg-cover bg-center bg-no-repeat shadow-md transition-shadow duration-300 group-hover:shadow-md group-hover:shadow-black/20'
        style={{
          backgroundImage: `url(${coverUrl})`,
        }}
        onClick={() => {
          if (id !== undefined) {
            onOpen?.(id)
          }
        }}
      >
        <div className='relative inset-0 h-full w-full rounded-[15px] bg-black/0 transition-all duration-300 group-hover:bg-black/30'>
          <Button
            type='button'
            size='icon'
            className='absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/18 bg-white/12 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100'
            onClick={event => {
              event.stopPropagation()
              if (id !== undefined) {
                onPlay?.(id)
              }
            }}
          >
            <Play className='ml-0.5 size-4 fill-current' />
          </Button>
        </div>
      </div>
      <div>{count}</div>
      <div className='mt-2 text-sm font-bold'>{name}</div>
    </div>
  )
}

export default CoverCard
