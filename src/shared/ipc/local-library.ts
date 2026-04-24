export const LOCAL_LIBRARY_IPC_CHANNELS = {
  GET_OVERVIEW: 'local-library:get-overview',
  GET_SNAPSHOT: 'local-library:get-snapshot',
  QUERY_TRACKS: 'local-library:query-tracks',
  QUERY_ALBUMS: 'local-library:query-albums',
  QUERY_ARTISTS: 'local-library:query-artists',
  SCAN: 'local-library:scan',
  SYNC_ROOTS: 'local-library:sync-roots',
  SELECT_DIRECTORIES: 'local-library:select-directories',
  OPEN_DIRECTORY: 'local-library:open-directory',
  REVEAL_TRACK: 'local-library:reveal-track',
  REMOVE_TRACK: 'local-library:remove-track',
  MATCH_ONLINE_LYRICS: 'local-library:match-online-lyrics',
} as const
