export const DOWNLOAD_IPC_CHANNELS = {
  GET_DEFAULT_DIRECTORY: 'download:get-default-directory',
  SELECT_DIRECTORY: 'download:select-directory',
  OPEN_DIRECTORY: 'download:open-directory',
  ENQUEUE_SONG_DOWNLOAD: 'download:enqueue-song-download',
  GET_TASKS: 'download:get-tasks',
  HYDRATE_TASK_PLAYBACK_METADATA: 'download:hydrate-task-playback-metadata',
  REMOVE_TASK: 'download:remove-task',
  OPEN_DOWNLOADED_FILE: 'download:open-downloaded-file',
  OPEN_DOWNLOADED_FILE_FOLDER: 'download:open-downloaded-file-folder',
  TASKS_CHANGED: 'download:tasks-changed',
} as const
