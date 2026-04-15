import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

test('package.json declares keepalive-for-react for keepalive route outlet builds', () => {
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  ) as {
    dependencies?: Record<string, string>
  }

  assert.equal(packageJson.dependencies?.['keepalive-for-react'], '^5.0.8')
  assert.equal(packageJson.dependencies?.plyr, '^3.8.4')
})
