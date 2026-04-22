import { memo } from 'react'

import ArtistAlbumCard from './ArtistAlbumCard'
import type { ArtistAlbumsPanelProps } from '../types'

const ArtistAlbumsPanel = ({
  albums,
  albumLoading = false,
  albumHasMore = false,
  albumSentinelRef,
  onToAlbumDetail,
}: ArtistAlbumsPanelProps) => {
  if (albums.length === 0 && !albumLoading) {
    return (
      <div className='border-border/60 bg-card/68 text-muted-foreground rounded-[30px] border px-6 py-10 text-sm'>
        暂无专辑内容
      </div>
    )
  }

  return (
    <>
      <div className='grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6'>
        {albums.map(album => (
          <ArtistAlbumCard
            key={album.id}
            album={album}
            onClick={onToAlbumDetail}
          />
        ))}
      </div>
      <div
        ref={albumSentinelRef}
        className='text-muted-foreground flex h-16 items-center justify-center text-sm'
      >
        {albumLoading ? '正在加载更多专辑...' : null}
        {!albumLoading && !albumHasMore && albums.length > 0
          ? '没有更多专辑了'
          : null}
      </div>
    </>
  )
}

export default memo(ArtistAlbumsPanel)
