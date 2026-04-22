# 云盘播放队列补全设计

## 背景

当前云盘页已经具备稳定的分页浏览能力：

- [LibraryCloudPanel.tsx](/F:/code-demo/auralmusic/src/renderer/pages/Library/components/LibraryCloudPanel.tsx:1) 通过 `/user/cloud` 按 `limit / offset` 分页加载。
- [library-cloud.model.ts](/F:/code-demo/auralmusic/src/renderer/pages/Library/library-cloud.model.ts:1) 已经能从接口返回中解析 `count / more / hasMore`。
- 云盘歌曲当前通过 `TrackList` 进入统一播放链路。

但它还没有接入“单一来源完整队列”逻辑：

- 当前 `LibraryCloudPanel` 没有传 `playbackQueueKey`。
- 点击播放时，播放器只认当前已加载的分页数据。
- 如果云盘页当前只加载了 30 首，不继续滚动，就只能在这 30 首里播放或循环。

目标是让云盘也接入与 `liked-songs / playlist / album` 一致的“首批起播 + 后台补全完整队列”策略。

## 目标

- 云盘页继续按页面体验要求分页浏览，不承担播放器完整性责任。
- 点击云盘歌曲时立即起播，不因为后台补全而阻塞。
- 不打开播放列表抽屉时，云盘队列也能后台补全，不会只停留在当前页 30 首。
- 抽屉打开时复用同一份缓存或 inflight 补全任务，不重复请求。
- 云盘播放、上一首、下一首、循环、随机全部基于权威播放队列。

## 非目标

- 不改云盘页现有分页浏览体验。
- 不把云盘页改成一次性全量加载。
- 不在本次设计里处理“个别云盘歌曲 URL 解析兼容性”问题，只在风险里明确。

## 方案对比

### 方案 A：把云盘定义成单一来源完整队列

这是推荐方案。

- 新增来源 key：`cloud:<userId>`
- 页面继续分页浏览。
- 点击播放时，用当前已加载数据立即起播。
- 起播成功后，后台继续分页调用 `/user/cloud` 把整份云盘队列补齐。
- 抽屉只消费 `usePlaybackStore.queue`，打开时复用缓存或 inflight 任务。

优点：

- 与当前 `liked-songs / playlist / album` 策略统一。
- 不依赖用户是否滚动页面或打开抽屉。
- 保留云盘页现有分页性能优势。

缺点：

- 需要在 shared playback helper 和 hydration model 中增加 `cloud` 来源分支。
- 需要额外考虑多账号场景下的来源 key 隔离。

### 方案 B：只给云盘页补 `playbackQueueKey`，继续依赖页面滚动同步扩容

不推荐。

优点：

- 改动最小。

缺点：

- 用户不继续滚动，队列仍然不完整。
- 本质上没有解决“分页浏览列表影响播放器完整性”的问题。

### 方案 C：只在抽屉打开时再补全云盘队列

不推荐。

缺点：

- 不打开抽屉时，完整队列不存在。
- 仍会重现“只播放当前页已加载数据”的问题。

## 推荐设计

采用方案 A。

### 1. 云盘来源定义

云盘归入“单一来源完整队列”，来源 key 采用：

- `cloud:<userId>`

不建议只用 `cloud`，因为：

- 当前仓库存在账号体系。
- 未来如果切换账号，只用 `cloud` 会让缓存和 inflight 任务串来源。

### 2. 权威播放状态不变

云盘接入后，仍然只认现有的权威播放状态：

- `queue`
- `queueSourceKey`
- `currentIndex`
- `currentTrack`
- `playbackMode`

也就是说：

- 左侧云盘页只是浏览列表。
- 右侧抽屉只是展示权威播放队列。
- `next / previous / repeat / shuffle` 只基于 `usePlaybackStore.queue`。

### 3. 起播与补全时序

云盘页播放建议采用与单一来源一致的时序：

1. 页面保持按 `30` 条分页加载浏览列表。
2. 用户点击某一首云盘歌曲。
3. 当前已加载的 `songs` 立即作为首批队列起播：
   - `playQueueFromIndex(songs, index, createCloudQueueSourceKey(userId))`
4. 起播后，后台继续调用 `/user/cloud` 分页补全：
   - 从 `startOffset = songs.length` 开始
   - 继续按分页接口的 `limit / offset` 规则拉取
5. 每补到一页，就通过 `syncQueueFromSource(sourceKey, accumulatedQueue)` 扩容当前播放队列。
6. 如果用户此时打开抽屉，抽屉只复用缓存或正在进行的补全任务。

这样可以保证：

- 点击马上播。
- 不继续滚动云盘页，也不会只停留在当前 30 首。
- 抽屉不会再单独发第二套请求。

### 4. Hydrator 职责扩展

当前 [playback-queue-hydration.model.ts](/F:/code-demo/auralmusic/src/renderer/model/playback-queue-hydration.model.ts:1) 已经支持 `playlist / liked-songs / album`。

云盘接入后建议继续沿用同一个模型，而不是单独在页面里写循环请求。

新增 `cloud` 分支后：

- `resolveQueueSourceDescriptor()` 支持解析 `cloud:<userId>`
- `ensureQueueSourceHydration()` 新增 `cloud` 分支
- `cloud` 分支内部持续调用 `/user/cloud`
- 继续使用统一的：
  - 来源级缓存
  - inflight 任务复用
  - `syncQueueFromSource`

这样模块职责仍然清晰：

- 页面只负责首批起播和来源声明。
- hydrator 负责完整队列补全。

### 5. 页面接入方式

云盘页接入应该尽量最小化，不改变现有分页浏览行为。

建议改动点：

- [LibraryCloudPanel.tsx](/F:/code-demo/auralmusic/src/renderer/pages/Library/components/LibraryCloudPanel.tsx:1)
  - 为 `TrackList` 传入 `playbackQueueKey`
  - `playbackQueueKey` 值为 `createCloudQueueSourceKey(userId)`

- `TrackList`
  - 继续保留现有 `syncQueueFromSource` 逻辑
  - 这样页面在继续滚动时，当前同源播放队列也会被动扩容

- 单曲点击播放
  - 仍沿用 `TrackListPlaybackItem` 的统一链路
  - 只是这次因为来源 key 已存在，后台会自动补整份云盘队列

### 6. 数据模型

云盘补全继续使用当前云盘页面已有的轻量歌曲模型即可。

[library-cloud.model.ts](/F:/code-demo/auralmusic/src/renderer/pages/Library/library-cloud.model.ts:1) 当前映射出的字段已经够播放器和抽屉使用：

- `id`
- `name`
- `artistNames`
- `albumName`
- `coverUrl`
- `duration`

当前 id 解析逻辑为：

- `item.songId ?? item.simpleSong?.id ?? item.id`

这套映射可以直接复用到云盘完整队列补全里，避免引入第二套云盘播放模型。

## 模块边界

### `src/shared/playback.ts`

职责新增：

- 提供 `createCloudQueueSourceKey(userId)`
- `resolveQueueSourceDescriptor()` 支持 `cloud`

### `src/renderer/model/playback-queue-hydration.model.ts`

职责新增：

- 新增 `cloud` 来源补全分支
- 云盘完整队列分页补全
- 缓存与 inflight 任务继续按 `sourceKey` 维度复用

### `LibraryCloudPanel`

职责：

- 保持分页浏览
- 提供 `playbackQueueKey`
- 不自己维护完整播放队列

### `PlaybackQueueDrawer`

职责不变：

- 只展示权威播放队列
- 如果当前来源是 `cloud:<userId>`，只复用缓存或确保 hydration 已启动

## 错误处理

- 云盘后台补全失败时，不中断已经开始的前序播放。
- 抽屉继续展示当前已知队列。
- 补全失败只影响完整队列扩容，不影响当前已播放歌曲。
- 如果播放来源已经切换到别的来源，旧的云盘补全任务不能污染当前队列。

## 风险与边界

### 1. 多账号缓存串用

如果不用 `cloud:<userId>`，只用 `cloud`，缓存会串。

本设计明确要求使用带用户标识的来源 key，避免这个问题。

### 2. 云盘歌曲可播性

云盘歌曲当前使用：

- `item.songId`
- `item.simpleSong?.id`
- `item.id`

这三种口径之一作为播放 id。

如果后续发现某些云盘歌曲虽然能出现在列表里，但某种 id 口径在 URL 解析阶段不可播，那是“云盘歌曲 URL 兼容性”的独立问题，不应与“完整队列补全”混在一起处理。

### 3. 页面继续滚动与后台补全并存

云盘页继续滚动时，`TrackList` 现有的 `syncQueueFromSource` 也会扩容当前队列。

这与后台 hydrator 不冲突，但要求：

- `syncQueueFromSource` 保持幂等
- 同一来源重复扩容不能造成重复条目

当前 store 已有这类保护，可以继续复用。

## 测试策略

至少覆盖：

- 云盘页传入 `cloud:<userId>` 的 `playbackQueueKey`
- 云盘点击播放后走带来源 key 的 `playQueueFromIndex`
- 云盘来源会触发 shared hydrator
- 同一云盘来源的补全任务只复用一个 inflight 任务
- 抽屉打开云盘来源时不重复请求
- 不继续滚动页面时，云盘队列也会后台补齐

## 实施顺序

1. 在 `shared/playback.ts` 增加云盘来源 key 和解析支持。
2. 在 `playback-queue-hydration.model.ts` 增加 `cloud` 补全分支。
3. 在 `LibraryCloudPanel` 传入 `playbackQueueKey`。
4. 补云盘来源 wiring test。
5. 验证抽屉、分页浏览、后台补全三者协同工作。

