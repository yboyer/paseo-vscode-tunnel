import assert from 'node:assert/strict'

import { test } from 'vite-plus/test'

import { launchNativeWithWebFallback, launchWithWebFallback } from '../launch'

function browser(throws = false) {
  const opened: string[] = []
  let timeout = () => {}
  let departure = () => {}
  let cancelled = false
  let removed = false
  const cleanup = launchWithWebFallback('vscode://test', 'https://vscode.dev/test', {
    open(url) {
      opened.push(url)
      if (throws && url.startsWith('vscode:')) throw new Error('Unsupported protocol')
    },
    onDeparture(listener) {
      departure = listener
      return () => {
        removed = true
      }
    },
    schedule(callback, delay) {
      assert.equal(delay, 2500)
      timeout = callback
      return () => {
        cancelled = true
      }
    },
  })
  return {
    opened,
    cleanup,
    timeout: () => timeout(),
    departure: () => departure(),
    get cancelled() {
      return cancelled
    },
    get removed() {
      return removed
    },
  }
}

test('browser tries the app then falls back when nothing happens', () => {
  const state = browser()
  assert.deepEqual(state.opened, ['vscode://test'])
  state.timeout()
  state.timeout()
  assert.deepEqual(state.opened, ['vscode://test', 'https://vscode.dev/test'])
  assert.ok(state.cancelled && state.removed)
})

test('leaving the browser cancels web fallback permanently', () => {
  const state = browser()
  state.departure()
  state.timeout()
  assert.deepEqual(state.opened, ['vscode://test'])
  assert.ok(state.cancelled && state.removed)
})

test('rejected protocol immediately opens the web', () => {
  const state = browser(true)
  assert.deepEqual(state.opened, ['vscode://test', 'https://vscode.dev/test'])
})

test('plugin cleanup cancels pending navigation', () => {
  const state = browser()
  state.cleanup()
  state.timeout()
  assert.deepEqual(state.opened, ['vscode://test'])
})

for (const outcome of ['available', 'absent', 'query-rejected', 'launch-rejected'] as const) {
  test(`native protocol handler: ${outcome}`, async () => {
    const opened: string[] = []
    await launchNativeWithWebFallback('vscode://test', 'https://vscode.dev/test', {
      async canOpenURL() {
        if (outcome === 'query-rejected') throw new Error('Query denied')
        return outcome !== 'absent'
      },
      async openURL(url) {
        opened.push(url)
        if (outcome === 'launch-rejected' && url.startsWith('vscode:'))
          throw new Error('Launch failed')
      },
    })
    const expected = {
      available: ['vscode://test'],
      absent: ['https://vscode.dev/test'],
      'query-rejected': ['https://vscode.dev/test'],
      'launch-rejected': ['vscode://test', 'https://vscode.dev/test'],
    }
    assert.deepEqual(opened, expected[outcome])
  })
}
