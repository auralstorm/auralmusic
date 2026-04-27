import { Buffer } from 'node:buffer'
import { inflate } from 'node:zlib'

export type KwLyricDecodePayload = {
  lrcBase64: string
  isGetLyricx?: boolean
}

const KUWO_LYRIC_KEY = Buffer.from('yeelion')
const KUWO_LYRIC_HEADER = 'tp=content'

function inflateBuffer(input: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    inflate(input, (error, result) => {
      if (error) {
        reject(error)
        return
      }

      resolve(result)
    })
  })
}

export function buildKwNewLyricParams(id: string | number, isGetLyricx = true) {
  let params = `user=12345,web,web,web&requester=localhost&req=1&rid=MUSIC_${id}`
  if (isGetLyricx) {
    params += '&lrcx=1'
  }

  const input = Buffer.from(params)
  const output = new Uint16Array(input.length)
  let index = 0

  while (index < input.length) {
    let keyIndex = 0
    while (keyIndex < KUWO_LYRIC_KEY.length && index < input.length) {
      output[index] = KUWO_LYRIC_KEY[keyIndex] ^ input[index]
      index += 1
      keyIndex += 1
    }
  }

  return Buffer.from(output).toString('base64')
}

function decodeGb18030(buffer: Buffer) {
  return new TextDecoder('gb18030').decode(buffer)
}

function xorDecodeLyricx(buffer: Buffer) {
  const output = new Uint8Array(buffer.length)
  let index = 0

  while (index < buffer.length) {
    let keyIndex = 0
    while (keyIndex < KUWO_LYRIC_KEY.length && index < buffer.length) {
      output[index] = buffer[index] ^ KUWO_LYRIC_KEY[keyIndex]
      index += 1
      keyIndex += 1
    }
  }

  return Buffer.from(output)
}

export async function decodeKwLyricResponse({
  lrcBase64,
  isGetLyricx = true,
}: KwLyricDecodePayload) {
  const raw = Buffer.from(lrcBase64, 'base64')
  if (raw.toString('utf8', 0, KUWO_LYRIC_HEADER.length) !== KUWO_LYRIC_HEADER) {
    return ''
  }

  const bodyStart = raw.indexOf('\r\n\r\n')
  if (bodyStart < 0) {
    return ''
  }

  const inflated = await inflateBuffer(raw.subarray(bodyStart + 4))
  if (!isGetLyricx) {
    return decodeGb18030(inflated)
  }

  const lyricx = Buffer.from(inflated.toString(), 'base64')
  return decodeGb18030(xorDecodeLyricx(lyricx))
}
