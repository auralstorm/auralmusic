import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveCloseWindowDialogConfig,
  shouldShowCloseWindowDialog,
} from '../src/renderer/components/CloseWindowDialog/close-window.model.ts'

test('shouldShowCloseWindowDialog only opens the dialog for ask behavior', () => {
  assert.equal(shouldShowCloseWindowDialog('ask'), true)
  assert.equal(shouldShowCloseWindowDialog('minimize'), false)
  assert.equal(shouldShowCloseWindowDialog('quit'), false)
})

test('resolveCloseWindowDialogConfig remembers the selected action when requested', () => {
  assert.deepEqual(resolveCloseWindowDialogConfig('minimize', true), {
    closeBehavior: 'minimize',
    rememberCloseChoice: true,
  })

  assert.deepEqual(resolveCloseWindowDialogConfig('quit', true), {
    closeBehavior: 'quit',
    rememberCloseChoice: true,
  })
})

test('resolveCloseWindowDialogConfig keeps asking when the choice is not remembered', () => {
  assert.deepEqual(resolveCloseWindowDialogConfig('minimize', false), {
    closeBehavior: 'ask',
    rememberCloseChoice: false,
  })

  assert.deepEqual(resolveCloseWindowDialogConfig('quit', false), {
    closeBehavior: 'ask',
    rememberCloseChoice: false,
  })
})
