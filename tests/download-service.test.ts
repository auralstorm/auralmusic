import assert from 'node:assert/strict'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { DownloadService } from '../src/main/download/download-service.ts'
import type { DownloadTask } from '../src/main/download/download-types.ts'

function createNowSequence(start = 1_000) {
  let current = start
  return () => {
    current += 1
    return current
  }
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, resolve, reject }
}

async function waitForTaskStatus(
  service: DownloadService,
  taskId: string,
  expectedStatus: DownloadTask['status']
) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const task = service.getTasks().find(item => item.id === taskId)
    if (task?.status === expectedStatus) {
      return task
    }

    await new Promise(resolve => setTimeout(resolve, 10))
  }

  assert.fail(`Task ${taskId} did not reach status ${expectedStatus}`)
}

test('DownloadService resolves the project downloads directory when config dir is empty', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
  })

  assert.equal(service.getDefaultDirectory(''), root)
  assert.equal(service.getDefaultDirectory('   '), root)
  assert.equal(
    service.getDefaultDirectory(path.join(root, 'custom-downloads')),
    path.join(root, 'custom-downloads')
  )

  await rm(root, { recursive: true, force: true })
})

test('DownloadService falls down the quality chain and completes an mp3 download', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const attemptedQualities: string[] = []
  const embeddedFiles: string[] = []
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-quality-fallback',
    resolveSongUrl: async ({ quality }) => {
      attemptedQualities.push(quality)
      if (quality === 'sky') {
        return {
          url: 'https://cdn.example.com/song.mp3',
        }
      }

      return null
    },
    downloadFetcher: async () => {
      return new Response(Buffer.from('audio-data'), {
        status: 200,
        headers: {
          'content-type': 'audio/mpeg',
          'content-length': '10',
        },
      })
    },
    embedMetadata: async input => {
      embeddedFiles.push(input.filePath)
      return { applied: true }
    },
  })

  const task = await service.enqueueSongDownload({
    songId: '1',
    songName: 'Test Song',
    artistName: 'Test Artist',
    requestedQuality: 'jymaster',
    metadata: {
      albumName: 'Test Album',
      coverUrl: 'https://cdn.example.com/cover.jpg',
    },
  })

  const completed = await waitForTaskStatus(service, task.id, 'completed')
  const fileContent = await readFile(completed.targetPath, 'utf8')

  assert.deepEqual(attemptedQualities, ['jymaster', 'dolby', 'sky'])
  assert.equal(completed.requestedQuality, 'jymaster')
  assert.equal(completed.resolvedQuality, 'sky')
  assert.equal(completed.progress, 100)
  assert.match(completed.note ?? '', /downgraded/i)
  assert.equal(completed.warningMessage, null)
  assert.ok(completed.completedAt)
  assert.equal(fileContent, 'audio-data')
  assert.deepEqual(embeddedFiles, [completed.targetPath])

  await rm(root, { recursive: true, force: true })
})

test('DownloadService retries song url resolution with unblock=true when music source is enabled', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const attemptedUrls: string[] = []
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-unblock-retry',
    readConfig: () => ({
      musicSourceEnabled: true,
      musicSourceProviders: ['migu'],
    }),
    downloadFetcher: async input => {
      const url = typeof input === 'string' ? input : input.toString()
      attemptedUrls.push(url)

      if (url.includes('/song/download/url/v1')) {
        return Response.json({
          data: {
            url: '',
          },
        })
      }

      if (url.includes('/song/url/v1')) {
        const unblockEnabled =
          new URL(url).searchParams.get('unblock') === 'true'
        return Response.json({
          data: [
            {
              id: 1,
              url: unblockEnabled
                ? 'https://cdn.example.com/full-track.mp3'
                : '',
            },
          ],
        })
      }

      return new Response(Buffer.from('full-track-audio'), {
        status: 200,
        headers: {
          'content-type': 'audio/mpeg',
        },
      })
    },
  })

  const previousBaseUrl = process.env.AURAL_MUSIC_API_BASE_URL
  process.env.AURAL_MUSIC_API_BASE_URL = 'https://music.example.com'

  try {
    const task = await service.enqueueSongDownload({
      songId: '1',
      songName: 'Unlocked Song',
      artistName: 'Unlocked Artist',
      requestedQuality: 'higher',
    })

    const completed = await waitForTaskStatus(service, task.id, 'completed')

    assert.equal(completed.status, 'completed')
    assert.deepEqual(
      attemptedUrls.filter(
        url =>
          url.includes('/song/download/url/v1') || url.includes('/song/url/v1')
      ),
      ['https://music.example.com/song/url/v1?id=1&level=higher&unblock=true']
    )
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.AURAL_MUSIC_API_BASE_URL
    } else {
      process.env.AURAL_MUSIC_API_BASE_URL = previousBaseUrl
    }

    await rm(root, { recursive: true, force: true })
  }
})

test('DownloadService prefers official download urls and sends auth cookie to music api requests', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const attemptedRequests: Array<{
    url: string
    cookieHeader: string
  }> = []

  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-official-download-url',
    getAuthSession: () => ({
      userId: 1,
      nickname: 'tester',
      avatarUrl: '',
      cookie: 'MUSIC_U=vip-cookie; os=pc',
      loginMethod: 'email',
      updatedAt: Date.now(),
    }),
    downloadFetcher: async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString()
      const headers = new Headers(init?.headers)

      if (url.startsWith('https://music.example.com/')) {
        attemptedRequests.push({
          url,
          cookieHeader: headers.get('Cookie') || '',
        })
      }

      if (url.includes('/song/download/url/v1')) {
        return Response.json({
          data: {
            url: 'https://cdn.example.com/official-track.flac',
          },
        })
      }

      if (url.includes('/song/url/v1')) {
        return Response.json({
          data: [
            {
              id: 1,
              url: 'https://cdn.example.com/playback-track.mp3',
            },
          ],
        })
      }

      return new Response(Buffer.from('official-audio'), {
        status: 200,
        headers: {
          'content-type': 'audio/flac',
        },
      })
    },
  })

  const previousBaseUrl = process.env.AURAL_MUSIC_API_BASE_URL
  process.env.AURAL_MUSIC_API_BASE_URL = 'https://music.example.com'

  try {
    const task = await service.enqueueSongDownload({
      songId: '11',
      songName: 'Official Track',
      artistName: 'VIP Artist',
      requestedQuality: 'higher',
    })

    const completed = await waitForTaskStatus(service, task.id, 'completed')

    assert.equal(completed.status, 'completed')
    assert.ok(completed.targetPath.endsWith('.flac'))
    assert.ok(attemptedRequests.length >= 1)
    assert.equal(
      attemptedRequests[0]?.url,
      'https://music.example.com/song/download/url/v1?id=11&level=higher'
    )
    assert.match(attemptedRequests[0]?.cookieHeader ?? '', /MUSIC_U=vip-cookie/)
    assert.ok(
      attemptedRequests.every(item =>
        /MUSIC_U=vip-cookie/.test(item.cookieHeader)
      )
    )
    assert.doesNotMatch(
      attemptedRequests.map(item => item.url).join('\n'),
      /song\/url\/v1/
    )
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.AURAL_MUSIC_API_BASE_URL
    } else {
      process.env.AURAL_MUSIC_API_BASE_URL = previousBaseUrl
    }

    await rm(root, { recursive: true, force: true })
  }
})

test('DownloadService preserves renderer pre-resolved source metadata when sourceUrl is provided', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const attemptedRequests: string[] = []
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-pre-resolved-source',
    downloadFetcher: async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString()
      attemptedRequests.push(url)

      if (
        url.includes('/song/download/url/v1') ||
        url.includes('/song/url/v1')
      ) {
        throw new Error(`legacy resolver should not be called: ${url}`)
      }

      return new Response(Buffer.from('pre-resolved-audio'), {
        status: 200,
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': '18',
        },
      })
    },
  })

  const task = await service.enqueueSongDownload({
    songId: '4',
    songName: 'Pre-resolved Song',
    artistName: 'Renderer Artist',
    requestedQuality: 'higher',
    sourceUrl: 'https://cdn.example.com/pre-resolved-track',
    resolvedQuality: 'lossless',
    fileExtension: '.flac',
  })

  const completed = await waitForTaskStatus(service, task.id, 'completed')

  assert.equal(completed.resolvedQuality, 'lossless')
  assert.ok(completed.targetPath.endsWith('.flac'))
  assert.equal(completed.note, null)
  assert.deepEqual(attemptedRequests, [
    'https://cdn.example.com/pre-resolved-track',
  ])

  await rm(root, { recursive: true, force: true })
})

test('DownloadService prefers renderer sourceUrl over an injected legacy resolver', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  let legacyResolverCalls = 0
  const attemptedRequests: string[] = []
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-renderer-source-priority',
    resolveSongUrl: async () => {
      legacyResolverCalls += 1
      throw new Error('legacy resolver should be skipped')
    },
    downloadFetcher: async input => {
      const url = typeof input === 'string' ? input : input.toString()
      attemptedRequests.push(url)

      return new Response(Buffer.from('rendered-audio'), {
        status: 200,
        headers: {
          'content-type': 'audio/flac',
        },
      })
    },
  })

  const task = await service.enqueueSongDownload({
    songId: '6',
    songName: 'Renderer Source Song',
    artistName: 'Renderer Artist',
    requestedQuality: 'higher',
    sourceUrl: 'https://cdn.example.com/renderer-source.flac',
    resolvedQuality: 'lossless',
    fileExtension: '.flac',
  })

  const completed = await waitForTaskStatus(service, task.id, 'completed')

  assert.equal(legacyResolverCalls, 0)
  assert.equal(completed.resolvedQuality, 'lossless')
  assert.ok(completed.targetPath.endsWith('.flac'))
  assert.deepEqual(attemptedRequests, [
    'https://cdn.example.com/renderer-source.flac',
  ])

  await rm(root, { recursive: true, force: true })
})

test('DownloadService falls back to request quality and response type when renderer metadata is missing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-pre-resolved-source-fallback',
    downloadFetcher: async () => {
      return new Response(Buffer.from('fallback-audio'), {
        status: 200,
        headers: {
          'content-type': 'audio/mpeg',
        },
      })
    },
  })

  const task = await service.enqueueSongDownload({
    songId: '5',
    songName: 'Fallback Song',
    artistName: 'Renderer Artist',
    requestedQuality: 'higher',
    sourceUrl: 'https://cdn.example.com/fallback-track',
  })

  const completed = await waitForTaskStatus(service, task.id, 'completed')

  assert.equal(completed.resolvedQuality, 'higher')
  assert.ok(completed.targetPath.endsWith('.mp3'))

  await rm(root, { recursive: true, force: true })
})

test('DownloadService appends the resolved extension when the song name contains dots', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-dotted-song-name',
    downloadFetcher: async () => {
      return new Response(Buffer.from('dotted-song-audio'), {
        status: 200,
        headers: {
          'content-type': 'audio/mpeg',
        },
      })
    },
  })

  const task = await service.enqueueSongDownload({
    songId: '7',
    songName: 'P.Y.T',
    artistName: 'Test Artist',
    requestedQuality: 'higher',
    sourceUrl: 'https://cdn.example.com/dotted-song',
  })

  const completed = await waitForTaskStatus(service, task.id, 'completed')

  assert.ok(completed.targetPath.endsWith('P.Y.T - Test Artist.mp3'))

  await rm(root, { recursive: true, force: true })
})

test('DownloadService honors strict download quality policy during legacy resolution', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const attemptedQualities: string[] = []
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-strict-quality-policy',
    readConfig: () => ({
      downloadQualityPolicy: 'strict',
    }),
    resolveSongUrl: async ({ quality }) => {
      attemptedQualities.push(quality)
      if (quality === 'higher') {
        return {
          url: 'https://cdn.example.com/higher.mp3',
        }
      }

      return null
    },
    downloadFetcher: async () => {
      return new Response(Buffer.from('strict-audio'), {
        status: 200,
        headers: {
          'content-type': 'audio/mpeg',
        },
      })
    },
  })

  const task = await service.enqueueSongDownload({
    songId: 'strict-song',
    songName: 'Strict Song',
    artistName: 'Strict Artist',
    requestedQuality: 'lossless',
  })

  const failed = await waitForTaskStatus(service, task.id, 'failed')

  assert.deepEqual(attemptedQualities, ['lossless'])
  assert.match(failed.errorMessage ?? '', /可用音质|quality|source/i)

  await rm(root, { recursive: true, force: true })
})

test('DownloadService skips same-name files that already exist', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const existingPath = path.join(root, 'existing-track.mp3')
  let fetchCount = 0
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-same-name-skip',
    resolveSongUrl: async () => ({
      url: 'https://cdn.example.com/existing-track.mp3',
    }),
    downloadFetcher: async () => {
      fetchCount += 1
      return new Response(Buffer.from('new-audio'), {
        status: 200,
        headers: {
          'content-type': 'audio/mpeg',
        },
      })
    },
  })

  await writeFile(existingPath, 'original-audio', 'utf8')

  const task = await service.enqueueSongDownload({
    songId: '2',
    songName: 'Ignored Song',
    artistName: 'Ignored Artist',
    fileName: 'existing-track.mp3',
    requestedQuality: 'higher',
  })

  const skipped = await waitForTaskStatus(service, task.id, 'skipped')

  assert.equal(skipped.targetPath, existingPath)
  assert.equal(skipped.progress, 100)
  assert.match(skipped.warningMessage ?? '', /already exists/i)
  assert.equal(fetchCount, 0)

  await rm(root, { recursive: true, force: true })
})

test('DownloadService completes unsupported formats and reports metadata embedding skip', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-unsupported-metadata',
    resolveSongUrl: async () => ({
      url: 'https://cdn.example.com/song.flac',
    }),
    downloadFetcher: async () => {
      return new Response(Buffer.from('lossless-audio'), {
        status: 200,
        headers: {
          'content-type': 'audio/flac',
        },
      })
    },
  })

  const task = await service.enqueueSongDownload({
    songId: '3',
    songName: 'Lossless Song',
    artistName: 'Test Artist',
    requestedQuality: 'lossless',
    metadata: {
      coverUrl: 'https://cdn.example.com/cover.jpg',
      lyric: '[00:00.00]line',
    },
  })

  const completed = await waitForTaskStatus(service, task.id, 'completed')

  assert.ok(completed.targetPath.endsWith('.flac'))
  assert.match(completed.warningMessage ?? '', /metadata/i)
  assert.equal(completed.resolvedQuality, 'lossless')
  await access(completed.targetPath)

  await rm(root, { recursive: true, force: true })
})

test('DownloadService writes same-name lrc sidecar for non-mp3 downloads when lyrics are enabled', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-flac-with-lrc',
    readConfig: () => ({
      downloadEmbedLyrics: true,
      downloadEmbedTranslatedLyrics: true,
    }),
    resolveSongUrl: async () => ({
      url: 'https://cdn.example.com/song.flac',
    }),
    downloadFetcher: async () => {
      return new Response(Buffer.from('lossless-audio'), {
        status: 200,
        headers: {
          'content-type': 'audio/flac',
        },
      })
    },
  })

  const task = await service.enqueueSongDownload({
    songId: '4',
    songName: 'Lossless With Lyrics',
    artistName: 'Test Artist',
    requestedQuality: 'lossless',
    metadata: {
      lyric: '[00:00.00]original line\n[00:10.00]next line',
      translatedLyric: '[00:00.00]translated line\n[00:10.00]next translated',
    },
  })

  const completed = await waitForTaskStatus(service, task.id, 'completed')
  const lrcPath = completed.targetPath.replace(/\.[^.]+$/, '.lrc')

  assert.ok(completed.targetPath.endsWith('.flac'))
  await access(lrcPath)
  assert.equal(
    await readFile(lrcPath, 'utf8'),
    [
      '[00:00.00]original line',
      '[00:00.00]translated line',
      '[00:10.00]next line',
      '[00:10.00]next translated',
    ].join('\n')
  )

  await rm(root, { recursive: true, force: true })
})

test('DownloadService strips json lyric metadata headers before embedding mp3 lyrics', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    createTaskId: () => 'task-mp3-clean-lyrics',
    resolveSongUrl: async () => ({
      url: 'https://cdn.example.com/song.mp3',
    }),
    downloadFetcher: async input => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/lyric/new')) {
        return Response.json({
          lrc: {
            lyric: [
              '{"t":0,"c":[{"tx":"作词: "},{"tx":"梁博"}]}',
              '{"t":1000,"c":[{"tx":"作曲: "},{"tx":"梁博"}]}',
              '[00:15.71]怎么能回头呢',
              '[00:22.54]怎么能留恋呢',
            ].join('\n'),
          },
        })
      }

      if (url.includes('/song/detail')) {
        return Response.json({
          songs: [],
        })
      }

      return new Response(Buffer.from('mp3-audio'), {
        status: 200,
        headers: {
          'content-type': 'audio/mpeg',
        },
      })
    },
  })

  const previousBaseUrl = process.env.AURAL_MUSIC_API_BASE_URL
  process.env.AURAL_MUSIC_API_BASE_URL = 'https://music.example.com'

  try {
    const task = await service.enqueueSongDownload({
      songId: '5',
      songName: 'Clean Lyrics Song',
      artistName: 'Test Artist',
      requestedQuality: 'standard',
    })

    const completed = await waitForTaskStatus(service, task.id, 'completed')
    const writtenTags = (await import('node-id3')).default.read(
      completed.targetPath
    )

    assert.equal(
      writtenTags.unsynchronisedLyrics?.text,
      ['[00:15.71]怎么能回头呢', '[00:22.54]怎么能留恋呢'].join('\n')
    )
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.AURAL_MUSIC_API_BASE_URL
    } else {
      process.env.AURAL_MUSIC_API_BASE_URL = previousBaseUrl
    }

    await rm(root, { recursive: true, force: true })
  }
})

test('DownloadService respects concurrency and can remove queued tasks before they start', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  const firstResponseGate = createDeferred<void>()
  const fetchedUrls: string[] = []
  const service = new DownloadService({
    defaultRootDir: root,
    now: createNowSequence(),
    concurrency: 1,
    createTaskId: (() => {
      let index = 0
      return () => {
        index += 1
        return `task-${index}`
      }
    })(),
    resolveSongUrl: async ({ songId }) => ({
      url: `https://cdn.example.com/${songId}.mp3`,
    }),
    downloadFetcher: async input => {
      const url = typeof input === 'string' ? input : input.toString()
      fetchedUrls.push(url)
      if (url.endsWith('/first.mp3')) {
        await firstResponseGate.promise
      }

      return new Response(Buffer.from(url), {
        status: 200,
        headers: {
          'content-type': 'audio/mpeg',
        },
      })
    },
  })

  const firstTask = await service.enqueueSongDownload({
    songId: 'first',
    songName: 'First Song',
    artistName: 'Artist',
    requestedQuality: 'higher',
  })
  const secondTask = await service.enqueueSongDownload({
    songId: 'second',
    songName: 'Second Song',
    artistName: 'Artist',
    requestedQuality: 'higher',
  })

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const first = service.getTasks().find(item => item.id === firstTask.id)
    const second = service.getTasks().find(item => item.id === secondTask.id)
    if (first?.status === 'downloading' && second?.status === 'queued') {
      break
    }

    await new Promise(resolve => setTimeout(resolve, 10))
  }

  assert.equal(service.removeTask(secondTask.id), true)
  assert.equal(
    service.getTasks().some(item => item.id === secondTask.id),
    false
  )

  firstResponseGate.resolve()

  await waitForTaskStatus(service, firstTask.id, 'completed')
  assert.deepEqual(fetchedUrls, ['https://cdn.example.com/first.mp3'])

  await rm(root, { recursive: true, force: true })
})

test('DownloadService persists completed tasks and restores them across service instances', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'auralmusic-download-test-'))
  let persistedTasks: DownloadTask[] = []

  const createService = () =>
    new DownloadService({
      defaultRootDir: root,
      now: createNowSequence(),
      createTaskId: () => 'task-persisted-completed',
      readPersistedTasks: () => persistedTasks,
      writePersistedTasks: tasks => {
        persistedTasks = tasks.map(task => ({ ...task }))
      },
      resolveSongUrl: async () => ({
        url: 'https://cdn.example.com/persisted.mp3',
      }),
      downloadFetcher: async () => {
        return new Response(Buffer.from('persisted-audio'), {
          status: 200,
          headers: {
            'content-type': 'audio/mpeg',
          },
        })
      },
    })

  const firstService = createService()
  const task = await firstService.enqueueSongDownload({
    songId: 'persisted-song',
    songName: 'Persisted Song',
    artistName: 'Persisted Artist',
    requestedQuality: 'higher',
  })

  const completed = await waitForTaskStatus(firstService, task.id, 'completed')

  assert.equal(persistedTasks.length, 1)
  assert.equal(persistedTasks[0]?.id, completed.id)
  assert.equal(persistedTasks[0]?.status, 'completed')
  assert.equal(persistedTasks[0]?.targetPath, completed.targetPath)

  const restoredService = createService()
  const restoredTasks = restoredService.getTasks()

  assert.equal(restoredTasks.length, 1)
  assert.equal(restoredTasks[0]?.id, completed.id)
  assert.equal(restoredTasks[0]?.status, 'completed')
  assert.equal(restoredTasks[0]?.targetPath, completed.targetPath)

  await rm(root, { recursive: true, force: true })
})

test('DownloadService marks persisted active tasks as failed when restoring after restart', () => {
  const now = createNowSequence(2_000)
  const persistedTasks: DownloadTask[] = [
    {
      id: 'task-interrupted',
      songId: 'song-1',
      songName: 'Interrupted Song',
      artistName: 'Interrupted Artist',
      coverUrl: '',
      albumName: null,
      requestedQuality: 'higher',
      resolvedQuality: null,
      status: 'downloading',
      progress: 42,
      errorMessage: null,
      targetPath: 'F:\\downloads\\interrupted.mp3',
      note: null,
      warningMessage: null,
      createdAt: 100,
      updatedAt: 120,
      completedAt: null,
    },
  ]

  const service = new DownloadService({
    defaultRootDir: 'F:\\downloads',
    now,
    readPersistedTasks: () => persistedTasks,
    writePersistedTasks: () => undefined,
  })

  const restoredTask = service.getTasks()[0]

  assert.ok(restoredTask)
  assert.equal(restoredTask?.status, 'failed')
  assert.equal(restoredTask?.progress, 42)
  assert.match(restoredTask?.errorMessage ?? '', /restart|interrupted/i)
  assert.ok(restoredTask?.completedAt)
})
