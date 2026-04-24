import { Music2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { memo, useEffect, useState } from 'react'
import { DEFAULT_AVATAR_COVER_BACKGROUND } from './model'
import type { AvatarCoverProps } from './types'

const AvatarCover = ({
  url,
  rounded = '15px',
  className,
  onClickCover,
  shadowClassName,
  isAutoHovered,
  wrapperClass,
}: AvatarCoverProps) => {
  const [isHovered, setIsHovered] = useState(Boolean(isAutoHovered))
  const [hasLoadError, setHasLoadError] = useState(!url.trim())
  const roundedStyle =
    rounded === 'full' ? 'rounded-full' : `rounded-[${rounded}]`
  const shouldRenderFallback = hasLoadError || !url.trim()

  useEffect(() => {
    // 封面地址变化后要重置错误态，否则上一次失败会把后续有效图片也一直卡在兜底图案。
    setHasLoadError(!url.trim())
  }, [url])

  return (
    <div
      className={cn('relative cursor-pointer', wrapperClass)}
      onMouseEnter={() => !isAutoHovered && setIsHovered(true)}
      onMouseLeave={() => !isAutoHovered && setIsHovered(false)}
      onClick={onClickCover}
    >
      {shouldRenderFallback ? (
        <div
          className={cn(
            roundedStyle,
            'flex aspect-square h-full w-full items-center justify-center overflow-hidden transition-all duration-300',
            className
          )}
          aria-hidden='true'
          style={{
            background: DEFAULT_AVATAR_COVER_BACKGROUND,
          }}
        >
          <Music2 className='size-[42%] text-white/82' />
        </div>
      ) : (
        <img
          src={url}
          onError={() => setHasLoadError(true)}
          className={cn(
            roundedStyle,
            'aspect-square h-full w-full object-cover transition-all duration-300',
            className
          )}
        />
      )}

      <div
        className={cn(
          'absolute top-2 left-2 z-[-1] aspect-square w-full scale-[0.9] object-cover opacity-0 blur-lg transition-all duration-300',
          roundedStyle,
          isHovered && 'opacity-100',
          shadowClassName
        )}
        style={{
          background: shouldRenderFallback
            ? DEFAULT_AVATAR_COVER_BACKGROUND
            : `url(${url})`,
        }}
      ></div>
    </div>
  )
}

export default memo(AvatarCover)
