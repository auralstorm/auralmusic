import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeLibraryCloudPage } from '../src/renderer/pages/Library/library-cloud.model.ts'

test('normalizeLibraryCloudPage preserves cloud song artist ids when available', () => {
  const page = normalizeLibraryCloudPage(
    {
      data: [
        {
          id: 91,
          simpleSong: {
            id: 8801,
            name: 'Cloud Song',
            dt: 210000,
            ar: [
              { id: 6101, name: 'Cloud Artist A' },
              { id: 6102, name: 'Cloud Artist B' },
            ],
            al: {
              name: 'Cloud Album',
              picUrl: 'https://img.example.com/cloud.jpg',
            },
          },
        },
      ],
      hasMore: false,
    },
    { limit: 30, offset: 0 }
  )

  assert.deepEqual(page.list[0], {
    id: 8801,
    name: 'Cloud Song',
    artistNames: 'Cloud Artist A / Cloud Artist B',
    artists: [
      { id: 6101, name: 'Cloud Artist A' },
      { id: 6102, name: 'Cloud Artist B' },
    ],
    albumName: 'Cloud Album',
    coverUrl: 'https://img.example.com/cloud.jpg',
    duration: 210000,
  })
  assert.equal(page.hasMore, false)
})
