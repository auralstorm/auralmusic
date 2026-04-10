import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

type AvatarCoverProps = {
  url: string
  rounded?: 'full' | string
  className?: string
  shadowClassName?: string
  isAutoHovered?: boolean
  onClickCover?: () => void
}

const AvatarCover = ({
  url,
  rounded = '15px',
  className,
  onClickCover,
  shadowClassName,
  isAutoHovered,
}: AvatarCoverProps) => {
  const [isHovered, setIsHovered] = useState(Boolean(isAutoHovered))
  const roundedStyle =
    rounded === 'full' ? 'rounded-full' : `rounded-[${rounded}]`

  return (
    <div
      className='relative cursor-pointer'
      onMouseEnter={() => !isAutoHovered && setIsHovered(true)}
      onMouseLeave={() => !isAutoHovered && setIsHovered(false)}
      onClick={onClickCover}
    >
      <img
        src={url}
        className={cn(
          roundedStyle,
          'aspect-square h-full w-full object-cover transition-all duration-300',
          className
        )}
      />

      <div
        className={cn(
          'absolute top-2 left-2 z-[-1] aspect-square w-full scale-[0.9] object-cover opacity-0 blur-lg transition-all duration-300',
          roundedStyle,
          isHovered && 'opacity-100',
          shadowClassName
        )}
        style={{ background: `url(${url})` }}
      ></div>
    </div>
  )
}

export default AvatarCover
