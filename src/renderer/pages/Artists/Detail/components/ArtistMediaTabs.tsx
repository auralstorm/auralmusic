import type { Ref } from 'react'
import { Play } from 'lucide-react'
import ArtistCover from '@/components/ArtistCover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  formatArtistPublishDate,
  type ArtistAlbumItem,
  type ArtistMvItem,
  type ArtistSimilarItem,
} from '@/pages/Artists/artist-detail.model'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'
import { formatPlayCount } from '@/lib/utils'

interface ArtistMediaTabsProps {
  albums: ArtistAlbumItem[]
  mvs: ArtistMvItem[]
  similarArtists: ArtistSimilarItem[]
  albumLoading?: boolean
  mvLoading?: boolean
  similarArtistsLoading?: boolean
  albumHasMore?: boolean
  mvHasMore?: boolean
  albumSentinelRef: Ref<HTMLDivElement>
  mvSentinelRef: Ref<HTMLDivElement>
  onToAlbumDetail: (id: number) => void
  onToMvDetail: (id: number) => void
  onToArtistDetail: (id: number) => void
}

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
  return (
    <section className='space-y-5'>
      <Tabs defaultValue='albums' className='gap-5'>
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

        <TabsContent value='albums' className='space-y-6'>
          {albums.length === 0 && !albumLoading ? (
            <div className='border-border/60 bg-card/68 text-muted-foreground rounded-[30px] border px-6 py-10 text-sm'>
              暂无专辑内容
            </div>
          ) : (
            <>
              <div className='grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6'>
                {albums.map(album => (
                  <article
                    key={album.id}
                    className='border-border/50 bg-card/72 overflow-hidden rounded-[24px] border p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]'
                    onClick={() => onToAlbumDetail(album.id)}
                  >
                    <div className='relative overflow-hidden rounded-[20px]'>
                      <img
                        src={resizeImageUrl(
                          album.picUrl,
                          imageSizes.cardCover.width,
                          imageSizes.cardCover.height
                        )}
                        alt={album.name}
                        className='aspect-square size-full object-cover'
                        loading='lazy'
                        decoding='async'
                        draggable={false}
                      />
                    </div>
                    <div className='mt-4 space-y-1.5'>
                      <h3 className='truncate text-lg font-bold'>
                        {album.name}
                      </h3>
                      <p className='text-muted-foreground text-sm'>
                        {formatArtistPublishDate(album.publishTime)}
                      </p>
                    </div>
                  </article>
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
          )}
        </TabsContent>

        <TabsContent value='mvs' className='space-y-6'>
          {mvs.length === 0 && !mvLoading ? (
            <div className='border-border/60 bg-card/68 text-muted-foreground rounded-[30px] border px-6 py-10 text-sm'>
              暂无 MV 内容
            </div>
          ) : (
            <>
              <div className='grid grid-cols-2 gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3'>
                {mvs.map(mv => (
                  <article
                    key={mv.id}
                    className='group border-border/50 bg-card/72 flex cursor-pointer gap-4 rounded-[24px] border p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1'
                    onClick={() => onToMvDetail(mv.id)}
                  >
                    <div className='relative min-w-0 flex-1 overflow-hidden rounded-[20px]'>
                      <img
                        src={resizeImageUrl(
                          mv.coverUrl,
                          imageSizes.mvCard.width,
                          imageSizes.mvCard.height
                        )}
                        alt={mv.name}
                        className='aspect-[16/9] size-full object-cover'
                        loading='lazy'
                        decoding='async'
                        draggable={false}
                      />
                      <div className='absolute inset-0 flex items-center justify-center bg-black/10 transition-colors duration-300 group-hover:bg-black/16'>
                        <span className='inline-flex size-12 items-center justify-center rounded-full border border-white/75 bg-white/18 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-[1.04]'>
                          <Play className='ml-0.5 size-4 fill-current' />
                        </span>
                      </div>
                    </div>
                    <div className='flex min-w-0 basis-[38%] flex-col justify-center gap-2'>
                      <h3 className='truncate text-xl font-bold'>{mv.name}</h3>
                      <p className='text-muted-foreground text-sm'>
                        {formatArtistPublishDate(mv.publishTime)}
                      </p>
                      <p className='text-muted-foreground text-sm'>
                        播放次数 {formatPlayCount(mv.playCount) || '暂无播放'}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <div
                ref={mvSentinelRef}
                className='text-muted-foreground flex h-16 items-center justify-center text-sm'
              >
                {mvLoading ? '正在加载更多 MV...' : null}
                {!mvLoading && !mvHasMore && mvs.length > 0
                  ? '没有更多 MV 了'
                  : null}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value='similar-artists' className='space-y-6'>
          {similarArtistsLoading ? (
            <div className='border-border/60 bg-card/68 text-muted-foreground rounded-[30px] border px-6 py-10 text-sm'>
              正在加载相似歌手...
            </div>
          ) : null}

          {!similarArtistsLoading && similarArtists.length === 0 ? (
            <div className='border-border/60 bg-card/68 text-muted-foreground rounded-[30px] border px-6 py-10 text-sm'>
              暂无相似歌手
            </div>
          ) : null}

          {!similarArtistsLoading && similarArtists.length > 0 ? (
            <div className='grid grid-cols-2 gap-10 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7'>
              {similarArtists.map(artist => (
                <ArtistCover
                  key={artist.id}
                  artistCoverUrl={artist.picUrl}
                  artistName={artist.name}
                  rounded='full'
                  onClickCover={() => onToArtistDetail(artist.id)}
                />
              ))}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </section>
  )
}

export default ArtistMediaTabs
