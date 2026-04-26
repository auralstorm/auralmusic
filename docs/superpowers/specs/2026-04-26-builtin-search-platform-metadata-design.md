# 内置多平台搜索与平台内置词图能力设计

## Summary

当前在线歌曲链路存在三类混淆：

1. 搜索层和第三方脚本能力耦合过深。
2. 搜索来源与实际播放解析来源边界不清。
3. 非网易云歌曲的歌词与封面仍缺少稳定的平台内置能力层。

本次设计将在线歌曲能力拆成四层：

- 内置搜索层：固定五平台 `wy / tx / kw / kg / mg`，只负责找歌。
- 播放解析层：根据 `lockedPlatform` 决定走系统官方链还是第三方/LX 实际播放链。
- 平台元数据层：歌词与封面按平台内置 provider 获取，不依赖第三方脚本搜索实现。
- 回退层：对歌词与封面的跨源补救单独建模，避免播放链路被误回退到不符合用户意图的来源。

目标是让“搜索来自哪个平台，播放就优先按哪个平台解析；歌词和封面也优先按该平台内置能力获取”。

## Goals

- 单曲搜索固定使用内置五平台 provider，不再依赖 LX 脚本搜索能力。
- 非网易云搜索结果点播后，不再回到网易云官方或增强源链路；直接走 `lxMusic -> customApi`。
- 歌词与封面按 `lockedPlatform` 走平台内置 provider 获取。
- 搜索、播放、歌词、封面各自职责清晰，不再通过 UI 临时状态相互耦合。
- 让后续下载、MV、更多平台扩展能够复用统一的能力接口。

## Non-Goals

- 本轮不实现“全部平台聚合搜索”。
- 本轮不改下载链。
- 本轮不复刻 LX Music 全部 `musicSdk` 目录结构和全部边缘平台能力。
- 本轮不把第三方脚本当作搜索源使用。
- 本轮不实现歌词跨源补救，除非平台 provider 明确失败且后续单独批准。

## Problem Statement

当前实现已经完成：

- 单曲搜索固定五平台 tabs。
- 搜索结果会写入 `PlaybackTrack.lockedPlatform`。
- 非网易云搜索结果播放已改为跳过 official，直接第三方解析。

但仍存在以下问题：

### 1. 搜索层虽然已内置化，但词图层仍未完全内置化

目前非网易云歌曲歌词刚修到“优先走 LX 脚本 lyric action”，这比统一误走网易云好，但仍把元数据获取质量绑定在第三方脚本上。

### 2. 封面层不统一

- `wy / tx / mg` 搜索结果通常已有图。
- `kw / kg` 搜索结果通常不带图。
- 当前项目没有统一的播放期封面补查层。

### 3. 回退语义不明确

播放、歌词、封面这三类能力是否允许跨源、何时跨源，目前没有被单独建模，容易继续出现：

- 播放来源意图被误覆盖。
- 歌词/封面失败后回退策略不一致。

## Proposed Architecture

### 1. Builtin Search Layer

新增或保留固定五平台搜索 provider：

- `wy`
- `tx`
- `kw`
- `kg`
- `mg`

职责：

- 构造平台搜索请求。
- 归一化平台搜索结果。
- 不负责获取可播 URL。
- 不负责歌词和封面补查。

输出统一的 `BuiltinSearchTrack`：

- `platform`
- `id`
- `name`
- `singer`
- `album`
- `coverUrl`
- `platformMeta`

说明：

- `coverUrl` 允许为空。
- `platformMeta` 保留各平台特有字段，例如 `songmid / hash / rid / copyrightId / albumId`。

### 2. Playback Resolve Layer

播放层继续使用现有 resolver infrastructure，但明确前置规则：

#### `lockedPlatform === 'wy'` 或无锁平台

保持当前系统策略：

- 官方优先。
- 仍然受 VIP / `fee` 分流控制。
- fallback 保持当前既有行为。

#### `lockedPlatform !== 'wy'`

播放解析顺序固定为：

- `lxMusic`
- `customApi`

不再允许：

- `official`
- `builtinUnblock`

原因：

- 搜索时用户已明确选择非网易云来源。
- 播放时再回网易云或增强源，违背来源意图。

### 3. Platform Metadata Layer

新增两个能力接口：

- `lyricProvider.getLyric(track)`
- `coverProvider.getCover(track)`

每个平台独立实现：

- `wy`
- `tx`
- `kw`
- `kg`
- `mg`

#### 歌词策略

- `wy`：继续走当前网易云歌词接口。
- `tx / kw / kg / mg`：改为内置平台歌词 provider，不再优先依赖 LX 脚本 `lyric` action。

#### 封面策略

- 搜索结果已有封面时直接使用。
- 搜索结果无封面时，当前播放或详情展示阶段再调用平台 `coverProvider.getCover(track)` 补查。

### 4. Fallback Layer

新增独立的 fallback policy，而不是把所有回退都塞进播放 resolver。

#### 播放 fallback

- `wy`：保留当前系统策略。
- 非 `wy`：只允许 `lxMusic -> customApi`。
- 不允许跨回网易云官方链。

#### 歌词 fallback

- 第一阶段：默认不跨源。
- 如果平台 provider 失败，则返回空歌词。
- 第二阶段再评估是否允许按相同歌曲元数据做跨源找词。

#### 封面 fallback

- 允许比歌词更积极。
- 第一阶段：平台补查失败则默认封面兜底。
- 第二阶段可考虑按歌曲名称/歌手跨源找图。

## Component and Module Boundaries

### Search UI

相关文件：

- `src/renderer/components/SearchDialog/index.tsx`
- `src/renderer/components/SearchDialog/components/*`
- `src/renderer/components/SearchDialog/model/*`

边界：

- UI 只消费固定五平台 tabs。
- UI 只感知 `BuiltinSearchTrack[]`。
- 不直接感知 LX runtime 或脚本 source id。

### Builtin Search Providers

目录：

- `src/renderer/services/music-source/builtin-search/providers/*`

边界：

- 每个平台独立 provider。
- 不处理播放解析、不处理歌词、不处理封面补查。

### Playback Resolver

相关文件：

- `src/shared/music-source/policy.ts`
- `src/renderer/services/music-source/playback-source-resolver.ts`
- `src/renderer/services/music-source/lx-playback-resolver.ts`

边界：

- 只处理可播 URL 解析。
- 不再承担读词/取图职责。

### Metadata Providers

建议新增目录：

- `src/renderer/services/music-metadata/providers/lyric/*`
- `src/renderer/services/music-metadata/providers/cover/*`
- `src/renderer/services/music-metadata/platform-metadata.service.ts`

边界：

- 歌词与封面获取完全独立于播放解析链。
- 供播放器当前播放信息、歌词面板、搜索结果封面补查等处复用。

## Data Flow

### 搜索到播放

1. 用户在单曲搜索中选择平台 tab。
2. 搜索调用对应 builtin provider。
3. provider 返回 `BuiltinSearchTrack[]`。
4. 搜索结果点击播放时，将 `BuiltinSearchTrack` 转为 `PlaybackTrack`。
5. `PlaybackTrack` 写入：
   - `lockedPlatform`
   - 平台解析所需 `lxInfo`
6. 播放解析层依据 `lockedPlatform` 走正确 resolver policy。

### 当前播放的歌词/封面

1. 当前轨道进入播放器。
2. 根据 `lockedPlatform` 分发到对应平台 lyric/cover provider。
3. provider 返回歌词文本或封面 URL。
4. 失败时按 metadata fallback policy 处理。
5. 最终渲染到播放器 UI。

## Error Handling

### 搜索失败

- 当前平台独立展示错误态。
- 不影响其他平台缓存。
- 切换平台不清空其他平台结果。

### 播放解析失败

- `wy`：按现有播放解析链继续回退。
- 非 `wy`：只在 `lxMusic -> customApi` 范围内回退。
- 若都失败，则按当前播放器错误提示逻辑处理。

### 歌词失败

- 返回空歌词。
- 不阻塞播放。
- 记录来源平台与 provider 失败信息，便于调试。

### 封面失败

- 统一显示默认封面。
- 不阻塞播放。
- 对坏图 URL 做 `onError` 回退。

## Migration Plan

### Phase 1: 固化现有搜索与播放边界

- 保持内置五平台搜索。
- 保持非网易云搜索结果只走 `lxMusic -> customApi`。
- 清理当前为 LX 搜索增强态引入但已经不再需要的 source-capability 逻辑。

### Phase 2: 引入平台内置歌词 provider

- 抽象 `lyricProvider` 接口。
- 先实现 `wy / tx / kw / kg / mg`。
- 将 `player-lyrics.service.ts` 从 LX 脚本优先切到平台内置 provider 优先。

### Phase 3: 引入平台内置封面 provider

- 抽象 `coverProvider` 接口。
- 为 `kw / kg` 增加播放期封面补查。
- 搜索结果 UI 增加图片加载失败默认封面兜底。

### Phase 4: 统一 metadata fallback

- 引入独立 metadata fallback policy。
- 收口“哪些能力允许切源”。

## Testing Strategy

### Provider Tests

- 五平台搜索 provider：
  - 请求参数
  - 返回归一化
  - 空结果
  - 异常结果
- 五平台 lyric provider：
  - 正常解析
  - 空歌词
  - 接口异常
- 五平台 cover provider：
  - 正常图片 URL
  - 空图片
  - 接口异常

### Policy Tests

- `lockedPlatform === 'wy'` 走系统官方优先链。
- `lockedPlatform !== 'wy'` 只走 `lxMusic -> customApi`。
- 非网易云结果绝不回退到 official / builtinUnblock。

### Integration Tests

- 搜索 -> 点击播放 -> resolver order 正确。
- 非网易云搜索结果进入歌词链时不再误打网易云歌词接口。
- `kw / kg` 搜索结果当前播放时能触发封面补查。

## Risks

### 1. 多平台 metadata provider 工程量增加

这是必要成本，但比继续把歌词和封面绑在播放 resolver 或第三方脚本上更稳。

### 2. 平台接口稳定性

搜索、歌词、封面 provider 都可能因为平台接口变化失效。

缓解方式：

- provider 独立测试。
- 每个平台失败时有清晰 fallback 或默认 UI。

### 3. 当前项目已有网易云链路与新平台链路重叠

需要避免重复调用相同接口。

缓解方式：

- 明确 `wy` 继续复用现有稳定能力。
- 其余平台新增 provider 只处理自己的平台能力。

## Recommendation

按以下顺序实施：

1. 保持当前搜索与非网易云播放边界不再回退官方。
2. 优先落歌词 provider 层。
3. 再落封面 provider 层。
4. 最后统一 metadata fallback。

这样可以先把用户感知最强的问题修掉：

- 搜索来源和播放来源一致
- 非网易云歌曲能稳定出歌词
- 非网易云搜索结果不会因为无封面而体验断裂
