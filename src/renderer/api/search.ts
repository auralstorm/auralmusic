import request from '@/lib/request'

import {
  SEARCH_TYPE_CODE_MAP,
  type SearchType,
} from '@/components/SearchDialog/search-dialog.model'

interface SearchResourcesParams {
  keywords: string
  type: SearchType
  limit?: number
  offset?: number
}

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
