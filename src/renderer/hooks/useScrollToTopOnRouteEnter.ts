import type { RefObject } from 'react'
import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

type ScrollTarget = Window | HTMLElement

export interface UseScrollToTopOnRouteEnterOptions {
  behavior?: ScrollBehavior
  enabled?: boolean
  left?: number
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

export function useScrollToTopOnRouteEnter({
  behavior = 'auto',
  enabled = true,
  left = 0,
  targetRef,
  top = 0,
}: UseScrollToTopOnRouteEnterOptions = {}) {
  const location = useLocation()

  useLayoutEffect(() => {
    if (!enabled) {
      return
    }

    const target = resolveScrollTarget(targetRef)

    if (!target) {
      return
    }

    target.scrollTo({ top, left, behavior })
  }, [
    behavior,
    enabled,
    left,
    location.key,
    location.pathname,
    location.search,
    targetRef,
    top,
  ])
}
