import { Music2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import WaterRipple3DCover from './WaterRippleCover'

type PlayerSceneArtworkProps = {
  coverUrl: string
  title: string
  artistNames: string
  isPlaying: boolean
}

const PlayerSceneArtwork = ({
  coverUrl,
  title,
  artistNames,
  isPlaying,
}: PlayerSceneArtworkProps) => {
  return (
    <section className='flex min-w-0 flex-col items-center gap-7 text-center'>
      {/* 外层控制响应式最大宽度 + 正方形比例 */}
      <div
        className={cn(
          'aspect-square w-full min-w-[360px] rounded-[20px] 2xl:min-w-[500px]',
          isPlaying && 'is-breathing'
        )}
      >
        {/* 封面容器：宽高100%，确保尺寸传递 */}
        <div className='relative h-full w-full overflow-hidden rounded-[20px] border border-white/18 bg-white/10 shadow-[0_42px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl'>
          {coverUrl ? (
            // ✅ 关键：传递 w-full h-full 强制铺满
            <WaterRipple3DCover
              src={coverUrl}
              // playBeat={isPlaying}
              className='h-full w-full'
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-white/18 to-white/6 text-white/70'>
              <Music2 className='size-20' />
            </div>
          )}
        </div>
      </div>

      {/* 文字信息 */}
      <div className='max-w-[420px] space-y-2 2xl:max-w-[500px]'>
        <h2 className='truncate text-3xl font-black tracking-tight text-[var(--player-foreground)] 2xl:py-10'>
          {title}
        </h2>
        <p className='truncate text-base text-[var(--player-muted)] 2xl:pb-5'>
          {artistNames}
        </p>
      </div>
    </section>
  )
}

export default PlayerSceneArtwork
