import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const overflowContentDialogSource = readFileSync(
  new URL(
    '../src/renderer/components/OverflowContentDialog/index.tsx',
    import.meta.url
  ),
  'utf8'
)

test('overflow content dialog renders shared dialog shell with scrollable text body', () => {
  assert.match(
    overflowContentDialogSource,
    /from\s+'@\/components\/ui\/dialog'/
  )
  assert.match(
    overflowContentDialogSource,
    /import\s+\{\s*ScrollArea\s*\}\s+from\s+'@\/components\/ui\/scroll-area'/
  )
  assert.match(
    overflowContentDialogSource,
    /<Dialog open=\{open\} onOpenChange=\{onOpenChange\}>/
  )
  assert.match(
    overflowContentDialogSource,
    /<DialogTitle>\{title\}<\/DialogTitle>/
  )
  assert.match(
    overflowContentDialogSource,
    /<ScrollArea className='h-\[50vh\] w-full pr-2'>/
  )
  assert.match(
    overflowContentDialogSource,
    /<p className='text-muted-foreground text-justify text-base leading-8 whitespace-pre-wrap'>/
  )
  assert.match(overflowContentDialogSource, /\{content\}/)
})
