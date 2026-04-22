# 快捷键调整设计

日期：2026-04-22
分支：`feature/shortcut-updates`

## 目标

调整主界面快捷键能力，覆盖以下行为：

- 增加全屏/非全屏快捷键
- 将“呼出搜索”调整为“显示/隐藏搜索”，并将快捷键行为改为切换
- 增加左上角前进和后退快捷键
- 增加显示/隐藏播放列表快捷键

本次改动以复用现有窗口、路由、弹窗和抽屉能力为原则，不新增重复状态，不改动现有页面结构。

## 默认键位

本次采用方案 B：

- `Ctrl+Shift+F`：全屏/非全屏
- `Ctrl+K`：显示/隐藏搜索
- `Alt+Left`：后退
- `Alt+Right`：前进
- `Ctrl+Shift+L`：显示/隐藏播放列表

对应全局快捷键：

- `Alt+Ctrl+Shift+F`
- `Alt+Ctrl+K`
- `Alt+Ctrl+Left`
- `Alt+Ctrl+Right`
- `Alt+Ctrl+Shift+L`

## 架构设计

本次变更沿用现有快捷键分层，只扩展职责边界内的模块：

1. `src/shared/shortcut-keys.ts`
负责快捷键动作枚举、默认绑定、格式化、冲突检测和全局快捷键注册数据生成。

2. `src/renderer/components/PlaybackShortcutBridge/index.tsx`
负责监听本地快捷键和接收主进程转发的全局快捷键，再把动作分发到对应的 store、路由或窗口 API。

3. renderer store
搜索弹窗和播放列表抽屉都使用独立 store 承载显隐状态，保证按钮点击和快捷键调用走同一状态源。

4. UI 层
设置页只消费共享快捷键定义和标签映射；头部按钮和播放控制按钮不直接关心快捷键来源。

## 组件与模块拆分

### 1. 快捷键共享定义

调整 `src/shared/shortcut-keys.ts`：

- 新增动作：
  - `toggleFullscreen`
  - `toggleSearch`
  - `navigateBack`
  - `navigateForward`
  - `togglePlaylist`
- 保留现有播放器相关动作
- 更新默认快捷键映射
- 保持本地和全局快捷键冲突检测规则不变

搜索动作名称统一为 `toggleSearch`，避免 UI 文案和实际行为不一致。

### 2. 搜索弹窗状态

调整 `src/renderer/stores/search-dialog-store.ts`：

- 在现有 `openDialog` / `closeDialog` / `setOpen` 基础上新增 `toggleDialog`

这样快捷键和搜索按钮都能复用同一个状态模型，避免桥接层直接读写布尔值。

### 3. 播放列表抽屉状态

新增播放列表抽屉 store，建议命名为 `src/renderer/stores/playback-queue-drawer-store.ts`：

- `open`
- `setOpen`
- `openDrawer`
- `closeDrawer`
- `toggleDrawer`

播放控制区按钮继续作为展示入口，实际状态迁移到独立 store。`PlaybackQueueDrawer` 改为消费该 store，不再依赖上层局部状态。

### 4. 快捷键桥接

调整 `src/renderer/components/PlaybackShortcutBridge/index.tsx`：

- 继续统一监听本地快捷键和 Electron 全局快捷键事件
- 新增动作分发：
  - 全屏切换：调用 `window.electronWindow?.toggleFullScreen()`
  - 搜索切换：调用 `useSearchDialogStore.getState().toggleDialog()`
  - 后退：调用共享路由实例向后导航
  - 前进：调用共享路由实例向前导航
  - 播放列表切换：调用播放列表抽屉 store 的 `toggleDrawer()`

桥接层只负责协调，不持有页面级 UI 状态。

### 5. 设置页文案

调整 `src/renderer/pages/Settings/components/ShortcutKeySettings.tsx`：

- 新增 4 个动作的中文文案
- 将 `openSearch` 文案调整为“显示/隐藏搜索”，对应 `toggleSearch`

设置页的渲染顺序保持与共享动作列表一致。

## 数据流

### 搜索切换

1. 用户按下本地或全局快捷键
2. `PlaybackShortcutBridge` 解析为 `toggleSearch`
3. 调用 `search-dialog-store.toggleDialog()`
4. `SearchDialog` 根据 store 中的 `open` 状态开关弹窗

### 播放列表切换

1. 用户点击播放控制区按钮，或按下快捷键
2. 两者都调用播放列表抽屉 store
3. `PlaybackQueueDrawer` 订阅 store 中的 `open`
4. 抽屉统一开关，不再出现按钮和快捷键状态不同步

### 前进/后退

1. 用户按下快捷键
2. `PlaybackShortcutBridge` 调用共享路由实例
3. React Router 基于当前 hash 历史栈执行前进/后退
4. 左上角按钮和快捷键行为保持一致

### 全屏切换

1. 用户按下快捷键
2. `PlaybackShortcutBridge` 调用 Electron preload 暴露的窗口 API
3. 主进程切换系统窗口全屏状态
4. 已有窗口全屏监听能力继续生效

## 错误处理

- 如果 `electronWindow` preload API 不可用，全屏快捷键静默失败，并沿用现有 runtime 警告机制
- 路由前进/后退在历史栈不足时由 React Router 自行兜底，不额外维护自定义历史记录
- 搜索和播放列表切换不依赖异步请求，不增加额外错误提示
- 全局快捷键注册失败继续沿用现有状态提示逻辑，由设置页显示注册失败态

## 测试策略

遵循先测后改，至少补充以下测试：

1. `tests/shortcut-keys.test.ts`
- 断言动作数量增加
- 断言新增动作默认键位正确
- 断言全局快捷键注册数据包含新增动作

2. `tests/search-dialog-store.test.ts`
- 断言 `toggleDialog` 可在开关之间切换

3. 新增播放列表抽屉 store 测试
- 断言 `openDrawer` / `closeDrawer` / `toggleDrawer` 行为正确

4. 源码接线测试
- 校验 `PlaybackShortcutBridge` 包含新增动作分发
- 校验设置页展示“显示/隐藏搜索”等新文案

## 范围边界

本次不包含以下内容：

- 不调整现有播放器功能快捷键
- 不修改搜索弹窗内部搜索逻辑
- 不新增页面级历史管理
- 不重构 Header 按钮视觉样式
- 不处理与本次需求无关的构建存量错误

## 实施结果判定

满足以下条件视为完成：

- 设置页可配置并展示新增快捷键
- “显示/隐藏搜索”快捷键可反复切换搜索弹窗
- 前进/后退快捷键与左上角按钮行为一致
- 播放列表按钮和快捷键共用同一开关状态
- 全屏快捷键可切换窗口全屏/非全屏
