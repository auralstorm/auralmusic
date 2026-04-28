import type { AppConfig } from '../config.ts'
import type { LxQuality, LxSourceKey } from '../lx-music-source.ts'

/** 资源解析使用场景，后续可按播放/下载做不同策略。 */
export type ResolveScene = 'playback' | 'download'

/** 可参与解析的来源类型。 */
export type MusicResolverId =
  | 'official'
  | 'builtinUnblock'
  | 'lxMusic'
  | 'customApi'

export type BuiltinPlatformId = 'migu' | 'kugou' | 'pyncmd' | 'bilibili'

/** 构建解析策略所需的上下文，来自曲目、登录态和用户配置。 */
export type ResolveContext = {
  scene: ResolveScene
  isAuthenticated: boolean
  isVip: boolean
  trackFee: number
  lockedPlatform?: LxSourceKey
  lockedLxSourceId?: string
  preferredQuality?: LxQuality
  config: Pick<
    AppConfig,
    | 'musicSourceEnabled'
    | 'musicSourceProviders'
    | 'luoxueSourceEnabled'
    | 'customMusicApiEnabled'
    | 'customMusicApiUrl'
  > & {
    enhancedSourceModules?: AppConfig['enhancedSourceModules']
    quality?: AppConfig['quality']
  }
}

/** 解析策略输出：解析器顺序和内置平台列表。 */
export type ResolverPolicy = {
  resolverOrder: MusicResolverId[]
  builtinPlatforms: BuiltinPlatformId[]
}
