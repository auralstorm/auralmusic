import { Music2 } from 'lucide-react'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import { shouldRenderDynamicPlayerSceneArtwork } from './player-scene-artwork.model'
import PlayerScenePixiCover from './WaterRippleCover'
import type { PlayerSceneArtworkProps } from './types'
import { memo } from 'react'

const PlayerSceneArtwork = ({
  coverUrl,
  title,
  artistNames,
  isPlaying,
  dynamicCoverEnabled,
  retroCoverPreset,
  isSceneOpen,
}: PlayerSceneArtworkProps) => {
  const sizedCoverUrl = resizeImageUrl(
    coverUrl,
    imageSizes.playerCover.width,
    imageSizes.playerCover.height
  )
  const shouldAnimateArtwork = shouldRenderDynamicPlayerSceneArtwork({
    coverUrl,
    dynamicCoverEnabled,
    isPlaying,
    isSceneOpen,
  })

  return (
    <section className='flex min-w-0 flex-col items-center gap-6 text-center 2xl:gap-15'>
      {/* 外层控制响应式最大宽度 + 正方形比例 */}
      <div
        className={cn(
          'aspect-square max-w-[500px] min-w-[280px] rounded-[20px]',
          isPlaying && 'is-breathing'
        )}
        style={{
          width: 'clamp(280px, min(38vw, calc(100dvh - 420px)), 500px)',
        }}
      >
        {/* 封面容器：宽高100%，确保尺寸传递 */}
        <div className='relative h-full w-full overflow-hidden rounded-[20px] border border-white/18 bg-white/10 shadow-[0_42px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl'>
          {coverUrl ? (
            <PlayerScenePixiCover
              src={sizedCoverUrl}
              className='h-full w-full'
              shouldAnimate={shouldAnimateArtwork}
              isVisible={isSceneOpen}
              retroCoverPreset={retroCoverPreset}
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-white/18 to-white/6 text-white/70'>
              <Music2 className='size-20' />
            </div>
          )}
        </div>
      </div>

      {/* 文字信息 */}
      <div className='max-w-105 space-y-2 2xl:max-w-125'>
        <h2 className='truncate text-3xl font-black tracking-tight text-(--player-foreground)'>
          {title}
        </h2>
        <p className='truncate text-base text-(--player-muted)'>
          {artistNames}
        </p>
      </div>
    </section>
  )
}

export default memo(PlayerSceneArtwork)
