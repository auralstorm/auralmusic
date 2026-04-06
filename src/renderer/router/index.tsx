// src/renderer/router/index.ts
import { createHashRouter } from 'react-router-dom'
import { routeMenuConfig } from './router.config'

// 直接复用一体化配置生成路由（无需手动写路由结构）
const router = createHashRouter(routeMenuConfig)

export default router
