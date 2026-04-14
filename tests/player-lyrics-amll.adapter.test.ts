import assert from 'node:assert/strict'
import test from 'node:test'

import { adaptLyricsToAmll } from '../src/renderer/components/PlayerScene/player-lyrics-amll.adapter.ts'

test('adaptLyricsToAmll maps karaoke segments into AMLL word timing', () => {
  const result = adaptLyricsToAmll(
    [
      {
        time: 1000,
        text: 'First line',
        translation: '第一行',
        duration: 2200,
        segments: [
          { start: 0, duration: 500, text: 'First ' },
          { start: 500, duration: 600, text: 'line' },
        ],
      },
      {
        time: 4000,
        text: 'Second line',
      },
    ],
    {
      showTranslation: true,
      karaokeEnabled: true,
    }
  )

  assert.deepEqual(result, [
    {
      words: [
        { startTime: 1000, endTime: 1500, word: 'First ' },
        { startTime: 1500, endTime: 2100, word: 'line' },
      ],
      translatedLyric: '第一行',
      romanLyric: '',
      startTime: 1000,
      endTime: 3999,
      isBG: false,
      isDuet: false,
    },
    {
      words: [{ startTime: 4000, endTime: 8000, word: 'Second line' }],
      translatedLyric: '',
      romanLyric: '',
      startTime: 4000,
      endTime: 8000,
      isBG: false,
      isDuet: false,
    },
  ])
})

test('adaptLyricsToAmll can disable translation and karaoke word splitting', () => {
  const result = adaptLyricsToAmll(
    [
      {
        time: 1200,
        text: 'Hello world',
        translation: '你好世界',
        duration: 1800,
        segments: [
          { start: 0, duration: 400, text: 'Hello ' },
          { start: 400, duration: 500, text: 'world' },
        ],
      },
    ],
    {
      showTranslation: false,
      karaokeEnabled: false,
    }
  )

  assert.deepEqual(result, [
    {
      words: [{ startTime: 1200, endTime: 3000, word: 'Hello world' }],
      translatedLyric: '',
      romanLyric: '',
      startTime: 1200,
      endTime: 3000,
      isBG: false,
      isDuet: false,
    },
  ])
})
