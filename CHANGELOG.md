# Changelog

## [1.3.0](https://github.com/auralstorm/auralmusic/compare/v1.2.0...v1.3.0) (2026-04-28)

### Features

- add application logging infrastructure ([277be2e](https://github.com/auralstorm/auralmusic/commit/277be2efaefb3a74900ce2f858abccc17c28f499))
- add builtin multi-platform search metadata ([6714782](https://github.com/auralstorm/auralmusic/commit/671478221e321256813997504608ecd4afd67955))
- add local library detail pages ([fbbe80e](https://github.com/auralstorm/auralmusic/commit/fbbe80ece100fbbc130a6207b0e54c45d66faafd))
- add pixel arcade retro cover preset ([225b1b5](https://github.com/auralstorm/auralmusic/commit/225b1b55937d97d927733d83d68eb5125015824e))
- add vinyl player artwork style ([09d3b5b](https://github.com/auralstorm/auralmusic/commit/09d3b5b24b2d5c28b73d4ba356a50f798ee1073f))
- define pixel arcade retro pipeline ([edee225](https://github.com/auralstorm/auralmusic/commit/edee225cbb3a8a1e5c8e17cf8f146c7b3c09a2d8))
- improve lx playback source handling ([7973f39](https://github.com/auralstorm/auralmusic/commit/7973f39005b5ae88fe6f964b270e5e62e6b061c1))
- polish local library interactions ([f803ca0](https://github.com/auralstorm/auralmusic/commit/f803ca0f279c8acf5898814c910227ef6be4929c))
- register pixel arcade retro preset ([44b5031](https://github.com/auralstorm/auralmusic/commit/44b50317a2f2eb893b1c6e49abeed236c37ec0af))
- route paid tracks by vip fee policy ([df4c89d](https://github.com/auralstorm/auralmusic/commit/df4c89d695f64265db29f711ed20e7a444d18f15))

### Bug Fixes

- hydrate download playback metadata ([b12294c](https://github.com/auralstorm/auralmusic/commit/b12294c5e8f84df95b8de6d0aba5890c56909535))
- normalize migu search cover urls ([48a5b75](https://github.com/auralstorm/auralmusic/commit/48a5b759b4f89fdb5c7dbf45f62c0f2fa07d55fa))
- refine local playback controls ([e11dc07](https://github.com/auralstorm/auralmusic/commit/e11dc0733be3cb6961e860136af836ec9f48fc40))
- refine playback cache and metadata flows ([b847a76](https://github.com/auralstorm/auralmusic/commit/b847a763d4ee53a52de962556dbb4290989389c9))
- refine playback cache and visual cover handling ([16bee3e](https://github.com/auralstorm/auralmusic/commit/16bee3e8162d5ca0773df09ef92a10309f4e48a0))
- set python 3.11 for release packaging ([0349a96](https://github.com/auralstorm/auralmusic/commit/0349a961ecb13a91535e55794938ea6a21a8bf73))

## [1.2.0](https://github.com/auralstorm/auralmusic/compare/v1.1.0...v1.2.0) (2026-04-24)

### Features

- add local library management ([fbfdd22](https://github.com/auralstorm/auralmusic/commit/fbfdd22c68af64bc0a0ea6af1a480bf56ca41d81))
- auto match local covers while playing ([e78b9af](https://github.com/auralstorm/auralmusic/commit/e78b9af0d4b0fa48e8a422764988590d05de57b4))

### Bug Fixes

- harden local lyric online matching ([1271e92](https://github.com/auralstorm/auralmusic/commit/1271e9245facc76766d589e8b0964c30c751bf33))

### Performance Improvements

- skip unchanged local library files during scan ([17cdbcc](https://github.com/auralstorm/auralmusic/commit/17cdbcc3d6dfa65c5302b68d3315901b1616e76d))

## [1.1.0](https://github.com/auralstorm/auralmusic/compare/v1.0.1...v1.1.0) (2026-04-23)

### Features

- add pixi retro cover effects ([9fc4e44](https://github.com/auralstorm/auralmusic/commit/9fc4e44a11a0004cb4d200ec85048ba75c4b682d))
- polish tray, mv drawer, shortcuts and downloads UX ([511058a](https://github.com/auralstorm/auralmusic/commit/511058acfa98ab65faea38de590bc2c11f1b85b8))

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
