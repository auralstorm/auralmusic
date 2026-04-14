import { useEffect, useState } from 'react'

import { Slider } from '@/components/ui/slider'

type PlayerSceneProgressProps = {
  disabled: boolean
  progress: number
  duration: number
  onSeek: (positionMs: number) => void
}

function formatTime(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const PlayerSceneProgress = ({
  disabled,
  progress,
  duration,
  onSeek,
}: PlayerSceneProgressProps) => {
  const [dragValue, setDragValue] = useState<number | null>(null)
  const max = Math.max(duration, 1)
  const value = Math.min(dragValue ?? progress, max)

  useEffect(() => {
    if (!disabled) {
      return
    }

    setDragValue(null)
  }, [disabled])

  const handleValueChange = (nextValue: number[]) => {
    setDragValue(nextValue[0] ?? 0)
  }

  const handleValueCommit = (nextValue: number[]) => {
    const nextPosition = nextValue[0] ?? 0

    setDragValue(null)
    onSeek(nextPosition)
  }

  return (
    <div className='w-full max-w-[480px] space-y-3'>
      <Slider
        aria-label='播放进度'
        min={0}
        max={max}
        step={1000}
        value={[value]}
        disabled={disabled || duration <= 0}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        className='[&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:bg-primary [&_[data-slot=slider-track]]:bg-primary/10 [&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-thumb]]:border-white/40 [&_[data-slot=slider-track]]:h-1.5'
      />
      <div className='flex items-center justify-between text-xs font-medium text-[var(--player-soft)] tabular-nums'>
        <span>{formatTime(value)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}

export default PlayerSceneProgress
