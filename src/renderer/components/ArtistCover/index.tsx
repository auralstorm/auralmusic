import { PlayIcon } from 'lucide-react'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import AvatarCover from '../AvatarCover'

interface ArtistCoverProps {
  artistCoverUrl: string
  artistName: string
  subTitle?: string
  rounded?: 'full' | string
  onPlay?: () => void
  onClickCover?: () => void
}
const ArtistCover = ({
  artistName,
  artistCoverUrl,
  onPlay,
  rounded,
  onClickCover,
  subTitle,
}: ArtistCoverProps) => {
  return (
    <div>
      <div className='group relative'>
        <AvatarCover
          url={resizeImageUrl(
            artistCoverUrl,
            imageSizes.cardCover.width,
            imageSizes.cardCover.height
          )}
          rounded={rounded}
          onClickCover={onClickCover}
        />

        {onPlay ? (
          <div
            className='absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/12 text-white opacity-0 backdrop-blur-md transition-all duration-300 group-hover:scale-[1.04] group-hover:opacity-100 hover:bg-white/18 disabled:cursor-default disabled:opacity-45'
            onClick={e => {
              e.preventDefault()
              onPlay()
            }}
          >
            <PlayIcon fill='currentColor' size={15} />
          </div>
        ) : null}
      </div>
      <div className='mt-2 truncate text-center text-[16px]'>{artistName}</div>
      {subTitle && (
        <div className='text-primary/50 mt-1 truncate text-center text-[14px]'>
          {subTitle}
        </div>
      )}
    </div>
  )
}

export default ArtistCover
