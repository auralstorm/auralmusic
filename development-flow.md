# AuralMusic 开发流程与规范（最新版）

本文档用于约束当前仓库 `auralmusic` 的日常开发、提测、发布与 CI/CD 流程。
目标是让团队按同一套标准进行开发，减少返工和发布事故。

## 1. 技术栈与目录职责

项目基于：

- `Electron + electron-vite`
- `React 19 + TypeScript`
- `Tailwind CSS`
- `zustand`
- `electron-builder`

目录分层：

- `src/main`：主进程，负责窗口、系统能力、IPC 服务
- `src/preload`：安全桥接层，向渲染进程暴露受控 API
- `src/renderer`：前端业务层，页面、组件、状态、请求与交互

关键原则：

- 页面业务逻辑默认只放 `renderer`
- 仅在需要系统能力时才改 `main/preload`
- 不允许页面直接越过预加载层访问 Node 能力

## 2. 组件设计规范

遵循“高内聚、低耦合、单一职责、复用优先”：

- 基础 UI 抽到 `src/renderer/components/ui`
- 跨页面业务组件放到 `src/renderer/components`
- 页面私有组件放到 `src/renderer/pages/<Feature>/components`
- 容器组件负责“取数 + 组装状态”
- 展示组件只负责渲染，不混入请求与副作用

推荐页面结构：

```text
src/renderer/pages/FeatureX/
  index.tsx
  model/
  types/
  components/
```

## 3. 状态与数据约束

- 页面私有状态优先 `useState/useReducer`
- 跨页面共享状态再放 `zustand`
- API 调用统一走 `src/renderer/api`，页面不直接写底层请求实例
- 请求聚合优先在 `model` 层完成，避免在 JSX 内做数据拼装

## 4. 路由与滚动策略

- 路由配置统一维护在 `src/renderer/router`
- `KeepAliveRouteOutlet` 缓存页与非缓存页分开处理滚动恢复
- 缓存页激活回顶：`useScrollToTopOnActive`
- 非缓存页进入回顶：`useScrollToTopOnRouteEnter`

## 5. 性能基线（当前项目必须遵守）

- 播放进度同步频率固定为 `30 FPS`（`~33ms`）
- 进度订阅只允许在最小可视区域组件内使用，避免整条 footer 重渲染
- 图片禁止“首屏整批预解析”
- 图片加载优先使用可视区触发（IntersectionObserver）与懒加载
- 高成本组件（歌词、3D、动态背景）必须按场景启停，避免后台持续运行

## 6. 本地开发与提交流程

常用脚本：

- `pnpm dev`
- `pnpm dev:web`
- `pnpm lint`
- `pnpm build`
- `pnpm check`
- `pnpm commit`
- `pnpm release`

标准开发顺序：

1. 新建分支：`feat/*` 或 `fix/*`
2. 实现功能并本地联调：`pnpm dev`
3. 质量检查：`pnpm lint`
4. 构建检查：`pnpm build`
5. 规范提交：`pnpm commit`（Conventional Commits）
6. 发起 PR

提交规范：

- 使用 `cz-git` 生成 commit message
- Husky + lint-staged 会在提交时执行格式化与静态检查
- 禁止提交未通过 lint/build 的代码

## 7. CI/CD 流程（已接入 GitHub Actions）

### 7.1 CI 工作流

文件：`.github/workflows/ci.yml`

- 触发：`pull_request`、`push(main/master)`
- 执行：`pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm build`

### 7.2 Release 工作流

文件：`.github/workflows/release.yml`

- 触发：`push(main)`
- 动作：执行 `pnpm release --ci`
- 结果：更新 `CHANGELOG.md`、创建版本提交、打 `v*` tag、创建 GitHub Release
- 防循环：跳过 `chore: release v*` 触发

### 7.3 Package 工作流

文件：`.github/workflows/package.yml`

- 触发：`push tags(v*)` 或手动触发
- 矩阵：`windows-latest`、`macos-latest`、`ubuntu-latest`
- 动作：跨平台构建并发布安装包到同一 Release

### 7.4 发布配置

- `electron-builder.yml` 已配置 GitHub publish：
  - `provider: github`
  - `owner: 1769762790`
  - `repo: auralmusic`
- `.release-it.json` 已启用：
  - `git.push: true`
  - `github.release: true`

## 8. GitHub 仓库必须配置

在仓库设置中确认：

1. `Actions > Workflow permissions` 设为 `Read and write permissions`
2. 主分支开启保护，要求 `CI` 必须通过后才能合并
3. 若后续需要签名/公证，补齐对应 secrets（如证书相关变量）

## 9. 发布操作手册

日常版本发布建议：

1. 业务 PR 合并到 `main`
2. `release.yml` 自动生成 changelog、tag、release
3. `package.yml` 在 tag 事件下自动构建并上传安装包
4. 在 GitHub Release 页面验收资产与说明

本地手动发布（仅紧急场景）：

- `pnpm release --ci`

## 10. 合并前检查清单

- 功能范围与 PR 标题一致
- 无临时调试代码与无效日志
- `pnpm lint` 通过
- `pnpm build` 通过
- 文档与配置同步更新
- 关键行为有测试或手动回归说明

## 11. 备注

- PowerShell 环境如果遇到 `pnpm.ps1` 执行策略拦截，使用 `pnpm.cmd` 执行命令
- 开发版与安装版不要同时运行，避免共享缓存目录导致异常日志
