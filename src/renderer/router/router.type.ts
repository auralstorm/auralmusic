// 定义路由/菜单配置的类型（TS 类型约束，可选但推荐）
export type RouteMenuConfig = {
  path: string // 路由路径
  element: React.ReactNode // 路由对应组件
  meta: {
    title: string // 菜单显示名称
    icon?: string // 菜单图标（如 lucide-react 中的图标名称，可选）
    hidden?: boolean // 是否在菜单中隐藏（如404、登录页，可选）
  }
  children?: RouteMenuConfig[] // 嵌套路由/子菜单
}
