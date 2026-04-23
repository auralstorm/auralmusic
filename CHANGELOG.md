# Changelog

## [1.0.1](https://github.com/auralstorm/auralmusic/compare/v1.0.0...v1.0.1) (2026-04-23)

### Features

- add shared shortcut visibility stores ([9bbeff2](https://github.com/auralstorm/auralmusic/commit/9bbeff24a0faebc6d18f28254310e391bd9d61e6))
- hydrate playback queues by source ([9617243](https://github.com/auralstorm/auralmusic/commit/9617243c1eb2b468f4a69b6e2fa1bbe79acdaea3))
- hydrate playlist queue from drawer source ([35e6d07](https://github.com/auralstorm/auralmusic/commit/35e6d074e9be604c6ece7f66d118c34afce5916f))
- improve artist navigation and latest release playback UX ([b29b7f4](https://github.com/auralstorm/auralmusic/commit/b29b7f460d18acf1a3b6c8a051246c1cdb0a9eeb))
- optimize intel mac translucent surfaces ([3a9a7a6](https://github.com/auralstorm/auralmusic/commit/3a9a7a62f1fb762c5435c2a9964feada8a4f0c05))
- wire shortcut action integrations ([98e8a0d](https://github.com/auralstorm/auralmusic/commit/98e8a0df62b0ee39e661a1d1a21682a20d987d5d))

### Bug Fixes

- isolate equalizer preview updates ([a4f4a85](https://github.com/auralstorm/auralmusic/commit/a4f4a85a39cf740c7454e6604389dabbf822c0b1))
- keep playback queue drawer mounted ([6cea05a](https://github.com/auralstorm/auralmusic/commit/6cea05a522fb10c740a3d7e6aef1a68bc8cad769))
- narrow playback queue source hydration ([4fdfc6a](https://github.com/auralstorm/auralmusic/commit/4fdfc6a14997a41beeeb20376f23ff0a1b288d2b))
- narrow renderer store subscriptions ([ea3f2a9](https://github.com/auralstorm/auralmusic/commit/ea3f2a9ab8690ef515fb855c6b322cc4e39c78fa))
- resolve player scene render gating and settings hydration ([39a28f6](https://github.com/auralstorm/auralmusic/commit/39a28f61f4978d9f760c0e6c07382ba6de2fd5c6))
- smooth playback control transition ([0f91e7a](https://github.com/auralstorm/auralmusic/commit/0f91e7a19f8fb0353e69a446c26cacde5b1417f6))
- stabilize player scene playback transitions ([7454b3a](https://github.com/auralstorm/auralmusic/commit/7454b3af6eeb5bcce7cd7beee1909f2a1d9a67fa))

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
