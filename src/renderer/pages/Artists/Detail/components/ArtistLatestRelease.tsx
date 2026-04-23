import { formatArtistPublishDate } from '@/pages/Artists/artist-detail.model'
import { imageSizes } from '@/lib/image-url'
import type { ArtistLatestReleaseProps } from '../types'
import ArtistLatestReleaseCard from './ArtistLatestReleaseCard'

const ArtistLatestRelease = ({
  latestRelease,
  albumsLoading = false,
  mvsLoading = false,
  onToAlbumDetail,
  onToMvDetail,
  onPlayLatestAlbum,
}: ArtistLatestReleaseProps) => {
  const latestAlbum = latestRelease.album
  const latestMv = latestRelease.mv

  return (
    <section className='space-y-5'>
      <h2 className='text-foreground text-3xl font-bold tracking-tight'>
        最新发布
      </h2>
      <div className='grid grid-cols-2 gap-6'>
        <ArtistLatestReleaseCard
          kindLabel='最新专辑'
          title={latestAlbum?.name}
          publishDate={
            latestAlbum
              ? formatArtistPublishDate(latestAlbum.publishTime)
              : undefined
          }
          metaLabel={latestAlbum ? `Album · ${latestAlbum.size ?? 0} 首歌` : ''}
          coverUrl={latestAlbum?.picUrl}
          coverWidth={imageSizes.cardCover.width}
          coverHeight={imageSizes.cardCover.height}
          loading={albumsLoading}
          loadingText='正在加载专辑...'
          emptyText='暂无专辑发布'
          playAriaLabel='播放最新专辑'
          onOpen={
            latestAlbum?.id ? () => onToAlbumDetail(latestAlbum.id) : undefined
          }
          onPlay={
            latestAlbum?.id
              ? () => onPlayLatestAlbum(latestAlbum.id, latestAlbum.picUrl)
              : undefined
          }
        />

        <ArtistLatestReleaseCard
          kindLabel='最新 MV'
          title={latestMv?.name}
          publishDate={
            latestMv ? formatArtistPublishDate(latestMv.publishTime) : undefined
          }
          metaLabel='MV'
          coverUrl={latestMv?.coverUrl}
          coverWidth={imageSizes.mvCard.width}
          coverHeight={imageSizes.mvCard.height}
          loading={mvsLoading}
          loadingText='正在加载 MV...'
          emptyText='暂无 MV 发布'
          playAriaLabel='打开最新 MV'
          onOpen={latestMv?.id ? () => onToMvDetail(latestMv.id) : undefined}
        />
      </div>
    </section>
  )
}

export default ArtistLatestRelease
