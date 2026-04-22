import { memo } from 'react'

import ArtistCover from '@/components/ArtistCover'
import type { ArtistSimilarArtistsPanelProps } from '../types'

const ArtistSimilarArtistsPanel = ({
  artists,
  similarArtistsLoading = false,
  onToArtistDetail,
}: ArtistSimilarArtistsPanelProps) => {
  if (similarArtistsLoading) {
    return (
      <div className='border-border/60 bg-card/68 text-muted-foreground rounded-[30px] border px-6 py-10 text-sm'>
        正在加载相似歌手...
      </div>
    )
  }

  if (artists.length === 0) {
    return (
      <div className='border-border/60 bg-card/68 text-muted-foreground rounded-[30px] border px-6 py-10 text-sm'>
        暂无相似歌手
      </div>
    )
  }

  return (
    <div className='grid grid-cols-2 gap-10 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7'>
      {artists.map(artist => (
        <ArtistCover
          key={artist.id}
          artistCoverUrl={artist.picUrl}
          artistName={artist.name}
          rounded='full'
          onClickCover={() => onToArtistDetail(artist.id)}
        />
      ))}
    </div>
  )
}

export default memo(ArtistSimilarArtistsPanel)
