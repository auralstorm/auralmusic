# Renderer Services 维护文档

`src/renderer/services` 是渲染进程的业务能力层，负责把页面/组件的播放、下载、搜索、歌词、封面等需求收敛成可复用的服务流程。这里不直接渲染 UI，也不持有页面私有状态；它只读取必要配置、调用 API/IPC、选择 provider，并把外部响应归一化为组件可消费的数据。

当前目录分为三块：

- `music-source`：播放源解析、内置跨平台搜索、LX 音源脚本运行。
- `download`：下载源解析，复用播放源策略但输出下载可用 URL 和文件扩展名。
- `music-metadata`：按平台补齐歌词和封面，供播放场景后台补元数据。

## 1. music-source

### 1.1 职责边界

`music-source` 负责回答两个问题：

1. 当前歌曲应该按什么顺序尝试音源 provider？
2. 第三方或内置平台返回的数据如何转成项目内统一的播放/搜索结构？

核心入口：

- `playback-source-resolver.ts`
  - 导出 `resolvePlaybackSource`，播放器加载歌曲时使用。
  - 默认读取 `useAuthStore` 和 `useConfigStore`，并接入 renderer logger。
- `model/playback-source-resolver.model.ts`
  - 纯模型层，支持注入 `getAuthState`、`getConfig`、`providers`、`trace`，方便测试。
- `providers/*-playback-provider.ts`
  - 具体播放源 provider：官方、内置解锁、LX 音源、自定义 API。
- `lx-playback-resolver.ts`
  - 把项目内 `PlaybackTrack` 转成 LX 脚本要求的 `LxMusicInfo`，并按脚本候选顺序解析播放地址。
- `LxMusicSourceRunner.ts` + `workers/lxScriptSandbox.worker.ts`
  - LX 脚本运行器和 worker 沙箱。
- `builtin-search/*`
  - 搜索弹窗使用的内置平台搜索能力。

### 1.2 播放源解析流程

播放组件调用链：

```text
PlaybackControl/usePlaybackEngineTrackLoader
  -> resolvePlaybackSource(track, config)
    -> createPlaybackSourceResolverBase(...)
      -> toResolveContext(authState, config, track)
      -> buildResolverPolicy(context)
      -> 按 resolverPolicy.resolverOrder 顺序尝试 provider
      -> 命中第一个带 url 的 SongUrlV1Result
```

流程要点：

1. `toResolveContext` 把登录态、VIP 状态、歌曲 fee、锁定平台、偏好音质和配置合并成 `ResolveContext`。
2. `buildResolverPolicy` 位于 `src/shared/music-source`，是播放/下载共用的音源策略中心。
3. resolver 不自己判断“先官方还是先 LX”，只消费 `resolverPolicy.resolverOrder`。
4. 每个 provider 必须返回 `SongUrlV1Result | null`，不要抛出可预期的“无结果”错误。
5. 只有真正异常才抛出，resolver 会写 trace 并向上抛给播放链路处理。

### 1.3 播放 provider

`official-playback-provider.ts`

- 调用 `api/list.ts` 的 `getSongUrlV1`。
- 使用 `normalizeSongUrlV1Response` 归一化响应。
- `unblock: false`，只请求官方地址。
- 请求失败或无地址时返回 `null`。

`builtin-unblock-playback-provider.ts`

- 调用 `getSongUrlMatch`。
- 默认匹配源为 `unm`、`bikonoo`、`gdmusic`、`msls`、`qijieya`。
- 如果配置了 `enhancedSourceModules`，优先使用配置中的匹配源。
- 每个匹配源失败后继续尝试下一个，全部失败返回 `null`。

`lx-playback-provider.ts`

- 仅当配置包含 `luoxueMusicSourceScripts` 和 `activeLuoxueMusicSourceScriptId` 时启用。
- 调用 `resolveTrackWithLxMusicSource`。
- 播放音质从 `context.config.quality` 映射到 LX 音质：`higher/exhigh -> 320k`，`lossless -> flac`，`hires -> flac24bit`。

`custom-api-playback-provider.ts`

- 当前是预留位，返回 `null`。
- 后续接入自定义 API 时，应保持和其他 provider 一样的输入/输出契约，不要在 resolver 主流程里写接口细节。

### 1.4 LX 音源脚本流程

LX 播放解析链路：

```text
lx-playback-provider
  -> resolveTrackWithLxMusicSource
    -> 校验 musicSourceEnabled / luoxueSourceEnabled / active script
    -> toLxMusicInfo(track)
    -> resolveLxPlaybackScriptCandidates(...)
    -> 逐个脚本读取 window.electronMusicSource.readLxScript(id)
    -> initLxMusicRunner(scriptContent)
    -> runner.getMusicUrl(source, musicInfo, quality)
```

脚本候选顺序：

1. 当前激活脚本优先。
2. 其余脚本中，声明支持目标平台的脚本靠前。
3. 未匹配目标平台但可作为兜底的脚本排后。

runner 和 worker 分工：

- `LxMusicSourceRunner`
  - 维护单个 active runner。
  - 负责初始化 worker、发送 invoke 请求、维护 `callId -> Promise` 映射、处理超时。
  - 代理 worker 的 HTTP 请求，优先走 `window.electronMusicSource.lxHttpRequest`，失败后降级到 renderer `fetch`。
- `lxScriptSandbox.worker.ts`
  - 执行第三方 LX 脚本。
  - 禁用 `fetch/XMLHttpRequest/WebSocket/EventSource` 等全局能力，强制脚本通过 `lx.request` 走 host 代理。
  - 注入 LX API：`lx.on('request')`、`lx.send('inited')`、`lx.request`、`lx.utils.buffer`、`lx.utils.crypto.md5`。
- `model/lx-script-compat.ts`
  - 注入 Babel/regenerator 兼容全局，兼容被转译过的第三方脚本。
- `model/lx-runtime-utils.ts`
  - 提供 Buffer-like 编码转换和 MD5。

注意事项：

- 不要在页面组件里直接 new `LxMusicSourceRunner`，统一走 `initLxMusicRunner/getLxMusicRunner`。
- worker 的 `callId` 用于并发隔离，新增请求类型时也必须保留请求-响应关联。
- `lastMusicUrl` 是兼容兜底：部分 LX 脚本只在 `lx.request` 回包里携带真实播放地址。
- `recentLxPlaybackFailures` 做短窗口去重，避免同一失败在播放器重试时刷屏。

### 1.5 内置平台搜索流程

搜索弹窗调用：

```text
SearchDialog
  -> searchSongsWithBuiltinProvider(sourceId, { keyword, page, limit })
    -> BUILTIN_SEARCH_PROVIDERS[sourceId].search(...)
    -> 平台 provider 请求/解析
    -> BuiltinSongSearchResult
```

目录职责：

- `builtin-search/index.ts`：平台 provider 注册表。
- `builtin-search/builtin-search.types.ts`：搜索结果统一结构。
- `builtin-search/builtin-search.http.ts`：通过 `window.electronMusicSource.lxHttpRequest` 请求跨域平台接口。
- `builtin-search/builtin-search.utils.ts`：歌手名、时长、封面 URL、音质标签等通用归一化工具。
- `builtin-search/providers/*`：五个平台搜索实现：`wy`、`tx`、`kw`、`kg`、`mg`。

接入新搜索平台时：

1. 在 `builtin-search.types.ts` 扩展平台 id 类型的来源，通常应先在 shared 的 LX source key 中补齐。
2. 新增 provider，并返回 `BuiltinSongSearchResult`。
3. 在 `builtin-search/index.ts` 注册。
4. 输出的 `lxInfo.source` 必须和平台 source 对齐，后续播放/歌词/封面会依赖它判断平台。

## 2. download

### 2.1 职责边界

`download` 负责解析“下载任务应该使用哪个音源 URL”。它不负责写文件、不负责进度、不负责元数据写入；这些属于主进程下载服务和下载页面。

核心入口：

- `download-source-resolver.ts`
  - 公开 `createDownloadSourceResolver`。
  - 默认读取 renderer 的配置和登录态。
- `model/download-source-resolver.model.ts`
  - 纯 resolver 模型，负责策略、音质降级、provider 编排。
- `providers/*-download-provider.ts`
  - 具体下载源 provider。
- `providers/shared.ts`
  - API 加载、扩展名推断、官方下载响应解析等共用工具。

### 2.2 下载源解析流程

典型调用链：

```text
TrackList/下载入口
  -> createDownloadSourceResolver()
  -> resolveDownloadSource({ track, requestedQuality, policy })
    -> getConfig()
    -> getAuthState()
    -> toResolveContext(..., scene='download')
    -> buildResolverPolicy(context)
    -> 根据 policy 生成音质列表
    -> 按 quality x resolverOrder 嵌套尝试 provider
    -> 返回第一个 ResolvedDownloadSource
```

音质策略：

- `strict`：只尝试用户请求的音质。
- `fallback`：通过 `createDownloadQualityFallbackChain` 生成降级链，例如高音质失败后尝试较低音质。

provider 顺序：

- 仍由 `buildResolverPolicy(context)` 决定。
- 下载 resolver 不直接写“官方优先”或“LX 优先”的业务判断，避免播放和下载策略分叉。

返回结构：

```ts
type ResolvedDownloadSource = {
  url: string
  quality: AudioQualityLevel
  provider: string
  fileExtension: string | null
}
```

### 2.3 下载 provider

`official-download-provider.ts`

解析顺序：

1. 先调用 `getSongUrlV1` 获取播放 URL。
2. 若播放 URL 可用，返回 provider `official-playback`。
3. 若播放 URL 不可用，再调用 `getSongDownloadUrlV1` 获取官方下载 URL。
4. 使用 `readOfficialDownloadUrl` 解析下载接口返回的 `url` 和 `fileExtension`。

这样设计是为了优先复用官方播放链路，只有播放链路拿不到时再使用下载接口。

`builtin-unblock-download-provider.ts`

- 复用内置解锁匹配能力 `getSongUrlMatch`。
- 平台源默认与播放 provider 一致。
- 每个匹配源失败后继续尝试下一个。
- 返回 provider `builtin-unblock`。

`lx-download-provider.ts`

- 复用 `resolveTrackWithLxMusicSource`。
- 和播放链路共用 LX runner、脚本候选和平台选择逻辑。
- 返回 provider `lxMusic`。

`custom-api-download-provider.ts`

- 当前预留，返回 `null`。
- 后续实现时应优先落在 provider 内部，不要把自定义 API 请求写进 resolver。

### 2.4 和主进程下载服务的关系

renderer 的 `download` 只解析 URL。真正下载发生在主进程：

```text
renderer 解析下载源
  -> 通过 preload/download IPC 创建下载任务
  -> src/main/download/download-service.ts
    -> 请求音频二进制
    -> 写入目标路径
    -> 写 ID3/同名 lrc
    -> 更新任务状态
```

因此 renderer resolver 必须保证：

- 返回 URL 之前已尽量推断 `fileExtension`。
- 不写文件系统。
- 不处理下载进度。
- 不弹 toast；错误由调用方或主进程任务状态展示。

### 2.5 扩展下载源的步骤

1. 新增 `providers/<name>-download-provider.ts`。
2. 实现 `DownloadResolverProvider.resolve(options)`。
3. 无结果返回 `null`，可预期失败不要抛出。
4. 在 `createDefaultProviders()` 中注册 provider。
5. 如果要进入策略顺序，还需要在 `src/shared/music-source` 中扩展 resolver id 和 `buildResolverPolicy`。
6. 为 provider 添加 model 层测试时，优先通过 `deps` 注入 API 函数，不要 mock 全局 store。

## 3. music-metadata

### 3.1 职责边界

`music-metadata` 负责按歌曲平台来源补齐歌词和封面。它不是播放源解析器，也不决定是否能播放；它只在播放器场景中帮助补充展示数据。

核心入口：

- `platform-metadata.service.ts`
  - `getBuiltinTrackLyric(track)`
  - `getBuiltinTrackCover(track)`
  - `resolveTrackPlatformMetadataSource(track)`
  - `shouldUseBuiltinPlatformMetadata(source)`
- `platform-metadata.utils.ts`
  - 平台 source 归一化和读取逻辑。
- `platform-metadata-fallback.service.ts`
  - 元数据兜底策略。
- `providers/lyric/*`
  - 五个平台歌词 provider。
- `providers/cover/*`
  - 五个平台封面 provider。

### 3.2 平台来源判断

来源解析顺序：

```text
resolveTrackPlatformMetadataSource(track)
  -> readTrackPlatformSource(track)
    -> normalizeBuiltinPlatformSource(track.lockedPlatform)
    -> normalizeBuiltinPlatformSource(track.lxInfo?.source)
```

规则：

- 只接受 `wy`、`tx`、`kw`、`kg`、`mg` 五个平台。
- `lockedPlatform` 优先级高于 `lxInfo.source`。
- 无法识别来源时，歌词/封面入口默认按 `wy` 尝试。

### 3.3 歌词流程

播放器歌词服务调用：

```text
PlayerScene/player-lyrics.service
  -> getBuiltinTrackLyric(currentTrack)
    -> resolveTrackPlatformMetadataSource(track) ?? 'wy'
    -> readBuiltinLyricProvider(registry, source)
    -> provider.getLyric(track)
    -> BuiltinLyricResult | null
```

`BuiltinLyricResult`：

```ts
type BuiltinLyricResult = {
  lyric: string
  translatedLyric?: string
  yrc?: string
}
```

provider 注册：

- `providers/lyric/index.ts` 创建并导出 `builtinLyricProviders`。
- 每个平台 provider 只处理本平台接口响应，不承担平台选择。

注意事项：

- 歌词 provider 返回 `null` 表示没有可用歌词。
- 不跨平台兜底歌词。`platform-metadata-fallback.service.ts` 当前策略明确：`lyric` 不跨平台 fallback。
- 返回歌词前应尽量归一化空字符串，避免播放器把空歌词当有效歌词。

### 3.4 封面流程

播放器封面服务调用：

```text
PlayerScene/player-cover.service
  -> getBuiltinTrackCover(currentTrack)
    -> resolveTrackPlatformMetadataSource(track) ?? 'wy'
    -> readBuiltinCoverProvider(registry, source)
    -> provider.getCover(track)
    -> BuiltinCoverResult | null
```

`BuiltinCoverResult`：

```ts
type BuiltinCoverResult = {
  coverUrl: string
}
```

兜底策略：

- `cover` 允许 fallback 到 UI 默认封面或当前已有封面。
- `lyric` 不跨平台 fallback，避免错配歌词。

### 3.5 扩展平台元数据 provider

新增歌词 provider：

1. 在 `providers/lyric/<source>-builtin-lyric-provider.ts` 实现 `BuiltinLyricProvider`。
2. 只做本平台请求和响应归一化。
3. 在 `providers/lyric/index.ts` 注册。
4. 如果是新平台，先扩展 `BUILTIN_PLATFORM_SOURCES`。

新增封面 provider：

1. 在 `providers/cover/<source>-builtin-cover-provider.ts` 实现 `BuiltinCoverProvider`。
2. 返回稳定的远端 URL，不做缓存落盘。
3. 在 `providers/cover/index.ts` 注册。
4. 缓存策略由播放器封面服务和 `window.electronCache` 处理，不写进 provider。

## 4. 跨目录协作关系

### 4.1 播放完整链路

```text
用户播放歌曲
  -> usePlaybackStore 更新 currentTrack/requestId
  -> usePlaybackEngineTrackLoader 触发
  -> services/music-source.resolvePlaybackSource
  -> 命中官方/内置解锁/LX provider
  -> window.electronCache.resolveAudioSource 可选缓存音频
  -> playbackRuntime.loadSource/playWithFade
  -> PlayerScene 后台请求歌词/封面
  -> services/music-metadata provider
```

### 4.2 搜索到播放链路

```text
SearchDialog 输入关键词
  -> builtin-search provider 搜索平台歌曲
  -> 搜索结果转 PlaybackTrack
  -> playQueueFromIndex
  -> 播放链路按 lockedPlatform/lxInfo.source 继续解析音源
```

### 4.3 下载链路

```text
用户点击下载
  -> TrackList download model
  -> services/download.createDownloadSourceResolver
  -> 按下载 policy 和 resolver policy 找 URL
  -> preload download API
  -> main/download-service 写文件和元数据
```

## 5. 维护原则

- 页面组件不要直接调用平台接口；平台差异放 provider。
- resolver 只做编排，provider 只做单一来源解析。
- shared 层决定播放/下载共用策略，renderer services 不复制策略判断。
- 可预期的无结果返回 `null`，不可恢复异常才抛出。
- 新增 provider 时优先支持依赖注入，方便测试。
- 不在 services 中弹 UI toast，交互反馈由组件或 store 决定。
- 不在 renderer services 写磁盘；文件写入走主进程或 Electron cache IPC。
- 平台 source 必须统一使用 `wy/tx/kw/kg/mg`，避免歌词、封面、播放链路错配。
