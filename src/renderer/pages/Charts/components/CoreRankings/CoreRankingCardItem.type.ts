export interface OnlineChartPreviewEntry {
  id: string
  rank: number
  name: string
  artist: string
}

export interface OnlineChartSummary {
  id: string
  name: string
  badge: string
  description: string
  coverImgUrl: string | null
  updateFrequency: string | null
  trackCount: number
  preview: OnlineChartPreviewEntry[]
}

export interface OnlineChartHeroCardProps {
  chart: OnlineChartSummary
  index: number
  onOpen: (chartId: string) => void
}
