import assert from 'node:assert/strict'
import test from 'node:test'

import { AUTH_IPC_CHANNELS } from '../src/shared/ipc/auth.ts'
import { CACHE_IPC_CHANNELS } from '../src/shared/ipc/cache.ts'
import { IPC_CHANNELS } from '../src/shared/ipc/config.ts'
import { DOWNLOAD_IPC_CHANNELS } from '../src/shared/ipc/download.ts'
import { SHORTCUT_IPC_CHANNELS } from '../src/shared/ipc/shortcut.ts'
import { SYSTEM_FONTS_IPC_CHANNELS } from '../src/shared/ipc/system-fonts.ts'
import { TRAY_IPC_CHANNELS } from '../src/shared/ipc/tray.ts'
import { WINDOW_IPC_CHANNELS } from '../src/shared/ipc/window.ts'

test('shared ipc channel constants preserve the existing wire contract', () => {
  assert.deepEqual(AUTH_IPC_CHANNELS, {
    GET: 'auth:get',
    SET: 'auth:set',
    CLEAR: 'auth:clear',
  })

  assert.deepEqual(CACHE_IPC_CHANNELS, {
    GET_DEFAULT_DIRECTORY: 'cache:get-default-directory',
    SELECT_DIRECTORY: 'cache:select-directory',
    GET_STATUS: 'cache:get-status',
    CLEAR: 'cache:clear',
    RESOLVE_AUDIO_SOURCE: 'cache:resolve-audio-source',
    RESOLVE_IMAGE_SOURCE: 'cache:resolve-image-source',
    READ_LYRICS_PAYLOAD: 'cache:read-lyrics-payload',
    WRITE_LYRICS_PAYLOAD: 'cache:write-lyrics-payload',
  })

  assert.deepEqual(IPC_CHANNELS, {
    CONFIG: {
      GET: 'config:get',
      SET: 'config:set',
      RESET: 'config:reset',
    },
    MUSIC_SOURCE: {
      SELECT_LX_SCRIPT: 'music-source:select-lx-script',
      SAVE_LX_SCRIPT: 'music-source:save-lx-script',
      READ_LX_SCRIPT: 'music-source:read-lx-script',
      REMOVE_LX_SCRIPT: 'music-source:remove-lx-script',
      DOWNLOAD_LX_SCRIPT: 'music-source:download-lx-script',
      LX_HTTP_REQUEST: 'music-source:lx-http-request',
    },
  })

  assert.deepEqual(DOWNLOAD_IPC_CHANNELS, {
    GET_DEFAULT_DIRECTORY: 'download:get-default-directory',
    SELECT_DIRECTORY: 'download:select-directory',
    OPEN_DIRECTORY: 'download:open-directory',
    ENQUEUE_SONG_DOWNLOAD: 'download:enqueue-song-download',
    GET_TASKS: 'download:get-tasks',
    REMOVE_TASK: 'download:remove-task',
    OPEN_DOWNLOADED_FILE: 'download:open-downloaded-file',
    OPEN_DOWNLOADED_FILE_FOLDER: 'download:open-downloaded-file-folder',
    TASKS_CHANGED: 'download:tasks-changed',
  })

  assert.deepEqual(SHORTCUT_IPC_CHANNELS, {
    GET_GLOBAL_REGISTRATION_STATUSES:
      'shortcut:get-global-registration-statuses',
    GLOBAL_REGISTRATION_STATUSES_CHANGED:
      'shortcut:global-registration-statuses-changed',
  })

  assert.deepEqual(SYSTEM_FONTS_IPC_CHANNELS, {
    GET_ALL: 'system-fonts:get-all',
  })

  assert.deepEqual(TRAY_IPC_CHANNELS, {
    SYNC_STATE: 'tray:sync-state',
    COMMAND: 'tray:command',
  })

  assert.deepEqual(WINDOW_IPC_CHANNELS, {
    MINIMIZE: 'window:minimize',
    TOGGLE_MAXIMIZE: 'window:toggle-maximize',
    CLOSE: 'window:close',
    QUIT_APP: 'window:quit-app',
    HIDE_TO_TRAY: 'window:hide-to-tray',
    SHOW: 'window:show',
    CLOSE_REQUESTED: 'window:close-requested',
    IS_MAXIMIZED: 'window:is-maximized',
    MAXIMIZE_CHANGED: 'window:maximize-changed',
    TOGGLE_FULLSCREEN: 'window:toggle-fullscreen',
    IS_FULLSCREEN: 'window:is-fullscreen',
    FULLSCREEN_CHANGED: 'window:fullscreen-changed',
  })
})
