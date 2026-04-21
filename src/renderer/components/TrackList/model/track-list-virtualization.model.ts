export interface TrackListFooterTextOptions {
  itemCount: number
  loading?: boolean
  hasMore?: boolean
  loadingText?: string
  endText?: string
}

export interface TrackListEndReachedOptions {
  itemCount: number
  loading?: boolean
  hasMore?: boolean
}

export function getTrackListFooterText({
  itemCount,
  loading = false,
  hasMore = false,
  loadingText = '正在加载更多...',
  endText = '没有更多了',
}: TrackListFooterTextOptions) {
  if (itemCount === 0) {
    return ''
  }

  if (loading) {
    return loadingText
  }

  if (!hasMore) {
    return endText
  }

  return ''
}

export function shouldTriggerTrackListEndReached({
  itemCount,
  loading = false,
  hasMore = false,
}: TrackListEndReachedOptions) {
  if (itemCount === 0) {
    return false
  }

  if (loading) {
    return false
  }

  return hasMore
}
