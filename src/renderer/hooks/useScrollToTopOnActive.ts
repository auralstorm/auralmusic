import type { RefObject } from 'react'
import { useCallback } from 'react'
import { useLayoutEffectOnActive } from 'keepalive-for-react'

type ScrollTarget = Window | HTMLElement

export interface UseScrollToTopOnActiveOptions {
  behavior?: ScrollBehavior
  enabled?: boolean
  left?: number
  skipMount?: boolean
  top?: number
  targetRef?: RefObject<HTMLElement | null>
}

function resolveScrollTarget(
  targetRef?: RefObject<HTMLElement | null>
): ScrollTarget | null {
  if (targetRef?.current) {
    return targetRef.current
  }

  if (typeof window === 'undefined') {
    return null
  }

  return window
}

function scrollTargetToPosition(
  target: ScrollTarget,
  top: number,
  left: number,
  behavior: ScrollBehavior
) {
  target.scrollTo({ top, left, behavior })
}

export function useScrollToTopOnActive({
  behavior = 'auto',
  enabled = true,
  left = 0,
  skipMount = true,
  targetRef,
  top = 0,
}: UseScrollToTopOnActiveOptions = {}) {
  const handleScrollToTop = useCallback(() => {
    if (!enabled) {
      return
    }

    const target = resolveScrollTarget(targetRef)

    if (!target) {
      return
    }

    scrollTargetToPosition(target, top, left, behavior)
  }, [behavior, enabled, left, targetRef, top])

  useLayoutEffectOnActive(handleScrollToTop, [handleScrollToTop], skipMount)
}
