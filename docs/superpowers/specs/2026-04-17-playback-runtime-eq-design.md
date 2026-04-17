# Playback Runtime 与 EQ 重构设计

## 背景

当前播放器的播放链路主要由 React 组件 `PlaybackEngine.tsx` 驱动。EQ 一期接入时，播放状态、`HTMLAudioElement` 生命周期、Web Audio graph、输出设备切换、音源解析和缓存回填发生了交叉耦合，已经出现过以下问题：

- 开启 EQ 后播放无响应
- 输出设备切换失败
- 启动即弹出设备错误提示
- 为修复 EQ 引入的改动反过来破坏普通播放链路

参考 `algerkong/AlgerMusicPlayer` 后，可以确认稳定模式不是“在页面层追加 EQ”，而是“将播放运行时统一收口到单例服务中，页面只改参数，不直接改播放对象”。

## 目标

本次重构目标有三点：

1. 恢复并保持普通播放链路稳定
2. 为 EQ 提供不会破坏播放主链路的接入点
3. 将输出设备切换、EQ graph、音频对象生命周期统一收口

## 非目标

本次不处理以下内容：

- 不调整 EQ 弹框的结构层级和布局骨架
- 不重写音源解析、下载、本地缓存的业务策略
- 不引入新的音频库
- 不扩展频谱动画、可视化、自定义预设管理

## 方案选择

### 方案 A：继续在 `PlaybackEngine.tsx` 内直接接 EQ

优点：

- 改动面小

缺点：

- React 生命周期继续直接影响音频运行时
- 播放、EQ、输出设备、副作用时序继续耦合
- 已经被实践证明不稳定

不采用。

### 方案 B：抽离单例 Playback Runtime

优点：

- 播放运行时与 React 树解耦
- `HTMLAudioElement`、AudioContext、EQ graph、输出设备切换有统一 owner
- 便于分阶段恢复 EQ

缺点：

- 需要整理当前 `PlaybackEngine` 的职责边界
- 需要补一批运行时契约测试

采用本方案。

### 方案 C：重写整条播放链

优点：

- 理论上最干净

缺点：

- 范围过大
- 会把缓存、会话恢复、下载、本地播放一起卷进来

当前迭代不采用。

## 总体架构

新增 renderer 侧播放运行时层：

`playback-store -> playback-runtime -> HTMLAudioElement / AudioContext`

其中职责如下：

- `playback-store`
  - 保存业务状态
  - 管理当前曲目、队列、播放意图、会话恢复状态
  - 不直接创建或持有音频图节点

- `playback-runtime`
  - 唯一持有全局 `HTMLAudioElement`
  - 唯一持有 `AudioContext`
  - 唯一创建 `MediaElementAudioSourceNode`
  - 唯一管理 EQ filter chain
  - 唯一负责输出设备切换
  - 对外暴露有限控制接口

- `PlaybackEngine`
  - 从“播放实现者”退化为“桥接组件”
  - 负责订阅 store、驱动 runtime、同步 UI 所需状态
  - 不直接维护 graph

- `EqualizerSettingsDialog`
  - 只编辑配置
  - 不直接操作 `audio` 或 graph
  - 保持当前用户已经调整过的弹框结构

## 模块拆分

### 1. `src/renderer/audio/playback-runtime/playback-runtime.ts`

新增播放运行时模块，导出单例实例。

核心职责：

- 初始化并持有单一 `HTMLAudioElement`
- 管理 `play/pause/stop/seek/loadSource`
- 注册原生媒体事件并对外订阅
- 管理播放速率、音量、输出设备
- 懒初始化 EQ graph
- 在启用 EQ 时只更新 graph，不重建 audio

建议接口：

- `getAudioElement()`
- `loadSource(url, options)`
- `play()`
- `pause()`
- `stop()`
- `seek(time)`
- `setPlaybackRate(rate)`
- `setVolume(volume)`
- `setOutputDevice(deviceId)`
- `applyEqualizer(config)`
- `subscribe(listener)`

### 2. `src/renderer/audio/playback-runtime/playback-runtime.model.ts`

放置纯模型函数，减少运行时主文件复杂度。

职责：

- 规范化设备 ID
- 计算运行时是否需要变更 graph
- 构造标准化事件 payload
- 处理 `default` 设备与空值的策略

### 3. `src/renderer/audio/equalizer/equalizer-graph.ts`

保留 EQ graph，但从“组件 hook 附属逻辑”改成“runtime 内部基础设施”。

职责：

- 接收现有 `audio` 元素
- 仅创建一次 `MediaElementAudioSourceNode`
- 创建 `preamp + filters + destination`
- 支持 bypass 切换
- 支持更新每个频段 gain
- 支持释放内部连接

关键约束：

- 同一个 `audio` 元素只允许执行一次 `createMediaElementSource`
- EQ 开关必须走 bypass，不允许通过销毁 audio 或重建 audio 达成

### 4. `src/renderer/components/PlaybackControl/PlaybackEngine.tsx`

重构为桥接组件。

保留职责：

- 读取 `playback-store`
- 在副作用中调用 runtime 的公开接口
- 把 runtime 事件同步回 store

移除职责：

- 不再直接 new `Audio()`
- 不再直接连接 graph
- 不再直接管理输出设备切换

### 5. `src/renderer/stores/config-store.ts`

保留 EQ 配置读写职责，但只负责配置状态，不做 graph 调用。

## 数据流

### 普通播放

1. 用户双击歌曲
2. `playback-store` 更新当前曲目和播放意图
3. `PlaybackEngine` 观察到目标曲目变化
4. `PlaybackEngine` 调用 `playback-runtime.loadSource(url)`
5. runtime 停止旧音频并切换 `audio.src`
6. runtime 在 `canplay` 后执行 `audio.play()`
7. runtime 通过事件把 `playing/loading/error/timeupdate` 同步回 store

### EQ 配置变更

1. 用户在 EQ 弹框中调整参数
2. UI 只更新配置 store
3. `PlaybackEngine` 或 runtime 配置订阅监听到配置变化
4. runtime 调用 `applyEqualizer(config)`
5. graph 更新 bypass / preamp / filters
6. 当前播放即时生效，不改动 `audio.src`

### 输出设备切换

1. 用户在设置页切换设备
2. 配置变更进入 runtime
3. runtime 根据当前链路能力处理
4. 失败时只回退设备状态并提示，不允许破坏当前播放状态

## 输出设备策略

这是本次设计里最需要收紧的地方。

约束如下：

- 默认设备 `default` 不做激进转换，不允许擅自变成空字符串
- 未启用 EQ 时，优先沿用 `HTMLAudioElement` 路径
- 启用 EQ 时，优先尝试当前 Chromium/Electron 能力支持的 graph 输出路由
- 若特定设备切换失败，必须保证默认播放链路仍可继续
- “切设备失败”不能升级成“整首歌无法播放”

实现上需要把“设备切换失败”和“播放失败”拆成两个错误域，避免 toast 和播放状态互相污染。

## 错误处理

runtime 统一输出以下错误类型：

- `source_load_failed`
- `play_failed`
- `output_device_failed`
- `audio_context_failed`
- `graph_failed`

处理原则：

- `output_device_failed` 只影响设备状态，不直接中断当前曲目加载
- `graph_failed` 自动回退到无 EQ 的直连播放路径
- `source_load_failed` 才允许进入“暂时无法播放”提示

## 测试策略

新增或调整以下测试：

- `tests/playback-runtime.model.test.ts`
  - 设备 ID 规范化
  - 默认设备策略
  - 错误域分类

- `tests/playback-runtime.test.ts`
  - 单例 audio 生命周期
  - 切歌只换 `src`
  - 停止旧音频后再加载新音频
  - 输出设备失败不影响普通播放

- `tests/equalizer-graph.test.ts`
  - graph 只初始化一次
  - bypass 生效
  - 更新增益不重建 graph

- `tests/playback-engine.integration.test.ts`
  - store 与 runtime 同步
  - 配置变更能驱动 runtime

## 实施步骤

### 阶段 1：收口播放运行时

- 新建 `playback-runtime`
- 把 `Audio` 对象和原生事件迁移进去
- `PlaybackEngine` 改为调用 runtime
- 保持 EQ 运行时先关闭，确保普通播放稳定

### 阶段 2：恢复 EQ runtime 接入

- runtime 内接入 `equalizer-graph`
- 只支持 bypass 和 10 段增益更新
- 不变更 EQ 弹框结构

### 阶段 3：恢复输出设备能力

- 在 runtime 中重新接入输出设备切换
- 分离“设备切换失败”和“播放失败”
- 验证默认输出和指定输出的回退逻辑

## 验收标准

- EQ 关闭时，普通播放、暂停、切歌、恢复播放全部正常
- EQ 开启时，普通播放链路不被破坏
- 输出设备切换失败时，仍可继续用默认设备播放
- 双击歌曲后，旧音频立即停止，新音频进入明确的加载态
- 不修改现有 EQ 弹框结构层级

## 风险与缓解

### 风险 1：Electron 当前版本对 graph 输出设备支持不稳定

缓解：

- 先保证默认输出播放可用
- 输出设备切换作为独立错误域处理
- 必要时保留“EQ 开启时只支持默认输出”的降级策略，但不影响主播放

### 风险 2：重构过程中回归普通播放

缓解：

- 分阶段实施
- 每一阶段先恢复最小可用链路
- 用契约测试锁定 audio 生命周期

### 风险 3：React 副作用与 runtime 状态重复驱动

缓解：

- `PlaybackEngine` 只做桥接，不持有底层资源
- 所有底层资源变化必须通过 runtime 完成

## 结果预期

完成重构后，EQ 会从“附着在组件副作用上的增强功能”变成“播放器运行时内部的可选处理链”。这样后续再扩展预设、Preamp、输出设备兼容时，不需要继续触碰页面层播放实现。
