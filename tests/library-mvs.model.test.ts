import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeLibraryMvPage } from '../src/renderer/pages/Library/library-mvs.model.ts'

test('normalizeLibraryMvPage unwraps nested data payloads and maps mv rows', () => {
  const page = normalizeLibraryMvPage(
    {
      data: {
        data: [
          {
            id: 101,
            name: 'Skyline Session',
            cover: 'https://img.example.com/mv.jpg',
            artistName: 'Aurora',
            playCount: 22,
            publishTime: 1_744_200_000_000,
          },
        ],
        count: 40,
      },
    } as never,
    { limit: 25, offset: 0 }
  )

  assert.deepEqual(page, {
    list: [
      {
        id: 101,
        name: 'Skyline Session',
        coverUrl: 'https://img.example.com/mv.jpg',
        artistName: 'Aurora',
        playCount: 22,
        publishTime: 1_744_200_000_000,
      },
    ],
    hasMore: true,
  })
})

test('normalizeLibraryMvPage maps subscribed mv payloads with vid title and creator fields', () => {
  const page = normalizeLibraryMvPage(
    {
      count: 13,
      hasMore: false,
      data: [
        {
          vid: 501,
          title: '少一点天分',
          coverUrl: 'https://img.example.com/mv-501.jpg',
          creator: [{ userName: '金润吉' }],
          durations: 346050,
        },
      ],
    } as never,
    { limit: 25, offset: 0 }
  )

  assert.deepEqual(page, {
    list: [
      {
        id: 501,
        name: '少一点天分',
        coverUrl: 'https://img.example.com/mv-501.jpg',
        artistName: '金润吉',
        playCount: 0,
        publishTime: undefined,
      },
    ],
    hasMore: false,
  })
})
