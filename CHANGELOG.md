# Changelog

## [1.2.0](https://github.com/1769762790/auralmusic/compare/v1.1.0...v1.2.0) (2026-04-22)

### Features

- optimize renderer interactions and shared ui ([9f903a3](https://github.com/1769762790/auralmusic/commit/9f903a3c6dd37302e5d2389d62a081f3fa84b907))
- polish playback fade and playlist interactions ([1384298](https://github.com/1769762790/auralmusic/commit/138429888b1b7a06b675293282ad226cea367128))
- route search mv results to mv drawer ([0dfebdd](https://github.com/1769762790/auralmusic/commit/0dfebddbc4ee4847c42cfde04804f916b3855f9f))
- surface global shortcut registration conflicts ([2d301fa](https://github.com/1769762790/auralmusic/commit/2d301fa9e2ce8d64bb8a14709934bfb557430e07))
- virtualize track lists with react virtuoso ([325b0e4](https://github.com/1769762790/auralmusic/commit/325b0e4f8aa5c7b76e27a15b916a2e7a9f01b829))

### Bug Fixes

- import path ([0ec5d00](https://github.com/1769762790/auralmusic/commit/0ec5d002a1298a8cd38ecfa3a3d914bbb55cc8be))
- normalize library mv responses ([8f65792](https://github.com/1769762790/auralmusic/commit/8f65792167563e0201332270858d70548438284c))
- stabilize virtualized playback queue behavior ([1a27fbb](https://github.com/1769762790/auralmusic/commit/1a27fbb5c50332e5741805470c667f9c9bfa56d8))

## [1.1.0](https://github.com/1769762790/auralmusic/compare/v1.0.0...v1.1.0) (2026-04-21)

### Features

- add app updater flow ([19ab25c](https://github.com/1769762790/auralmusic/commit/19ab25cb9e38af156515af9ffa8590e35538ed4b))

### Bug Fixes

- dev flow ([fcd7e5a](https://github.com/1769762790/auralmusic/commit/fcd7e5a92d901d4ab74ff632f724decfb091fb71))
- fix gh script ([914b7fb](https://github.com/1769762790/auralmusic/commit/914b7fb8543d5abe6793ff23e3c106861d9951ec))

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-04-20

### Added

- 项目初始化：基于 Electron + React + TypeScript。
- 播放能力：支持播放/暂停/上一曲/下一曲/进度控制。
- 音源接入：集成网易云音乐 API，支持在线歌曲播放。
- 歌词与视觉：实现动态歌词与背景色提取。
- 页面模块：首页推荐、音乐排行榜、歌手详情、全屏播放页。
- 主题系统：支持深色/浅色模式切换。
- 数据持久化：用户配置与播放记录本地存储。
- 打包产物：提供 Windows 安装版与便携版。
