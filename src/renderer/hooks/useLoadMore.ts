import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * IntersectionObserver 分页加载钩子
 * @param fetchFn 基于 offset/limit 的分页请求
 * @param options.limit 单页数量，默认 50
 * @param options.threshold 哨兵元素进入视口比例，默认 0.1
 * @returns 分页数据、加载状态和哨兵节点 ref
 *
 * 调用方负责保证 fetchFn 引用稳定；筛选条件变化后调用 reset，
 * hook 会让旧请求自然失效，避免旧分页结果混入新列表。
 */
export function useIntersectionLoadMore<T>(
  fetchFn: (
    offset: number,
    limit: number
  ) => Promise<{ list: T[]; hasMore: boolean }>,
  options: {
    limit?: number
    threshold?: number
  } = {}
) {
  const { limit = 50, threshold = 0.1 } = options

  const [data, setData] = useState<T[]>([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  // resetVersion 只用于 reset 后触发一次首屏补拉，不参与接口参数。
  const [resetVersion, setResetVersion] = useState(0)

  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(
    null
  )
  // 请求版本号用于淘汰 reset 前发出的旧请求。
  const requestVersionRef = useRef(0)
  // 用 ref 做同步锁，避免 React 状态批处理期间连续触发多次 loadMore。
  const loadingRef = useRef(false)
  // 跳过首次自动补拉，让调用方可以选择首屏是否主动加载。
  const canBootstrapRef = useRef(false)

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    // callback ref 写入 state，方便 sentinel 节点变化时重建 observer。
    setSentinelElement(node)
  }, [])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current) return

    const requestVersion = requestVersionRef.current
    loadingRef.current = true
    setLoading(true)

    try {
      const result = await fetchFn(offset, limit)
      if (requestVersion !== requestVersionRef.current) {
        return
      }

      if (result.list.length === 0) {
        // 空页视为没有更多，避免哨兵仍在视口内时持续请求空页。
        setHasMore(false)
        return
      }

      setData(prev => [...prev, ...result.list])
      setOffset(prev => prev + limit)
      setHasMore(result.hasMore !== false)
    } catch (error) {
      if (requestVersion !== requestVersionRef.current) {
        return
      }

      console.error('加载更多失败', error)
      setHasMore(false)
    } finally {
      if (requestVersion === requestVersionRef.current) {
        loadingRef.current = false
        setLoading(false)
      }
    }
  }, [fetchFn, hasMore, limit, offset])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (entry.isIntersecting && hasMore && !loading) {
          // 哨兵进入视口即请求下一页；loadMore 内部还有同步锁兜底。
          void loadMore()
        }
      },
      { threshold }
    )

    if (sentinelElement) {
      observer.observe(sentinelElement)
    }

    return () => {
      if (sentinelElement) {
        observer.unobserve(sentinelElement)
      }
    }
  }, [hasMore, loadMore, loading, sentinelElement, threshold])

  useEffect(() => {
    if (!canBootstrapRef.current) {
      canBootstrapRef.current = true
      return
    }

    if (offset === 0 && data.length === 0 && hasMore && !loading) {
      // reset 后列表为空且仍有更多数据时，主动拉第一页恢复首屏内容。
      void loadMore()
    }
  }, [data.length, hasMore, loadMore, loading, offset, resetVersion])

  const reset = useCallback(() => {
    // reset 后让旧请求自然失效，避免筛选条件切换时旧分页结果追加到新列表。
    requestVersionRef.current += 1
    loadingRef.current = false
    setData([])
    setOffset(0)
    setHasMore(true)
    setLoading(false)
    setResetVersion(prev => prev + 1)
  }, [])

  return {
    data,
    loading,
    hasMore,
    sentinelRef,
    reset,
    loadMore,
  }
}
