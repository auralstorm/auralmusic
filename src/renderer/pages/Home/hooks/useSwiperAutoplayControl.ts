import { useEffect, useState } from 'react'

interface SwiperAutoplayController {
  autoplay?: {
    start: () => void
    stop: () => void
  }
}

interface UseSwiperAutoplayControlOptions {
  paused: boolean
}

export function useSwiperAutoplayControl({
  paused,
}: UseSwiperAutoplayControlOptions) {
  const [swiperInstance, setSwiperInstance] =
    useState<SwiperAutoplayController | null>(null)

  useEffect(() => {
    const swiper = swiperInstance

    if (!swiper?.autoplay) {
      return
    }

    if (paused) {
      swiper.autoplay.stop()
      return
    }

    swiper.autoplay.start()
  }, [paused, swiperInstance])

  useEffect(() => {
    const swiper = swiperInstance

    return () => {
      swiper?.autoplay?.stop()
    }
  }, [swiperInstance])

  return {
    setSwiperInstance,
  }
}
