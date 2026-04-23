import { useCallback, useEffect, useRef, useState } from 'react'

import { getSubscribedMvs } from '@/api/mv'
import { useIntersectionLoadMore } from '@/hooks/useLoadMore'

import type { LibraryMvItem } from '../types'
import { normalizeLibraryMvPage } from '../library-mvs.model'
import LibraryMvCard from './LibraryMvCard'
import type { LibraryMvPanelProps } from '../types'

const PAGE_SIZE = 25

const LibraryMvPanel = ({ active, onOpen }: LibraryMvPanelProps) => {
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const hasActivatedRef = useRef(false)

  const fetchSubscribedMvs = useCallback(
    async (offset: number, limit: number) => {
      try {
        const response = await getSubscribedMvs({
          limit,
          offset,
        })

        return normalizeLibraryMvPage(response.data, {
          limit,
          offset,
        })
      } finally {
        if (offset === 0) {
          setIsInitialLoading(false)
        }
      }
    },
    []
  )

  const {
    data: mvs,
    loading,
    hasMore,
    sentinelRef,
    reset,
  } = useIntersectionLoadMore<LibraryMvItem>(fetchSubscribedMvs, {
    limit: PAGE_SIZE,
  })

  useEffect(() => {
    if (!active || hasActivatedRef.current) {
      return
    }

    hasActivatedRef.current = true
    setIsInitialLoading(true)
    reset()
  }, [active, reset])

  if (!active && mvs.length === 0) {
    return null
  }

  if (isInitialLoading && mvs.length === 0) {
    return (
      <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
        正在加载已收藏 MV...
      </div>
    )
  }

  if (!isInitialLoading && mvs.length === 0) {
    return (
      <div className='border-border/60 bg-card/70 text-muted-foreground rounded-[28px] border px-6 py-10 text-center text-sm'>
        暂无 MV 内容
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='3xl:grid-cols-5 grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4'>
        {mvs.map(mv => (
          <LibraryMvCard key={mv.id} mv={mv} onOpen={() => onOpen(mv.id)} />
        ))}
      </div>

      <div
        ref={sentinelRef}
        className='text-muted-foreground flex h-16 items-center justify-center text-sm'
      >
        {loading && !isInitialLoading ? '正在加载更多 MV...' : null}
        {!loading && !hasMore && mvs.length > 0 ? '没有更多 MV 了' : null}
      </div>
    </div>
  )
}

export default LibraryMvPanel
