import type { RefObject } from 'react'
import { useCallback } from 'react'
import { useLayoutEffectOnActive } from 'keepalive-for-react'

type ScrollTarget = Window | HTMLElement

export interface UseScrollToTopOnActiveOptions {
  /** 滚动行为，默认立即回顶 */
  behavior?: ScrollBehavior
  /** 是否启用激活回顶 */
  enabled?: boolean
  /** 横向滚动目标位置 */
  left?: number
  /** 是否跳过首次挂载，缓存页通常只在重新激活时回顶 */
  skipMount?: boolean
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

function scrollTargetToPosition(
  target: ScrollTarget,
  top: number,
  left: number,
  behavior: ScrollBehavior
) {
  target.scrollTo({ top, left, behavior })
}

/**
 * KeepAlive 缓存页重新激活时回到顶部
 *
 * 普通路由进入请使用 `useScrollToTopOnRouteEnter`。这个 hook 依赖
 * keepalive-for-react 的 active 生命周期，解决缓存页不会重新 mount 的问题。
 */
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

    // 缓存页恢复时 DOM 已存在，直接滚动目标容器即可。
    scrollTargetToPosition(target, top, left, behavior)
  }, [behavior, enabled, left, targetRef, top])

  // skipMount 默认 true，避免首次进入页面时和普通路由回顶逻辑重复。
  useLayoutEffectOnActive(handleScrollToTop, [handleScrollToTop], skipMount)
}
