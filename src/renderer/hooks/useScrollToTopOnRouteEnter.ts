import type { RefObject } from 'react'
import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

type ScrollTarget = Window | HTMLElement

export interface UseScrollToTopOnRouteEnterOptions {
  /** 滚动行为，默认立即回顶 */
  behavior?: ScrollBehavior
  /** 是否启用本次回顶逻辑 */
  enabled?: boolean
  /** 横向滚动目标位置 */
  left?: number
  /** 纵向滚动目标位置 */
  top?: number
  /** 指定滚动容器；不传时回退到 window */
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

/**
 * 非缓存路由进入时回到顶部
 *
 * 适用于普通 React Router 页面。依赖 location key/path/search，
 * 因此同一路径查询参数变化也会触发回顶。
 */
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

    // 使用 layout effect，避免页面先绘制旧滚动位置再跳到顶部造成闪动。
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
