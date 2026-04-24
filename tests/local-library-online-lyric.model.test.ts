import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLocalLyricSearchKeyword,
  readConservativeSearchSongCandidate,
  readOnlineCoverUrl,
  readOnlineLyricPayload,
} from '../src/main/local-library/local-library-online-lyric.model.ts'

test('buildLocalLyricSearchKeyword flattens artist separators for search requests', () => {
  assert.equal(
    buildLocalLyricSearchKeyword('七里香', '周杰伦|费玉清'),
    '七里香 周杰伦 费玉清'
  )
})

test('readConservativeSearchSongCandidate only accepts candidates with matching title artist and duration', () => {
  assert.deepEqual(
    readConservativeSearchSongCandidate(
      {
        title: '七里香',
        artistName: '周杰伦',
        durationMs: 269000,
      },
      {
        result: {
          songs: [
            {
              id: 1,
              name: '七里香',
              artists: [{ name: '路人甲' }],
              dt: 269000,
            },
            {
              id: 2,
              name: '七里香',
              artists: [{ name: '周杰伦' }],
              dt: 269000,
            },
          ],
        },
      }
    ),
    { id: 2 }
  )
})

test('readConservativeSearchSongCandidate rejects candidates when duration is too far away', () => {
  assert.equal(
    readConservativeSearchSongCandidate(
      {
        title: '晴天',
        artistName: '周杰伦',
        durationMs: 269000,
      },
      {
        result: {
          songs: [
            {
              id: 1,
              name: '晴天',
              artists: [{ name: '周杰伦' }],
              dt: 289000,
            },
          ],
        },
      }
    ),
    null
  )
})

test('readConservativeSearchSongCandidate can fall back when local duration is missing', () => {
  assert.deepEqual(
    readConservativeSearchSongCandidate(
      {
        title: '安静',
        artistName: '周杰伦',
        durationMs: 0,
      },
      {
        result: {
          songs: [{ id: 12345, name: '安静', artists: [{ name: '周杰伦' }] }],
        },
      }
    ),
    { id: 12345 }
  )
})

test('readConservativeSearchSongCandidate rejects mismatched title variants', () => {
  assert.equal(
    readConservativeSearchSongCandidate(
      {
        title: '晴天',
        artistName: '周杰伦',
        durationMs: 269000,
      },
      {
        result: {
          songs: [
            {
              id: 1,
              name: '雨天',
              artists: [{ name: '周杰伦' }],
              dt: 269000,
            },
          ],
        },
      }
    ),
    null
  )
})

test('readConservativeSearchSongCandidate returns null when no candidate is safe to write back', () => {
  assert.equal(
    readConservativeSearchSongCandidate(
      {
        title: '稻香',
        artistName: '周杰伦',
        durationMs: 223000,
      },
      {
        result: {
          songs: [{ id: 'x' }, { id: 12345 }],
        },
      }
    ),
    null
  )
})

test('readConservativeSearchSongCandidate normalizes artist separators before matching', () => {
  assert.deepEqual(
    readConservativeSearchSongCandidate(
      {
        title: '屋顶',
        artistName: '周杰伦|温岚',
        durationMs: 0,
      },
      {
        result: {
          songs: [
            {
              id: 321,
              name: '屋顶',
              artists: [{ name: '温岚' }, { name: '周杰伦' }],
            },
          ],
        },
      }
    ),
    { id: 321 }
  )
})

test('readOnlineLyricPayload strips noisy json header lines from lyric text', () => {
  assert.deepEqual(
    readOnlineLyricPayload({
      lrc: {
        lyric: '{"t":0,"c":[]}\n[00:01.00]窗外的麻雀',
      },
      tlyric: {
        lyric: '[00:01.00]Outside the window',
      },
    }),
    {
      lyricText: '[00:01.00]窗外的麻雀',
      translatedLyricText: '[00:01.00]Outside the window',
    }
  )
})

test('readOnlineCoverUrl reads song detail album cover url', () => {
  assert.equal(
    readOnlineCoverUrl({
      songs: [
        {
          al: {
            picUrl: 'https://example.com/cover.jpg',
          },
        },
      ],
    }),
    'https://example.com/cover.jpg'
  )
})
