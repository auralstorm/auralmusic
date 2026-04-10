import { PlayIcon } from 'lucide-react'
import AvatarCover from '../AvatarCover'

interface ArtistCoverProps {
  artistCoverUrl: string
  artistName: string
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
}: ArtistCoverProps) => {
  return (
    <div>
      <div className='relative'>
        <AvatarCover
          url={artistCoverUrl}
          rounded={rounded}
          onClickCover={onClickCover}
        />

        {onPlay ? (
          <div
            className='absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/12 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-[1.04] hover:bg-white/18 disabled:cursor-default disabled:opacity-45'
            onClick={e => {
              e.preventDefault()
              onPlay()
            }}
          >
            <PlayIcon fill='currentColor' size={15} />
          </div>
        ) : null}
      </div>
      <div className='mt-2 text-center text-[16px]'>{artistName}</div>
    </div>
  )
}

export default ArtistCover
