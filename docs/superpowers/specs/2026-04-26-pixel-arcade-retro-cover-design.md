# 像素街机 CRT 复古封面设计

日期：2026-04-26
分支：`feat/fee-based-source-routing`

## 目标

在现有“复古封面质感”预设体系里新增一个强风格选项：`像素街机 CRT`。

这个预设的目标不是做轻微像素化，而是做出明显的老游戏机 / 街机显示器味道：

- 像素块感清晰可见
- 扫描线存在感明显
- 有 CRT 暗角和轻微频闪
- 色彩更偏掌机 / 街机屏幕，而不是普通图片马赛克

本次改动继续沿用现有 Pixi 统一封面渲染链，不新增第二套封面组件，不新增独立设置开关。

## 交互与产品定义

“复古封面质感”设置项新增一个选项：

- 文案：`像素街机 CRT`
- 值：`pixelArcade`

该预设与现有预设保持同级关系：

- 关闭
- CCD 数码复古
- 柯达金胶卷
- 千禧 Y2K
- 港风电影复古
- 低饱和灰调旧胶片
- 经典黑胶封面
- CRT 老式显像管
- 拍立得复古
- 像素街机 CRT

它不是温和风格，也不是默认推荐项，而是一个明确的强风格预设。

## 视觉方向

`pixelArcade` 的最终观感需要同时满足这几件事：

1. 封面主体被像素化，而不是只做模糊或锐化。
2. 扫描线和屏幕暗角明显，但不能盖过主体。
3. 色彩要更像老掌机 / 街机屏，不做现代 OLED 的纯净高饱和。
4. 整体要有老显示器味道，但不能脏成“坏掉的视频滤镜”。

和现有 `crt` 预设的区别是：

- `crt`：温和显像管氛围，保留封面清晰度
- `pixelArcade`：主动降低细节分辨率，强调像素块和屏幕感

## 架构设计

本次改动继续沿用现有复古预设分层：

1. `src/shared/config.ts`
负责预设枚举和设置页选项元数据。

2. `src/renderer/components/PlayerScene/player-scene-retro.model.ts`
负责定义预设参数模型和具体 preset pipeline。

3. `src/renderer/components/PlayerScene/WaterRippleCover.tsx`
负责真正的 Pixi 渲染与动态控制。

本次不会新增第二套封面组件，也不会把像素风单独拆成另一条 Three/Pixi 渲染链。

## 参数模型扩展

当前 `RetroPresetPipeline` 只覆盖颜色、模糊、噪点、叠层和频闪，不足以表达真正的像素化。

因此需要在模型层新增像素化参数，建议最小扩展为：

- `pixelateEnabled: boolean`
- `pixelBlockSize: number`
- `pixelPaletteSteps: number`

含义约定：

- `pixelateEnabled`
  控制该预设是否启用像素化渲染路径。

- `pixelBlockSize`
  控制像素块大小。`pixelArcade` 需要明显大于普通细节缩放，保证一眼能看出像素屏质感。

- `pixelPaletteSteps`
  控制颜色离散程度，避免只是“低分辨率原图”。

其余现有参数继续复用：

- `scanlineAlpha`
- `scanlineGap`
- `vignetteAlpha`
- `flickerAmplitude`
- `noiseIntensity`
- `blurStrength`

## `pixelArcade` 预设基线

首版建议采用下面的基线方向：

- 颜色：
  - 轻微偏冷或偏青绿
  - 饱和度略降
  - 对比略收
- 像素化：
  - `pixelateEnabled = true`
  - `pixelBlockSize` 明显大于 1，保证像素块存在感
  - `pixelPaletteSteps` 收紧到较低数量，做出减色屏幕感
- 叠层：
  - 扫描线明显强于 `crt`
  - 暗角中等偏上
  - 不加 light leak
- 动态：
  - 保留轻微 CRT flicker
  - 不增加胶片噪点动画存在感

### 明确取舍

`pixelArcade` 开启时，不保留现有动态封面水波纹风格。

原因：

- 像素屏和水波纹形变风格冲突
- 两者叠加后更像损坏的视频效果，而不是街机/掌机屏幕

本次规则固定为：

- 如果当前预设是 `pixelArcade`
- 即使 `dynamicCoverEnabled = true`
- 也将水波纹强度压到几乎不可见
- 仅保留扫描线、轻频闪等符合屏幕语义的动态

## 渲染实现方式

本次不采用“纯滤镜假装像素感”的方案。

首选实现方式是：

1. 先把封面绘制到低分辨率离屏纹理
2. 再以 `nearest` 采样方式放大回显示尺寸
3. 最后继续叠加扫描线、暗角和 flicker

这样做的原因是：

- 只有降采样再放大，像素块边界才是可信的
- 单纯靠 blur、contrast、scanline 只能模拟 CRT，做不出真正像素屏

实现边界：

- 这次只针对播放器中心封面
- 不把像素化扩散到背景或歌词区域
- 不单独引入新依赖

## 设置页与配置

调整 `src/shared/config.ts`：

- `RETRO_COVER_PRESET_OPTIONS` 增加：
  - `{ label: '像素街机 CRT', value: 'pixelArcade' }`

调整设置页 `PlaySettings`：

- 下拉选项自动消费共享枚举，不单独手写第二份配置

默认值仍保持：

- `retroCoverPreset = 'off'`

## 动态封面联动规则

本次要明确避免逻辑歧义：

- `dynamicCoverEnabled = false`
  - `pixelArcade` 仍然显示静态像素 CRT 封面

- `dynamicCoverEnabled = true`
  - 普通预设：继续现有动态策略
  - `pixelArcade`：不走正常水波纹，只保留 CRT 语义下的微动态

这条规则需要写在模型层或渲染层的集中判断里，不能散落在多处条件分支。

## 测试策略

至少补以下测试：

1. 配置与设置页契约
- `pixelArcade` 出现在 `RETRO_COVER_PRESET_OPTIONS`
- 设置页下拉项可见 `像素街机 CRT`
- 非法值仍回退 `off`

2. 模型层测试
- `resolveRetroPresetPipeline('pixelArcade')` 返回稳定参数对象
- 返回对象包含像素化参数
- `pixelArcade` 的扫描线和 flicker 强度高于普通 `crt` 基线

3. 渲染接线契约
- 渲染层识别 `pixelArcade`
- `pixelArcade` 下动态水波纹被压低或禁用
- 不会误走普通预设的形变参数路径

4. 回归
- 现有 `off` 与其他复古预设行为不变
- 动态封面开关在非 `pixelArcade` 预设下保持当前行为

## 范围边界

本次不包含以下内容：

- 不增加像素风强度滑杆
- 不增加第二个“像素 + CRT”变体
- 不新增专门的游戏机边框 UI
- 不改播放器背景渲染模式
- 不把 `pixelArcade` 设为默认预设

## 实施结果判定

满足以下条件视为完成：

- 设置页出现 `像素街机 CRT`
- 选择后封面明显具有像素块和 CRT 屏幕感
- 动态封面开启时，`pixelArcade` 不再叠加明显水波纹
- 现有复古预设和封面渲染链无回归
