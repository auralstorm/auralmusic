import type { ArtistLatestReleaseData } from '@/pages/Artists/artist-detail.model'
import { formatArtistPublishDate } from '@/pages/Artists/artist-detail.model'
import { imageSizes, resizeImageUrl } from '@/lib/image-url'

interface ArtistLatestReleaseProps {
  latestRelease: ArtistLatestReleaseData
  albumsLoading?: boolean
  mvsLoading?: boolean
  onToAlbumDetail: (id: number) => void
  onToMvDetail: (id: number) => void
}

const ArtistLatestRelease = ({
  latestRelease,
  albumsLoading = false,
  mvsLoading = false,
  onToAlbumDetail,
  onToMvDetail,
}: ArtistLatestReleaseProps) => {
  return (
    <section className='space-y-5'>
      <h2 className='text-foreground text-3xl font-bold tracking-tight'>
        最新发布
      </h2>
      <div className='grid grid-cols-2 gap-6'>
        <article
          className='border-border/60 bg-card/72 flex min-h-44 gap-5 rounded-[30px] border p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]'
          onClick={() =>
            latestRelease?.album?.id &&
            onToAlbumDetail(latestRelease?.album?.id)
          }
        >
          {latestRelease.album ? (
            <>
              <img
                src={resizeImageUrl(
                  latestRelease.album.picUrl,
                  imageSizes.cardCover.width,
                  imageSizes.cardCover.height
                )}
                alt={latestRelease.album.name}
                className='size-32 rounded-[26px] object-cover'
                loading='lazy'
                decoding='async'
                draggable={false}
              />
              <div className='flex min-w-0 flex-col justify-center gap-2'>
                <div className='text-muted-foreground text-xs font-semibold tracking-[0.28em] uppercase'>
                  最新专辑
                </div>
                <h3 className='truncate text-2xl font-bold'>
                  {latestRelease.album.name}
                </h3>
                <p className='text-muted-foreground text-sm'>
                  {formatArtistPublishDate(latestRelease.album.publishTime)}
                </p>
                <p className='text-muted-foreground text-sm'>
                  Album · {latestRelease.album.size ?? 0} 首歌
                </p>
              </div>
            </>
          ) : albumsLoading ? (
            <div className='text-muted-foreground flex min-h-32 items-center text-sm'>
              正在加载专辑...
            </div>
          ) : (
            <div className='text-muted-foreground flex min-h-32 items-center text-sm'>
              暂无专辑发布
            </div>
          )}
        </article>

        <article
          className='border-border/60 bg-card/72 flex min-h-44 gap-5 rounded-[30px] border p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]'
          onClick={() =>
            latestRelease?.mv?.id && onToMvDetail(latestRelease?.mv?.id)
          }
        >
          {latestRelease.mv ? (
            <>
              <img
                src={resizeImageUrl(
                  latestRelease.mv.coverUrl,
                  imageSizes.mvCard.width,
                  imageSizes.mvCard.height
                )}
                alt={latestRelease.mv.name}
                className='aspect-[16/9] w-52 rounded-[26px] object-cover'
                loading='lazy'
                decoding='async'
                draggable={false}
              />
              <div className='flex min-w-0 flex-col justify-center gap-2'>
                <div className='text-muted-foreground text-xs font-semibold tracking-[0.28em] uppercase'>
                  最新 MV
                </div>
                <h3 className='truncate text-2xl font-bold'>
                  {latestRelease.mv.name}
                </h3>
                <p className='text-muted-foreground text-sm'>
                  {formatArtistPublishDate(latestRelease.mv.publishTime)}
                </p>
                <p className='text-muted-foreground text-sm'>MV</p>
              </div>
            </>
          ) : mvsLoading ? (
            <div className='text-muted-foreground flex min-h-32 items-center text-sm'>
              正在加载 MV...
            </div>
          ) : (
            <div className='text-muted-foreground flex min-h-32 items-center text-sm'>
              暂无 MV 发布
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

export default ArtistLatestRelease
