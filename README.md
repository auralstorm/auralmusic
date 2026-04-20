# Aural Music

<p align="center">
  <img src="./build/icons/256x256.png" alt="Aural Music Logo" width="128" height="128">
</p>

<p align="center">
  <a href="https://github.com/auralmusic/auralmusic"><img src="https://img.shields.io/github/stars/auralmusic/auralmusic?style=for-the-badge" alt="GitHub Stars"></a>
  <a href="https://github.com/auralmusic/auralmusic/releases"><img src="https://img.shields.io/github/v/release/auralmusic/auralmusic?style=for-the-badge" alt="Latest Release"></a>
  <a href="https://github.com/auralmusic/auralmusic/blob/main/LICENSE"><img src="https://img.shields.io/github/license/auralmusic/auralmusic?style=for-the-badge" alt="License"></a>
</p>

<p align="center">
  <strong>A modern, cross-platform music player built with Electron, React, and TypeScript</strong>
</p>

## 🎵 功能特点

### 界面预览

<p align="center">
  <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; max-width: 1200px; margin: 0 auto;">
    <img src="./docs/screenshots/home.png" alt="Home Page" width="23%" style="border-radius: 8px; object-fit: cover;">
    <img src="./docs/screenshots/rank.png" alt="Rank Page" width="23%" style="border-radius: 8px; object-fit: cover;">
    <img src="./docs/screenshots/artist.png" alt="Artist Page" width="23%" style="border-radius: 8px; object-fit: cover;">
    <img src="./docs/screenshots/player.png" alt="Player Page" width="23%" style="border-radius: 8px; object-fit: cover;">
  </div>
</p>

### 核心功能

- 🎧 高品质音乐播放
- 📱 优雅的用户界面
- 🌙 深色/浅色主题
- 🔍 智能搜索
- 📋 播放列表管理
- 💾 音乐下载
- 🎨 3D 视觉效果
- 🎤 歌词显示
- ⚡ 全局快捷键
- 📦 多音乐源支持

### 高级功能

- 🎚️ 均衡器设置
- 🌐 网络音乐源
- 📁 本地音乐库
- 🔄 播放历史记录
- 🎯 个性化推荐
- 📱 响应式设计
- 🛠️ 丰富的设置选项
- 📄 歌曲详情页
- 🎵 专辑和艺术家浏览
- 🏆 音乐排行榜

## 🛠️ 技术栈

### 前端

- **框架**: React 19.1.0
- **路由**: React Router 7.14.0
- **状态管理**: Zustand 5.0.12
- **样式**: Tailwind CSS 4.2.2
- **UI组件**: Shadcn UI 4.1.2
- **构建工具**: Vite 6.0.0

### 桌面应用

- **框架**: Electron 41.1.1
- **构建工具**: Electron Vite 5.0.0
- **打包工具**: Electron Builder

### 音频处理

- **播放器**: Plyr React 6.0.0
- **音频分析**: Web Audio API
- **3D效果**: Three.js 0.183.2 + React Three Fiber 9.5.0

### 网络请求

- **HTTP客户端**: Axios 1.14.0
- **音乐API**: Netease Cloud Music API 4.31.0

### 开发工具

- **语言**: TypeScript 5.8.3
- **代码质量**: ESLint + Prettier
- **测试**: 单元测试
- **CI/CD**: GitHub Actions

## 📦 安装和运行

### 前提条件

- Node.js 18.0.0 或更高版本
- pnpm 8.0.0 或更高版本

### 安装

```bash
# 克隆仓库
git clone https://github.com/auralmusic/auralmusic.git

# 进入目录
cd auralmusic

# 安装依赖
pnpm install
```

### 开发模式

```bash
# 启动开发服务器
pnpm run dev
```

### 构建

```bash
# 构建所有平台
pnpm run build

# 构建特定平台
pnpm run build:win    # Windows
pnpm run build:mac    # macOS
pnpm run build:linux  # Linux
```

### 发布（单命令）

当前项目的发布入口是本地 `release-it`，一条命令完成版本、变更日志、Tag 与 GitHub Release：

```bash
pnpm run release
```

发布前提：

- 在 `main` 分支且工作区干净
- 本地环境已配置 `GITHUB_TOKEN`（具有 `repo` 权限）
- 仓库规则允许维护者推送 `main` 与 `v*` tag

发布链路说明：

1. `pnpm run release` 自动更新版本号、生成/更新 `CHANGELOG.md`、提交并打 `v*` tag
2. 推送后触发 `.github/workflows/package.yml`
3. `Package` workflow 进行 Win/macOS/Linux 构建并把产物上传到该 tag 的 GitHub Release

## 📁 项目结构

```
src/
├── main/          # 主进程代码
│   ├── app/       # 应用核心逻辑
│   ├── auth/      # 认证管理
│   ├── cache/     # 缓存服务
│   ├── config/    # 配置管理
│   ├── download/  # 下载服务
│   ├── ipc/       # 进程间通信
│   ├── music-source/ # 音乐源管理
│   ├── window/    # 窗口管理
│   └── index.ts   # 主入口
├── preload/       # 预加载脚本
│   ├── api/       # API 暴露
│   └── index.ts   # 预加载入口
├── renderer/      # 渲染进程代码
│   ├── api/       # API 调用
│   ├── components/ # UI 组件
│   ├── pages/     # 页面
│   ├── router/    # 路由
│   ├── services/  # 业务服务
│   ├── stores/    # 状态管理
│   └── main.tsx   # 渲染入口
└── shared/        # 共享代码
    ├── ipc/       # IPC 类型定义
    └── music-source/ # 音乐源相关
```

## 🎯 核心功能

### 音乐播放

- 支持多种音频格式
- 高品质音频播放
- 播放控制（播放/暂停/上一首/下一首）
- 播放队列管理
- 音量控制和静音

### 音乐源

- 网易云音乐 API
- LX 音乐源

### 下载管理

- 多品质下载
- 下载队列管理
- 下载历史记录
- 自定义下载目录

### 用户界面

- 响应式设计
- 3D 视觉效果
- 动态歌词显示
- 主题切换
- 播放状态显示

### 设置选项

- 音频设置
- 下载设置
- 快捷键设置
- 系统设置
- 音乐源设置

## ⚙️ 配置说明

### 主要配置项

- **audioOutputDeviceId**: 音频输出设备 ID
- **autoStartEnabled**: 开机自启
- **closeBehavior**: 关闭行为（询问/最小化到托盘/直接退出）
- **downloadDir**: 下载目录
- **downloadQuality**: 下载音质
- **eqEnabled**: 均衡器启用状态
- **musicSourceEnabled**: 音乐源启用状态
- **quality**: 播放音质
- **theme**: 主题设置

### 配置文件位置

- Windows: `%APPDATA%\auralmusic\config.json`
- macOS: `~/Library/Application Support/auralmusic/config.json`
- Linux: `~/.config/auralmusic/config.json`

## 🤝 贡献指南

### 开发流程

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 提交信息使用语义化格式

## 📄 许可证

本项目使用 [MIT 许可证](LICENSE)。

## 📞 联系方式

- **GitHub**: [auralmusic/auralmusic](https://github.com/auralmusic/auralmusic)
- **Issues**: [Bug 报告和功能请求](https://github.com/auralmusic/auralmusic/issues)

---

<p align="center">
  享受音乐，享受生活 🎵
</p>
