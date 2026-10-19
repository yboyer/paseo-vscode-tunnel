import assert from 'node:assert/strict'

import { test } from 'vite-plus/test'

import { createTunnelUrl, parseTunnelName } from '../tunnel'

test('reads the actual code tunnel status format', () => {
  assert.equal(
    parseTunnelName(
      JSON.stringify({
        tunnel: {
          name: 'hosted',
          tunnel: 'Connected',
          tunnel_id: 'test',
          has_editor_link: true,
        },
        service_installed: false,
      })
    ),
    'hosted'
  )
})

test('rejects absent, disconnected, malformed and incomplete status', () => {
  for (const status of [
    'null',
    'not json',
    '{}',
    '{"tunnel":null}',
    '{"tunnel":{"name":"hosted","tunnel":"Disconnected"}}',
    '{"tunnel":{"name":"","tunnel":"Connected"}}',
  ]) {
    assert.throws(() => parseTunnelName(status))
  }
})

test('opens the selected worktree in a new desktop window', () => {
  assert.equal(
    createTunnelUrl('hosted', '/home/debian/worktrees/fix'),
    'vscode://vscode-remote/tunnel+hosted/home/debian/worktrees/fix?windowId=_blank'
  )
})

test('encodes path segments without losing path separators', () => {
  assert.equal(
    createTunnelUrl('my tunnel', '/tmp/café #1/a?b%'),
    'vscode://vscode-remote/tunnel+my%20tunnel/tmp/caf%C3%A9%20%231/a%3Fb%25?windowId=_blank'
  )
})

test('rejects relative directories', () => {
  assert.throws(() => createTunnelUrl('hosted', '../worktree'))
})

test('opens the same worktree through vscode.dev on mobile', () => {
  assert.equal(
    createTunnelUrl('hosted', '/home/debian/worktrees/café #1', 'web'),
    'https://vscode.dev/tunnel/hosted/home/debian/worktrees/caf%C3%A9%20%231'
  )
})
