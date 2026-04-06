import { OnlineChartSummary } from '../CoreRankingCardItem.type'

export interface GenreChartsCardProps {
  chart: OnlineChartSummary
  onOpen: (chartId: string) => void
}
