export interface ArtistCoverProps {
  artistCoverUrl: string
  artistName: string
  subTitle?: string
  rounded?: 'full' | string
  onPlay?: () => void
  onClickCover?: () => void
  onClickSubTitle?: () => void
}
