import type { AppConfig } from '../../main/config/types.ts'

export type ResolveScene = 'playback' | 'download'

export type MusicResolverId =
  | 'official'
  | 'builtinUnblock'
  | 'lxMusic'
  | 'customApi'

export type BuiltinPlatformId = 'migu' | 'kugou' | 'pyncmd' | 'bilibili'

export type ResolveContext = {
  scene: ResolveScene
  isAuthenticated: boolean
  config: Pick<
    AppConfig,
    | 'musicSourceEnabled'
    | 'musicSourceProviders'
    | 'luoxueSourceEnabled'
    | 'customMusicApiEnabled'
    | 'customMusicApiUrl'
  > & {
    quality?: AppConfig['quality']
  }
}

export type ResolverPolicy = {
  resolverOrder: MusicResolverId[]
  builtinPlatforms: BuiltinPlatformId[]
}
