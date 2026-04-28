import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dialogSource = readFileSync(
  resolve('src/renderer/components/ui/dialog.tsx'),
  'utf8'
)

test('dialog close button uses a larger hit area and keeps distance from the corner', () => {
  assert.match(
    dialogSource,
    /className='absolute top-3 right-3 z-10 rounded-full'/
  )
  assert.match(dialogSource, /size='icon-lg'/)
})
