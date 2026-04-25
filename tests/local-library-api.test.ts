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
  await api.queryPlaylists({
    keyword: '',
    trackFilePath: null,
    offset: 0,
    limit: 24,
  })
  await api.getPlaylistDetail({
    playlistId: 7,
    keyword: '',
    offset: 0,
    limit: 80,
  })
  await api.createPlaylist({ name: '夜间散步' })
  await api.updatePlaylist({ playlistId: 7, name: '深夜循环' })
  await api.deletePlaylist({ playlistId: 7 })
  await api.addTrackToPlaylist({
    playlistId: 7,
    filePath: 'F:/音乐/晴天.mp3',
  })
  await api.removeTrackFromPlaylist({
    playlistId: 7,
    filePath: 'F:/音乐/晴天.mp3',
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
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.QUERY_PLAYLISTS,
      args: [
        {
          keyword: '',
          trackFilePath: null,
          offset: 0,
          limit: 24,
        },
      ],
    },
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.GET_PLAYLIST_DETAIL,
      args: [
        {
          playlistId: 7,
          keyword: '',
          offset: 0,
          limit: 80,
        },
      ],
    },
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.CREATE_PLAYLIST,
      args: [
        {
          name: '夜间散步',
        },
      ],
    },
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.UPDATE_PLAYLIST,
      args: [
        {
          playlistId: 7,
          name: '深夜循环',
        },
      ],
    },
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.DELETE_PLAYLIST,
      args: [
        {
          playlistId: 7,
        },
      ],
    },
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.ADD_TRACK_TO_PLAYLIST,
      args: [
        {
          playlistId: 7,
          filePath: 'F:/音乐/晴天.mp3',
        },
      ],
    },
    {
      channel: LOCAL_LIBRARY_IPC_CHANNELS.REMOVE_TRACK_FROM_PLAYLIST,
      args: [
        {
          playlistId: 7,
          filePath: 'F:/音乐/晴天.mp3',
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
