export function shouldShowInitialPlaylistSkeleton(
  loading: boolean,
  playlistCount: number
) {
  return loading && playlistCount === 0
}
