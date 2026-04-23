import type { KeyboardEvent } from 'react'
import { Play } from 'lucide-react'

import { resizeImageUrl } from '@/lib/image-url'
import { cn } from '@/lib/utils'
import type { ArtistLatestReleaseCardProps } from '../types'

const ArtistLatestReleaseCard = ({
  kindLabel,
  title,
  publishDate,
  metaLabel,
  coverUrl,
  coverWidth,
  coverHeight,
  loading = false,
  loadingText,
  emptyText,
  playAriaLabel = '打开详情',
  onOpen,
  onPlay,
}: ArtistLatestReleaseCardProps) => {
  const hasRelease = Boolean(title && coverUrl)
  const canOpen = hasRelease && Boolean(onOpen)
  const canPlay = hasRelease && Boolean(onPlay || onOpen)

  const handleOpen = () => {
    if (!canOpen) {
      return
    }

    onOpen?.()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!canOpen) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleOpen()
    }
  }

  const handlePlay = () => {
    if (!canPlay) {
      return
    }

    if (onPlay) {
      onPlay()
      return
    }

    onOpen?.()
  }

  return (
    <article
      className={cn(
        'group border-border/60 bg-card/72 flex min-h-44 gap-5 rounded-[30px] border p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition-transform duration-300',
        canOpen && 'cursor-pointer hover:-translate-y-0.5'
      )}
      onClick={canOpen ? handleOpen : undefined}
      onKeyDown={handleKeyDown}
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
    >
      {hasRelease ? (
        <>
          <div className='relative shrink-0 overflow-hidden rounded-[26px]'>
            <img
              src={resizeImageUrl(coverUrl, coverWidth, coverHeight)}
              alt={title}
              className='h-40 w-72 shrink-0 object-cover transition-transform duration-500 group-hover:scale-[1.03]'
              loading='lazy'
              decoding='async'
              draggable={false}
            />
            {canPlay ? (
              <div className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/18'>
                <div
                  aria-label={playAriaLabel}
                  onClick={event => {
                    event.preventDefault()
                    event.stopPropagation()
                    handlePlay()
                  }}
                  className='pointer-events-auto absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/12 text-white opacity-0 backdrop-blur-md transition-all duration-300 group-hover:scale-[1.04] group-hover:opacity-100 hover:bg-white/18 disabled:cursor-default disabled:opacity-45'
                >
                  <Play fill='currentColor' size={15} />
                </div>
              </div>
            ) : null}
          </div>
          <div className='flex min-w-0 flex-col justify-center gap-2'>
            <div className='text-muted-foreground text-xs font-semibold tracking-[0.28em] uppercase'>
              {kindLabel}
            </div>
            <h3 className='truncate text-2xl font-bold'>{title}</h3>
            {publishDate ? (
              <p className='text-muted-foreground text-sm'>{publishDate}</p>
            ) : null}
            {metaLabel ? (
              <p className='text-muted-foreground text-sm'>{metaLabel}</p>
            ) : null}
          </div>
        </>
      ) : (
        <div className='text-muted-foreground flex min-h-32 w-full items-center justify-center text-center text-sm'>
          {loading ? loadingText : emptyText}
        </div>
      )}
    </article>
  )
}

export default ArtistLatestReleaseCard
