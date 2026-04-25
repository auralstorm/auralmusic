import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const navBarSource = readFileSync(
  resolve('src/renderer/components/NavBar/index.tsx'),
  'utf8'
)

test('nav bar filters local library menu before rendering navigation items', () => {
  assert.match(navBarSource, /const visibleMenuData = useMemo\(\(\) => \{/)
  assert.match(
    navBarSource,
    /item\.path === '\/local-library' && !showLocalLibraryMenu/
  )
  assert.match(navBarSource, /\{visibleMenuData\.map\(item => \(/)
})

const localLibraryPageSource = readFileSync(
  resolve('src/renderer/pages/LocalLibrary/index.tsx'),
  'utf8'
)

test('local library page redirects away when the menu entry is hidden', () => {
  assert.match(localLibraryPageSource, /const navigate = useNavigate\(\)/)
  assert.match(localLibraryPageSource, /if \(!showLocalLibraryMenu\) \{/)
  assert.match(localLibraryPageSource, /navigate\('\/', \{ replace: true \}\)/)
})
