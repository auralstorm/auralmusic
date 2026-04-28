import { useEffect } from 'react'
import { useConfigStore } from '@/stores/config-store'
import { applyAnimationEffectToRoot } from '@/theme/animation-effect'

/**
 * 将动画效果配置同步到根节点
 *
 * 动画开关以 DOM class/CSS 变量形式生效，组件不需要逐个订阅配置。
 */
export function useAnimationEffect() {
  const animationEffect = useConfigStore(state => state.config.animationEffect)
  const isLoading = useConfigStore(state => state.isLoading)

  useEffect(() => {
    if (isLoading) {
      return
    }

    // 等配置加载完成后再写根节点，避免默认值短暂覆盖用户设置。
    applyAnimationEffectToRoot(document.documentElement, animationEffect)
  }, [animationEffect, isLoading])
}
