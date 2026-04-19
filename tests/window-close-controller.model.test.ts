import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveCloseRequestAction } from '../src/renderer/components/CloseWindowDialog/window-close-controller.model.ts'

test('resolveCloseRequestAction maps ask to dialog display', () => {
  assert.equal(resolveCloseRequestAction('ask'), 'show-dialog')
})

test('resolveCloseRequestAction maps minimize to hide-to-tray', () => {
  assert.equal(resolveCloseRequestAction('minimize'), 'hide-to-tray')
})

test('resolveCloseRequestAction maps quit to app quit', () => {
  assert.equal(resolveCloseRequestAction('quit'), 'quit-app')
})
