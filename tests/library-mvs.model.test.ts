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
