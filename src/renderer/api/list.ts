import request from '../lib/request.ts'
import type {
  AddSongToPlaylistParams,
  CreatePlaylistParams,
  DeletePlaylistParams,
  FmTrashParams,
  GetPlaylistSongIdsParams,
  LikeListParams,
  LyricParams,
  PersonalFmParams,
  PlaylistSubscribeParams,
  PlaylistTrackAllResponse,
  PlaylistTracksParams,
  SongDownloadUrlV1Params,
  SongUrlMatchParams,
  SongUrlV1Params,
  TopArtistsParams,
  TopPlaylistParams,
  ToggleSongLikeParams,
  UpdatePlaylistParams,
  UpdatePlaylistTracksParams,
} from '@/types/api'

/** 获取所有榜单摘要，榜单页入口数据源。 */
export function getTopList() {
  return request.get('/toplist')
}

/**
 * 获取指定榜单详情
 * @param id 榜单对应的 playlist id
 */
export function getTopListDetailById(id: string) {
  return request.get(`/playlist/detail?id=${id}`)
}

/**
 * 获取歌单详情
 * @param id 歌单 id
 * @param timestamp 可选时间戳，用于绕过接口缓存
 */
export function getPlaylistDetail(id: number | string, timestamp?: number) {
  return request.get('/playlist/detail', {
    params: { id, timestamp },
  })
}

/** 创建用户歌单，参数透传网易云 `/playlist/create`。 */
export function createPlaylist(params: CreatePlaylistParams) {
  return request.get('/playlist/create', {
    params,
  })
}

/** 删除用户歌单，调用前应由 UI 确认用户意图。 */
export function deletePlaylist(params: DeletePlaylistParams) {
  return request.get('/playlist/delete', {
    params,
  })
}

/** 更新歌单基础信息，例如名称、描述或标签。 */
export function updatePlaylist(params: UpdatePlaylistParams) {
  return request.get('/playlist/update', {
    params,
  })
}

/**
 * 更新歌单歌曲
 *
 * 网易云接口要求 tracks 为逗号分隔字符串；调用方可以传数组，
 * API 层统一转换，避免页面重复拼接。
 */
export function updatePlaylistTracks(params: UpdatePlaylistTracksParams) {
  const tracks = Array.isArray(params.tracks)
    ? params.tracks.join(',')
    : params.tracks

  return request.get('/playlist/tracks', {
    params: {
      op: params.op,
      pid: params.pid,
      tracks,
      timestamp: params.timestamp,
    },
  })
}

/**
 * 收藏歌曲到指定歌单
 *
 * “我喜欢的音乐”不是普通歌单添加接口，而是 `/song/like`。
 * 因此这里根据 isLikedPlaylist 分流，调用方只需要表达“添加到目标歌单”。
 */
export function addSongToPlaylist(params: AddSongToPlaylistParams) {
  if (params.isLikedPlaylist) {
    if (!params.userId) {
      throw new Error('liked playlist add requires user id')
    }

    return toggleSongLike({
      id: params.trackId,
      uid: params.userId,
      like: true,
    })
  }

  return updatePlaylistTracks({
    op: 'add',
    pid: params.playlistId,
    tracks: params.trackId,
    timestamp: params.timestamp,
  })
}

/**
 * 获取推荐歌单
 * @param limit 返回数量，默认只取 1 个供首页轻量展示
 */
export function getRecommendPlayList(limit: number = 1) {
  return request.get('/personalized', {
    params: { limit },
  })
}

/** 获取热门/精品歌单列表，支持分类、分页等参数。 */
export function geTopPlayList(params: TopPlaylistParams) {
  return request.get('/top/playlist', {
    params,
  })
}

/** 获取歌单歌曲分页列表。 */
export function getPlaylistTracks(params: PlaylistTracksParams) {
  return request.get('/playlist/track/all', {
    params,
  })
}

/** 收藏或取消收藏歌单。 */
export function togglePlaylistSubscription(params: PlaylistSubscribeParams) {
  return request.get('/playlist/subscribe', {
    params,
  })
}

/** 获取歌单分类列表。 */
export function gePlayListCatList() {
  return request.get('/playlist/catlist')
}

/** 获取私人 FM 当前歌曲。 */
export function getPersonalFm(params?: PersonalFmParams) {
  return request.get('/personal_fm', {
    params,
  })
}

/** 将私人 FM 歌曲移入垃圾桶，后续 FM 推荐会降低出现概率。 */
export function fmTrash(params: FmTrashParams) {
  return request.get('/fm_trash', {
    params,
  })
}

/** 获取每日推荐歌曲，需要登录态。 */
export function getRecommendSongs() {
  return request.get('/recommend/songs')
}

/** 获取用户喜欢歌曲 id 列表。 */
export function getLikeList(params: LikeListParams) {
  return request.get('/likelist', {
    params,
  })
}

/** 喜欢或取消喜欢歌曲；“我喜欢的音乐”歌单增删也复用这个接口。 */
export function toggleSongLike(params: ToggleSongLikeParams) {
  return request.get('/song/like', {
    params,
  })
}

/** 获取歌曲播放 URL，播放链路优先使用的官方接口。 */
export function getSongUrlV1(params: SongUrlV1Params) {
  return request.get('/song/url/v1', {
    params,
  })
}

/** 通过内置解锁源匹配歌曲 URL，官方 URL 不可用时作为兜底。 */
export function getSongUrlMatch(params: SongUrlMatchParams) {
  return request.get('/song/url/match', {
    params,
  })
}

/** 获取歌曲下载 URL，下载链路在播放 URL 不可用时使用。 */
export function getSongDownloadUrlV1(params: SongDownloadUrlV1Params) {
  return request.get('/song/download/url/v1', {
    params,
  })
}

/** 获取新版歌词，返回原文、翻译和逐字歌词等结构。 */
export function getLyricNew(params: LyricParams) {
  return request.get('/lyric/new', {
    params,
  })
}

/**
 * 批量获取歌曲详情
 * @param ids 单个歌曲 id 或歌曲 id 数组
 */
export function getSongDetail(ids: Array<number | string> | number | string) {
  const value = Array.isArray(ids) ? ids.join(',') : ids

  return request.get('/song/detail', {
    params: { ids: value },
  })
}

/** 获取热门歌手列表。 */
export function getTopArtists(params: TopArtistsParams) {
  return request.get('/top/artists', {
    params,
  })
}

/** 获取推荐新歌列表。 */
export function getPersonalizedNewSong(limit?: number) {
  return request.get('/personalized/newsong', {
    params: {
      limit,
    },
  })
}

/**
 * 分页获取歌单全部歌曲
 *
 * 这个接口用于歌单详情和播放队列补全。timestamp 可用于刷新后强制获取最新列表。
 */
export function getPlaylistTrackAll(
  id: number,
  limit: number,
  offset: number,
  timestamp?: number
) {
  return request.get('/playlist/track/all', {
    params: {
      id,
      limit,
      offset,
      timestamp,
    },
  })
}

/**
 * 拉取歌单内全部歌曲 id
 *
 * 用于判断歌曲是否已存在于歌单。接口单页上限按 1000 处理，
 * 会根据 trackCount 分页并在短页时提前结束。
 */
export async function getPlaylistSongIds(params: GetPlaylistSongIdsParams) {
  const limit = 1000
  const collectedIds: number[] = []
  const total = Math.max(params.trackCount || 0, 1)

  for (let offset = 0; offset < total; offset += limit) {
    const response = await getPlaylistTrackAll(
      params.id,
      limit,
      offset,
      params.timestamp
    )

    const songs =
      (response.data as PlaylistTrackAllResponse | undefined)?.songs || []
    const ids = songs
      .map(song => song.id)
      .filter((id): id is number => Number.isFinite(id))

    collectedIds.push(...ids)

    if (songs.length < limit) {
      break
    }
  }

  return collectedIds
}
