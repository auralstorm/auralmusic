import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { isElementOverflowing } from '../src/renderer/hooks/useTextOverflow.ts'

const artistHeroSource = readFileSync(
  new URL(
    '../src/renderer/pages/Artists/Detail/components/ArtistHero.tsx',
    import.meta.url
  ),
  'utf8'
)

test('isElementOverflowing returns true when vertical content is clipped', () => {
  assert.equal(
    isElementOverflowing({
      clientHeight: 108,
      scrollHeight: 180,
      clientWidth: 400,
      scrollWidth: 400,
    }),
    true
  )
})

test('isElementOverflowing returns true when horizontal content is clipped', () => {
  assert.equal(
    isElementOverflowing({
      clientHeight: 108,
      scrollHeight: 108,
      clientWidth: 320,
      scrollWidth: 480,
    }),
    true
  )
})

test('isElementOverflowing returns false when content fits inside the element', () => {
  assert.equal(
    isElementOverflowing({
      clientHeight: 108,
      scrollHeight: 108,
      clientWidth: 320,
      scrollWidth: 320,
    }),
    false
  )
})

test('artist hero wires summary overflow into a dialog trigger flow', () => {
  assert.match(
    artistHeroSource,
    /import\s+\{\s*useTextOverflow\s*\}\s+from\s+'@\/hooks\/useTextOverflow'/
  )
  assert.match(
    artistHeroSource,
    /import\s+OverflowContentDialog\s+from\s+'@\/components\/OverflowContentDialog'/
  )
  assert.match(
    artistHeroSource,
    /const\s+\{\s*targetRef,\s*isOverflowing\s*\}\s*=\s*useTextOverflow\(/
  )
  assert.match(artistHeroSource, /onClick=\{handleSummaryClick\}/)
  assert.match(
    artistHeroSource,
    /<OverflowContentDialog[\s\S]*open=\{summaryDialogOpen\}[\s\S]*onOpenChange=\{setSummaryDialogOpen\}[\s\S]*title='歌手简介'[\s\S]*content=\{summary\}[\s\S]*\/>/
  )
})
