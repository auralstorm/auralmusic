import { memo } from 'react'

import ArtistMvCard from './ArtistMvCard'
import type { ArtistMvsPanelProps } from '../types'

const ArtistMvsPanel = ({
  mvs,
  mvLoading = false,
  mvHasMore = false,
  mvSentinelRef,
  onToMvDetail,
}: ArtistMvsPanelProps) => {
  if (mvs.length === 0 && !mvLoading) {
    return (
      <div className='border-border/60 bg-card/68 text-muted-foreground rounded-[30px] border px-6 py-10 text-sm'>
        暂无 MV 内容
      </div>
    )
  }

  return (
    <>
      <div className='grid grid-cols-2 gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3'>
        {mvs.map(mv => (
          <ArtistMvCard key={mv.id} mv={mv} onClick={onToMvDetail} />
        ))}
      </div>
      <div
        ref={mvSentinelRef}
        className='text-muted-foreground flex h-16 items-center justify-center text-sm'
      >
        {mvLoading ? '正在加载更多 MV...' : null}
        {!mvLoading && !mvHasMore && mvs.length > 0 ? '没有更多 MV 了' : null}
      </div>
    </>
  )
}

export default memo(ArtistMvsPanel)
