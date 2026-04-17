# All Playlist Play Design

## Goal

补齐 `src/renderer/pages/PlayList/components/AllPlayList/index.tsx` 的 `handlePlay`，让用户在歌单列表中点击播放按钮时，能够像歌单详情页一样把整张歌单入队并从第一首开始播放。

## Scope

- 仅处理 `AllPlayList` 卡片播放按钮。
- 复用现有 `getPlaylistTracks` 和 `usePlaybackStore` 播放协议。
- 保持展示组件无业务状态，播放请求状态留在页面容器。

## Design

### Data Flow

1. `handlePlay` 接收歌单 id。
2. 组件通过轻量 model 生成歌单曲目请求参数。
3. 调用 `getPlaylistTracks` 拉取歌单歌曲。
4. 轻量 model 将接口返回的歌曲转换为 `PlaybackTrack[]`。
5. 当队列非空时调用 `playQueueFromIndex(queue, 0)` 开始播放。

### Boundaries

- `AllPlayList/index.tsx`
  - 负责点击事件、请求生命周期、toast 和调用播放器 store。
- `AllPlayList` 邻接 model 文件
  - 负责请求参数构建和曲目到 `PlaybackTrack` 的纯转换。
- `ArtistCover`
  - 继续只负责展示，不感知播放请求状态。

### Error Handling

- 重复点击时忽略新的播放请求。
- 空歌单提示“暂无可播放的歌单歌曲”。
- 请求失败提示“歌单播放失败，请稍后重试”，并保留错误日志。

## Testing

- 新增纯模型测试，验证请求参数和歌曲到 `PlaybackTrack` 的转换。
- 覆盖正常映射、缺省字段兜底和空数组场景。
