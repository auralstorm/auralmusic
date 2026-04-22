import { memo, useState } from 'react'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ArtistMediaTabValue, ArtistMediaTabsProps } from '../types'
import ArtistAlbumsPanel from './ArtistAlbumsPanel'
import ArtistMvsPanel from './ArtistMvsPanel'
import ArtistSimilarArtistsPanel from './ArtistSimilarArtistsPanel'

const ArtistMediaTabs = ({
  albums,
  mvs,
  similarArtists,
  albumLoading = false,
  mvLoading = false,
  similarArtistsLoading = false,
  albumHasMore = false,
  mvHasMore = false,
  albumSentinelRef,
  mvSentinelRef,
  onToAlbumDetail,
  onToMvDetail,
  onToArtistDetail,
}: ArtistMediaTabsProps) => {
  const [activeTab, setActiveTab] = useState<ArtistMediaTabValue>('albums')

  return (
    <section className='space-y-5'>
      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as ArtistMediaTabValue)}
        className='gap-5'
      >
        <div className='flex items-center gap-5'>
          <TabsList variant='line' className='h-11 rounded-full border px-2'>
            <TabsTrigger
              value='albums'
              className='data-active:bg-background rounded-full px-4 text-2xl font-bold data-active:shadow-[0_10px_26px_rgba(15,23,42,0.08)]'
            >
              专辑
            </TabsTrigger>
            <TabsTrigger
              value='mvs'
              className='data-active:bg-background rounded-full px-4 text-2xl font-bold data-active:shadow-[0_10px_26px_rgba(15,23,42,0.08)]'
            >
              MV
            </TabsTrigger>
            <TabsTrigger
              value='similar-artists'
              className='data-active:bg-background rounded-full px-4 text-2xl font-bold data-active:shadow-[0_10px_26px_rgba(15,23,42,0.08)]'
            >
              相似歌手
            </TabsTrigger>
          </TabsList>
        </div>

        <div className='space-y-6'>
          {activeTab === 'albums' ? (
            <ArtistAlbumsPanel
              albums={albums}
              albumLoading={albumLoading}
              albumHasMore={albumHasMore}
              albumSentinelRef={albumSentinelRef}
              onToAlbumDetail={onToAlbumDetail}
            />
          ) : null}

          {activeTab === 'mvs' ? (
            <ArtistMvsPanel
              mvs={mvs}
              mvLoading={mvLoading}
              mvHasMore={mvHasMore}
              mvSentinelRef={mvSentinelRef}
              onToMvDetail={onToMvDetail}
            />
          ) : null}

          {activeTab === 'similar-artists' ? (
            <ArtistSimilarArtistsPanel
              artists={similarArtists}
              similarArtistsLoading={similarArtistsLoading}
              onToArtistDetail={onToArtistDetail}
            />
          ) : null}
        </div>
      </Tabs>
    </section>
  )
}

export default memo(ArtistMediaTabs)
