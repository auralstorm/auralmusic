import request from '@/lib/request'

import { SEARCH_TYPE_CODE_MAP } from '@/components/SearchDialog/search-dialog.model'
import type { SearchResourcesParams } from '@/types/api'

/**
 * 统一搜索资源
 *
 * SearchDialog 使用内部枚举表达搜索类型，这里映射为网易云 `/cloudsearch`
 * 要求的数字 type，避免组件层依赖接口魔法数字。
 */
export function searchResources({
  keywords,
  type,
  limit = 20,
  offset = 0,
}: SearchResourcesParams) {
  return request.get('/cloudsearch', {
    params: {
      keywords,
      type: SEARCH_TYPE_CODE_MAP[type],
      limit,
      offset,
    },
  })
}
