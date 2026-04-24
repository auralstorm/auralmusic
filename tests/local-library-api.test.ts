import assert from 'node:assert/strict'
import test from 'node:test'

import { createLocalLibraryApi } from '../src/preload/api/local-library-api.ts'
import { LOCAL_LIBRARY_IPC_CHANNELS } from '../src/shared/ipc/local-library.ts'

test('createLocalLibraryApi proxies overview and paged queries through ipc', async () => {
  const invocations: Array<{ channel: string; args: unknown[] }> = []

  const { api } = createLocalLibraryApi({
    contextBridge: {
      exposeInMainWorld: () => undefined,
    },
    ipcRenderer: {
      invoke: async (channel, ...args) => {
        invocations.push({ channel, args })
        return null
      },
    },
  })

  await api.getOverview()
  await api.queryTracks({
    keyword: '周杰伦',
    scopeType: 'artist',
    scopeValue: '周杰伦',
    scopeArtistName: null,
    offset: 0,
    limit: 50,
  })
  await api.queryAlbums({
    keyword: '',
    offset: 0,
    limit: 24,
  })
  await api.queryArtists({
    keyword: '',
    offset: 0,
    limit: 24,
  })

  assert.deepEqual(invocations, [
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.GET_OVERVIEW,
      args: [],
    },
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.QUERY_TRACKS,
      args: [
        {
          keyword: '周杰伦',
          scopeType: 'artist',
          scopeValue: '周杰伦',
          scopeArtistName: null,
          offset: 0,
          limit: 50,
        },
      ],
    },
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.QUERY_ALBUMS,
      args: [
        {
          keyword: '',
          offset: 0,
          limit: 24,
        },
      ],
    },
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.QUERY_ARTISTS,
      args: [
        {
          keyword: '',
          offset: 0,
          limit: 24,
        },
      ],
    },
  ])
})

test('createLocalLibraryApi proxies openDirectory through ipc instead of direct shell access', async () => {
  const invocations: Array<{ channel: string; args: unknown[] }> = []

  const { api } = createLocalLibraryApi({
    contextBridge: {
      exposeInMainWorld: () => undefined,
    },
    ipcRenderer: {
      invoke: async (channel, ...args) => {
        invocations.push({ channel, args })
        return true
      },
    },
  })

  assert.equal(await api.openDirectory('F:/音乐'), true)
  assert.deepEqual(invocations, [
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.OPEN_DIRECTORY,
      args: ['F:/音乐'],
    },
  ])
})

test('createLocalLibraryApi proxies revealTrack through ipc', async () => {
  const invocations: Array<{ channel: string; args: unknown[] }> = []

  const { api } = createLocalLibraryApi({
    contextBridge: {
      exposeInMainWorld: () => undefined,
    },
    ipcRenderer: {
      invoke: async (channel, ...args) => {
        invocations.push({ channel, args })
        return true
      },
    },
  })

  assert.equal(await api.revealTrack('F:/音乐/晴天.mp3'), true)
  assert.deepEqual(invocations, [
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.REVEAL_TRACK,
      args: ['F:/音乐/晴天.mp3'],
    },
  ])
})

test('createLocalLibraryApi proxies online lyric matching through ipc', async () => {
  const invocations: Array<{ channel: string; args: unknown[] }> = []

  const { api } = createLocalLibraryApi({
    contextBridge: {
      exposeInMainWorld: () => undefined,
    },
    ipcRenderer: {
      invoke: async (channel, ...args) => {
        invocations.push({ channel, args })
        return null
      },
    },
  })

  await api.matchOnlineLyrics({
    filePath: 'F:/音乐/track.mp3',
    title: '晴天',
    artistName: '周杰伦',
    albumName: '叶惠美',
    durationMs: 269000,
    coverUrl: '',
  })

  assert.deepEqual(invocations, [
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.MATCH_ONLINE_LYRICS,
      args: [
        {
          filePath: 'F:/音乐/track.mp3',
          title: '晴天',
          artistName: '周杰伦',
          albumName: '叶惠美',
          durationMs: 269000,
          coverUrl: '',
        },
      ],
    },
  ])
})

test('createLocalLibraryApi proxies track removal through ipc', async () => {
  const invocations: Array<{ channel: string; args: unknown[] }> = []

  const { api } = createLocalLibraryApi({
    contextBridge: {
      exposeInMainWorld: () => undefined,
    },
    ipcRenderer: {
      invoke: async (channel, ...args) => {
        invocations.push({ channel, args })
        return { removed: true }
      },
    },
  })

  await api.removeTrack({
    filePath: 'F:/音乐/track.mp3',
    mode: 'permanent',
  })

  assert.deepEqual(invocations, [
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.REMOVE_TRACK,
      args: [
        {
          filePath: 'F:/音乐/track.mp3',
          mode: 'permanent',
        },
      ],
    },
  ])
})
