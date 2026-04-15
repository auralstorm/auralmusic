import { useState, useEffect } from 'react'
import { getColor, getPalette } from 'colorthief'

export function useImageColor(url: string, colorCount = 5) {
  const [dominant, setDominant] = useState<number[] | null>(null)
  const [palette, setPalette] = useState<number[][]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!url) return

    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = url

    img.onload = async () => {
      try {
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
