import { LucideIcon, Home, CircleUserRound, Disc3, BarChart3, Heart, ListMusic } from 'lucide-react'

// 导航菜单项接口定义
interface SidebarNavItem {
  to: string
  label: string
  note: string
  icon: LucideIcon
}
// 在线导航菜单项配置
export const onlineNavItems: SidebarNavItem[] = [
  { to: '/', label: 'Home', note: '', icon: Home },
  { to: '/charts', label: 'Charts', note: '', icon: BarChart3 },
  { to: '/', label: 'Playlists', note: '', icon: ListMusic },
  { to: '/', label: 'Artists', note: '', icon: CircleUserRound },
  { to: '/', label: 'Albums', note: '', icon: Disc3 },
]
