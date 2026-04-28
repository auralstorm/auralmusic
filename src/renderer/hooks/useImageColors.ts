import { useState, useEffect } from 'react'
import { getColor, getPalette } from 'colorthief'

/**
 * 从图片中提取主色和调色板
 * @param url 图片地址
 * @param colorCount 调色板颜色数量，默认 5
 * @returns dominant 主色 RGB，palette 调色板 RGB 列表，loading 是否仍在解析
 */
export function useImageColor(url: string, colorCount = 5) {
  // dominant 用于页面主视觉或背景渐变的基准色。
  const [dominant, setDominant] = useState<number[] | null>(null)
  // palette 保留多色结果，适合封面氛围背景或装饰色选择。
  const [palette, setPalette] = useState<number[][]>([])
  // loading 只表示当前图片取色流程是否结束，不代表图片元素是否已展示。
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!url) return

    const img = new Image()
    // 允许跨域图片参与 canvas 取色；服务端未开放 CORS 时会走 catch 兜底。
    img.crossOrigin = 'Anonymous'
    img.src = url

    img.onload = async () => {
      try {
        // colorthief 基于 Image 实例取色，必须等 onload 后再读取像素。
        const color = await getColor(img)
        const colors = await getPalette(img, { colorCount: colorCount })
        setDominant(color?.array() ?? null)
        setPalette(colors?.map(item => item.array()) ?? [])
      } catch (err) {
        console.log(err)
      } finally {
        setLoading(false)
      }
    }
  }, [url, colorCount])

  return { dominant, palette, loading }
}
