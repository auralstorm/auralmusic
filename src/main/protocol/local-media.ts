import electron from 'electron'
import { pathToFileURL } from 'node:url'

import {
  LOCAL_MEDIA_PROTOCOL,
  parseLocalMediaUrl,
} from '../../shared/local-media.ts'

let schemeRegistered = false
let handlerRegistered = false

export function registerLocalMediaScheme() {
  if (schemeRegistered) {
    return
  }

  electron.protocol.registerSchemesAsPrivileged([
    {
      scheme: LOCAL_MEDIA_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ])

  schemeRegistered = true
}

export function registerLocalMediaProtocol() {
  if (handlerRegistered) {
    return
  }

  electron.protocol.handle(LOCAL_MEDIA_PROTOCOL, request => {
    const targetPath = parseLocalMediaUrl(request.url)

    if (!targetPath) {
      return new Response('Invalid local media url.', { status: 400 })
    }

    return electron.net.fetch(pathToFileURL(targetPath).toString())
  })

  handlerRegistered = true
}
