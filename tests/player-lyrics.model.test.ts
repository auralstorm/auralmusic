import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildLyricLines,
  findActiveLyricIndex,
  parseLrc,
  parseYrc,
} from '../src/renderer/components/PlayerScene/player-lyrics.model.ts'

test('parseLrc parses standard lrc timestamps and text', () => {
  assert.deepEqual(
    parseLrc(`
[00:01.00]First line
[00:12.34]Second line
[01:02.003]Third line
`),
    [
      { time: 1000, text: 'First line' },
      { time: 12340, text: 'Second line' },
      { time: 62003, text: 'Third line' },
    ]
  )
})

test('parseLrc expands multiple timestamps on one lyric line', () => {
  assert.deepEqual(parseLrc('[00:03.00][00:05.50]Echo'), [
    { time: 3000, text: 'Echo' },
    { time: 5500, text: 'Echo' },
  ])
})

test('parseLrc ignores invalid and empty lyric lines', () => {
  assert.deepEqual(parseLrc('plain text\n[bad]Broken\n[00:01.00]'), [])
})

test('findActiveLyricIndex returns the current lyric line for progress', () => {
  const lines = [
    { time: 1000, text: 'First' },
    { time: 3000, text: 'Second' },
    { time: 5000, text: 'Third' },
  ]

  assert.equal(findActiveLyricIndex(lines, 500), -1)
  assert.equal(findActiveLyricIndex(lines, 1000), 0)
  assert.equal(findActiveLyricIndex(lines, 4200), 1)
  assert.equal(findActiveLyricIndex(lines, 9999), 2)
})

test('parseYrc parses karaoke line and per-segment timing', () => {
  assert.deepEqual(
    parseYrc(`
[1000,2500](0,600,0)Hello (600,800,0)world
`),
    [
      {
        time: 1000,
        duration: 2500,
        text: 'Hello world',
        segments: [
          { start: 0, duration: 600, text: 'Hello ' },
          { start: 600, duration: 800, text: 'world' },
        ],
      },
    ]
  )
})

test('parseYrc normalizes absolute segment timestamps from /lyric/new', () => {
  assert.deepEqual(
    parseYrc(`
[20570,1900](20570,360,0)初(20930,150,0)め(21080,120,0)て
`),
    [
      {
        time: 20570,
        duration: 1900,
        text: '初めて',
        segments: [
          { start: 0, duration: 360, text: '初' },
          { start: 360, duration: 150, text: 'め' },
          { start: 510, duration: 120, text: 'て' },
        ],
      },
    ]
  )
})

test('buildLyricLines aligns translation and karaoke data by timestamp', () => {
  assert.deepEqual(
    buildLyricLines({
      lrc: `
[00:01.00]First line
[00:04.00]Second line
`,
      tlyric: `
[00:01.00]First translation
`,
      yrc: `
[1000,3000](0,500,0)First (500,600,0)line
`,
    }),
    [
      {
        time: 1000,
        text: 'First line',
        translation: 'First translation',
        duration: 3000,
        segments: [
          { start: 0, duration: 500, text: 'First ' },
          { start: 500, duration: 600, text: 'line' },
        ],
      },
      {
        time: 4000,
        text: 'Second line',
      },
    ]
  )
})

test('buildLyricLines falls back to yrc lines when lrc is unavailable', () => {
  assert.deepEqual(
    buildLyricLines({
      lrc: '',
      tlyric: '',
      yrc: `
[2000,2200](0,700,0)No (700,900,0)LRC
`,
    }),
    [
      {
        time: 2000,
        duration: 2200,
        text: 'No LRC',
        segments: [
          { start: 0, duration: 700, text: 'No ' },
          { start: 700, duration: 900, text: 'LRC' },
        ],
      },
    ]
  )
})

test('buildLyricLines merges same-text karaoke lines even when yrc timing is shifted', () => {
  assert.deepEqual(
    buildLyricLines({
      lrc: `
[00:01.00]你要证明成功靠努力 大家才会服你
`,
      yrc: `
[1900,4500](1900,300,0)你(2200,300,0)要(2500,300,0)证(2800,300,0)明(3100,300,0)成(3400,300,0)功(3700,300,0)靠(4000,300,0)努(4300,300,0)力 (4600,300,0)大(4900,300,0)家(5200,300,0)才(5500,300,0)会(5800,300,0)服(6100,300,0)你
`,
    }),
    [
      {
        time: 1900,
        text: '你要证明成功靠努力 大家才会服你',
        duration: 4500,
        segments: [
          { start: 0, duration: 300, text: '你' },
          { start: 300, duration: 300, text: '要' },
          { start: 600, duration: 300, text: '证' },
          { start: 900, duration: 300, text: '明' },
          { start: 1200, duration: 300, text: '成' },
          { start: 1500, duration: 300, text: '功' },
          { start: 1800, duration: 300, text: '靠' },
          { start: 2100, duration: 300, text: '努' },
          { start: 2400, duration: 300, text: '力 ' },
          { start: 2700, duration: 300, text: '大' },
          { start: 3000, duration: 300, text: '家' },
          { start: 3300, duration: 300, text: '才' },
          { start: 3600, duration: 300, text: '会' },
          { start: 3900, duration: 300, text: '服' },
          { start: 4200, duration: 300, text: '你' },
        ],
      },
    ]
  )
})
