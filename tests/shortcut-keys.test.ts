import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_SHORTCUT_BINDINGS,
  canEditShortcutBinding,
  findShortcutActionByAccelerator,
  formatShortcutAccelerator,
  hasShortcutConflict,
  keyboardEventToShortcut,
  normalizeShortcutBindings,
  normalizeShortcutForElectronAccelerator,
  resolveEnabledGlobalShortcutRegistrations,
  resolveGlobalShortcutRegistrationStatuses,
  resolveShortcutVolume,
} from '../src/shared/shortcut-keys.ts'

test('default shortcut bindings include all supported actions', () => {
  assert.equal(Object.keys(DEFAULT_SHORTCUT_BINDINGS).length, 12)
  assert.deepEqual(DEFAULT_SHORTCUT_BINDINGS.playPause, {
    local: 'Ctrl+P',
    global: 'Alt+Ctrl+P',
  })
  assert.deepEqual(DEFAULT_SHORTCUT_BINDINGS.nextTrack, {
    local: 'Ctrl+ArrowRight',
    global: 'Alt+Ctrl+ArrowRight',
  })
  assert.deepEqual(DEFAULT_SHORTCUT_BINDINGS.toggleSearch, {
    local: 'Ctrl+K',
    global: 'Alt+Ctrl+K',
  })
  assert.deepEqual(DEFAULT_SHORTCUT_BINDINGS.toggleFullscreen, {
    local: 'Ctrl+Shift+F',
    global: 'Alt+Ctrl+Shift+F',
  })
  assert.deepEqual(DEFAULT_SHORTCUT_BINDINGS.navigateBack, {
    local: 'Alt+ArrowLeft',
    global: 'Alt+Ctrl+Shift+ArrowLeft',
  })
  assert.deepEqual(DEFAULT_SHORTCUT_BINDINGS.navigateForward, {
    local: 'Alt+ArrowRight',
    global: 'Alt+Ctrl+Shift+ArrowRight',
  })
  assert.deepEqual(DEFAULT_SHORTCUT_BINDINGS.togglePlaylist, {
    local: 'Ctrl+Shift+L',
    global: 'Alt+Ctrl+Shift+L',
  })
})

test('normalizeShortcutBindings fills missing and invalid values with defaults', () => {
  assert.deepEqual(
    normalizeShortcutBindings({
      playPause: { local: 'Ctrl+Space', global: '' },
      nextTrack: null,
      unknownAction: { local: 'Ctrl+X', global: 'Alt+Ctrl+X' },
    }),
    {
      ...DEFAULT_SHORTCUT_BINDINGS,
      playPause: {
        local: 'Ctrl+Space',
        global: DEFAULT_SHORTCUT_BINDINGS.playPause.global,
      },
    }
  )
})

test('formatShortcutAccelerator renders accelerators with readable separators', () => {
  assert.equal(
    formatShortcutAccelerator('Ctrl+ArrowRight'),
    'Ctrl + ArrowRight'
  )
  assert.equal(formatShortcutAccelerator('Alt+Ctrl+P'), 'Alt + Ctrl + P')
})

test('keyboardEventToShortcut returns modifier plus main key accelerators', () => {
  assert.equal(
    keyboardEventToShortcut({
      key: 'ArrowRight',
      altKey: false,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
    }),
    'Ctrl+ArrowRight'
  )
  assert.equal(
    keyboardEventToShortcut({
      key: 'p',
      altKey: true,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
    }),
    'Alt+Ctrl+P'
  )
  assert.equal(
    keyboardEventToShortcut({
      key: ' ',
      altKey: false,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
    }),
    'Ctrl+Space'
  )
})

test('keyboardEventToShortcut rejects modifier-only or main-key-only input', () => {
  assert.equal(
    keyboardEventToShortcut({
      key: 'Control',
      altKey: false,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
    }),
    null
  )
  assert.equal(
    keyboardEventToShortcut({
      key: 'p',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
    }),
    null
  )
})

test('hasShortcutConflict detects duplicate shortcuts in the same scope', () => {
  const bindings = normalizeShortcutBindings({
    playPause: { local: 'Ctrl+P', global: 'Alt+Ctrl+P' },
    nextTrack: { local: 'Ctrl+ArrowRight', global: 'Alt+Ctrl+ArrowRight' },
  })

  assert.equal(
    hasShortcutConflict(bindings, 'local', 'Ctrl+P', 'nextTrack'),
    true
  )
  assert.equal(
    hasShortcutConflict(bindings, 'global', 'Ctrl+P', 'nextTrack'),
    false
  )
  assert.equal(
    hasShortcutConflict(bindings, 'local', 'Ctrl+P', 'playPause'),
    false
  )
})

test('canEditShortcutBinding disables only global shortcuts when global shortcuts are off', () => {
  assert.equal(canEditShortcutBinding('local', false), true)
  assert.equal(canEditShortcutBinding('global', false), false)
  assert.equal(canEditShortcutBinding('global', true), true)
})

test('resolveEnabledGlobalShortcutRegistrations returns no global shortcuts when disabled', () => {
  assert.deepEqual(
    resolveEnabledGlobalShortcutRegistrations({
      enabled: false,
      bindings: DEFAULT_SHORTCUT_BINDINGS,
    }),
    []
  )
})

test('resolveEnabledGlobalShortcutRegistrations returns normalized unique global accelerators when enabled', () => {
  const registrations = resolveEnabledGlobalShortcutRegistrations({
    enabled: true,
    bindings: {
      ...DEFAULT_SHORTCUT_BINDINGS,
      nextTrack: {
        ...DEFAULT_SHORTCUT_BINDINGS.nextTrack,
        global: ' Alt + Ctrl + P ',
      },
    },
  })

  assert.deepEqual(registrations[0], {
    actionId: 'playPause',
    accelerator: 'Alt+Ctrl+P',
  })
  assert.equal(
    registrations.some(registration => registration.actionId === 'nextTrack'),
    false
  )
  assert.equal(registrations.length, 11)
})

test('resolveGlobalShortcutRegistrationStatuses marks only failed global registrations as unregistered', () => {
  const statuses = resolveGlobalShortcutRegistrationStatuses({
    enabled: true,
    bindings: DEFAULT_SHORTCUT_BINDINGS,
    isRegistered: accelerator => accelerator !== 'Alt+Ctrl+Right',
  })

  assert.deepEqual(statuses.playPause, {
    accelerator: 'Alt+Ctrl+P',
    registered: true,
  })
  assert.deepEqual(statuses.nextTrack, {
    accelerator: 'Alt+Ctrl+Right',
    registered: false,
  })
  assert.deepEqual(statuses.toggleSearch, {
    accelerator: 'Alt+Ctrl+K',
    registered: true,
  })
  assert.deepEqual(statuses.toggleFullscreen, {
    accelerator: 'Alt+Ctrl+Shift+F',
    registered: true,
  })
  assert.deepEqual(statuses.navigateBack, {
    accelerator: 'Alt+Ctrl+Shift+Left',
    registered: true,
  })
  assert.deepEqual(statuses.navigateForward, {
    accelerator: 'Alt+Ctrl+Shift+Right',
    registered: true,
  })
  assert.deepEqual(statuses.togglePlaylist, {
    accelerator: 'Alt+Ctrl+Shift+L',
    registered: true,
  })
})

test('normalizeShortcutForElectronAccelerator maps browser arrow key names for global shortcuts', () => {
  assert.equal(
    normalizeShortcutForElectronAccelerator('Alt+Ctrl+ArrowRight'),
    'Alt+Ctrl+Right'
  )
  assert.equal(
    normalizeShortcutForElectronAccelerator('Alt+Ctrl+ArrowLeft'),
    'Alt+Ctrl+Left'
  )
})

test('findShortcutActionByAccelerator resolves a normalized shortcut in one scope', () => {
  const bindings = normalizeShortcutBindings({
    playPause: { local: 'Ctrl+Space', global: 'Alt+Ctrl+Space' },
  })

  assert.equal(
    findShortcutActionByAccelerator(bindings, 'local', ' Ctrl + Space '),
    'playPause'
  )
  assert.equal(
    findShortcutActionByAccelerator(bindings, 'global', 'Ctrl+Space'),
    null
  )
})

test('resolveShortcutVolume applies shortcut volume changes with clamped boundaries', () => {
  assert.equal(resolveShortcutVolume('volumeUp', 98), 100)
  assert.equal(resolveShortcutVolume('volumeDown', 2), 0)
  assert.equal(resolveShortcutVolume('playPause', 50), null)
})
