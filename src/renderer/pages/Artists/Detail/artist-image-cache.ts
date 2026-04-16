import type {
  ArtistAlbumItem,
  ArtistDetailProfile,
  ArtistMvItem,
  ArtistSimilarItem,
} from '../artist-detail.model.ts'

type ImageResolveResult = {
  url: string
  fromCache: boolean
}

type ImageResolver = {
  resolveImageSource: (
    cacheKey: string,
    sourceUrl: string
  ) => Promise<ImageResolveResult>
}

function hasImageUrl(url: string) {
  return typeof url === 'string' && url.trim().length > 0
}

export function buildArtistHeroImageCacheKey(artistId: number) {
  return `artist:detail:hero:${artistId}`
}

export function buildArtistSimilarImageCacheKey(
  artistId: number,
  relatedArtistId: number
) {
  return `artist:detail:similar:${artistId}:${relatedArtistId}`
}

export function buildArtistAlbumImageCacheKey(albumId: number) {
  return `artist:detail:album:${albumId}`
}

export function buildArtistMvImageCacheKey(mvId: number) {
  return `artist:detail:mv:${mvId}`
}

async function resolveImageUrl(
  cacheApi: ImageResolver,
  cacheKey: string,
  sourceUrl: string
) {
  if (!hasImageUrl(sourceUrl)) {
    return sourceUrl
  }

  const result = await cacheApi.resolveImageSource(cacheKey, sourceUrl)
  return result.url
}

export async function resolveArtistProfileImage(
  cacheApi: ImageResolver,
  profile: ArtistDetailProfile | null
) {
  if (!profile) {
    return null
  }

  return {
    ...profile,
    coverUrl: await resolveImageUrl(
      cacheApi,
      buildArtistHeroImageCacheKey(profile.id),
      profile.coverUrl
    ),
  }
}

export async function resolveSimilarArtistImages(
  cacheApi: ImageResolver,
  artistId: number,
  artists: ArtistSimilarItem[]
) {
  return Promise.all(
    artists.map(async artist => ({
      ...artist,
      picUrl: await resolveImageUrl(
        cacheApi,
        buildArtistSimilarImageCacheKey(artistId, artist.id),
        artist.picUrl
      ),
    }))
  )
}

export async function resolveArtistAlbumImages(
  cacheApi: ImageResolver,
  albums: ArtistAlbumItem[]
) {
  return Promise.all(
    albums.map(async album => ({
      ...album,
      picUrl: await resolveImageUrl(
        cacheApi,
        buildArtistAlbumImageCacheKey(album.id),
        album.picUrl
      ),
    }))
  )
}

export async function resolveArtistMvImages(
  cacheApi: ImageResolver,
  mvs: ArtistMvItem[]
) {
  return Promise.all(
    mvs.map(async mv => ({
      ...mv,
      coverUrl: await resolveImageUrl(
        cacheApi,
        buildArtistMvImageCacheKey(mv.id),
        mv.coverUrl
      ),
    }))
  )
}
