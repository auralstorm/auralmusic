import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const mediaDetailHeroSource = readFileSync(
  new URL(
    '../src/renderer/components/MediaDetailHero/index.tsx',
    import.meta.url
  ),
  'utf8'
)

test('media detail hero wires clamped description overflow into dialog expansion', () => {
  assert.match(
    mediaDetailHeroSource,
    /import\s+\{\s*useTextOverflow\s*\}\s+from\s+'@\/hooks\/useTextOverflow'/
  )
  assert.match(
    mediaDetailHeroSource,
    /import\s+OverflowContentDialog\s+from\s+'@\/components\/OverflowContentDialog'/
  )
  assert.match(
    mediaDetailHeroSource,
    /const\s+\{\s*targetRef,\s*isOverflowing\s*\}\s*=\s*useTextOverflow\(resolvedDescription\)/
  )
  assert.match(
    mediaDetailHeroSource,
    /const\s+canExpandDescription\s*=\s*Boolean\(resolvedDescription\.trim\(\)\)\s*&&\s*isOverflowing/
  )
  assert.match(mediaDetailHeroSource, /onClick=\{handleDescriptionClick\}/)
  assert.match(
    mediaDetailHeroSource,
    /<OverflowContentDialog[\s\S]*open=\{descriptionDialogOpen\}[\s\S]*onOpenChange=\{setDescriptionDialogOpen\}[\s\S]*title='完整简介'[\s\S]*content=\{resolvedDescription\}[\s\S]*\/>/
  )
})
