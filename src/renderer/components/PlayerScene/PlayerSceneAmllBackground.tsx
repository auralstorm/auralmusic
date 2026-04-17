import { BackgroundRender } from '@applemusic-like-lyrics/react'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'

type PlayerSceneAmllBackgroundProps = {
  coverUrl: string
  playing: boolean
  hasLyrics: boolean
  enabled: boolean
  staticMode: boolean
}

const PlayerSceneAmllBackground = ({
  coverUrl,
  playing,
  hasLyrics,
  enabled,
  staticMode,
}: PlayerSceneAmllBackgroundProps) => {
  if (!enabled || !coverUrl) {
    return null
  }

  return (
    <div
      aria-hidden='true'
      className='absolute inset-0 scale-110 overflow-hidden opacity-[var(--player-cover-opacity)]'
    >
      <BackgroundRender
        flowSpeed={4}
        album={resizeImageUrl(
          coverUrl,
          imageSizes.backgroundCover.width,
          imageSizes.backgroundCover.height
        )}
        playing={playing}
        hasLyric={hasLyrics}
        staticMode={staticMode}
        className='h-full w-full'
      />
    </div>
  )
}

export default PlayerSceneAmllBackground
