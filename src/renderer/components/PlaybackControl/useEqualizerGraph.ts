import { useEffect, useRef } from 'react'

import type { EqualizerConfig } from '../../../shared/equalizer.ts'
import {
  createEqualizerGraph,
  type EqualizerGraph,
} from '../../audio/equalizer/equalizer-graph.ts'

export function useEqualizerGraph(
  audioElement: HTMLAudioElement | null,
  equalizerConfig: EqualizerConfig
) {
  const graphRef = useRef<EqualizerGraph | null>(null)

  useEffect(() => {
    if (!audioElement || graphRef.current || !equalizerConfig.enabled) {
      return
    }

    try {
      const graph = createEqualizerGraph({ audioElement })
      graph.update(equalizerConfig)
      graphRef.current = graph

      if (!audioElement.paused) {
        void graph.resume().catch(error => {
          console.error('resume equalizer graph failed', error)
        })
      }

      return () => {
        graph.dispose()
        if (graphRef.current === graph) {
          graphRef.current = null
        }
      }
    } catch (error) {
      console.error('create equalizer graph failed', error)
    }
  }, [audioElement, equalizerConfig])

  useEffect(() => {
    graphRef.current?.update(equalizerConfig)

    if (audioElement && equalizerConfig.enabled && !audioElement.paused) {
      void graphRef.current?.resume().catch(error => {
        console.error('resume equalizer graph failed', error)
      })
    }
  }, [audioElement, equalizerConfig])

  return graphRef
}
