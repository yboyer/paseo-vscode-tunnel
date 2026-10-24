import type { PluginButtonRegistration, PluginClientContext } from '@getpaseo/plugin/client'

import { openExternal, showError } from './client/web'
import { openTunnelRpc } from './shared/tunnel'

type Target = { id: string; workspaceId: string }
type Registration = { workspaceId: string; button: PluginButtonRegistration; dispose(): void }

export default function contribute(client: PluginClientContext) {
  const lifetime = new AbortController()
  const releases: (() => Promise<void>)[] = []
  const buttons = new Map<string, Registration>()

  const remove = (id: string) => {
    buttons.get(id)?.dispose()
    buttons.delete(id)
  }
  const clear = () => {
    for (const id of buttons.keys()) remove(id)
  }
  const register = (target: Target) => {
    if (lifetime.signal.aborted) return
    if (buttons.get(target.id)?.workspaceId === target.workspaceId) return
    remove(target.id)
    let pending = false
    let removed = false
    let cancelLaunch = () => {}
    // Assigned after the descriptor; onPress runs once the button is registered.
    // eslint-disable-next-line prefer-const
    let button: PluginButtonRegistration
    const descriptor = {
      title: 'Open worktree in VS Code',
      label: 'VS Code',
      icon: 'MonitorCloud',
      behavior: {
        kind: 'action' as const,
        async onPress() {
          if (pending || removed) return
          pending = true
          cancelLaunch()
          button.update({ disabled: true, label: 'VS Code…' })
          try {
            const { url, webUrl } = await client.rpc(openTunnelRpc, {
              workspaceId: target.workspaceId,
            })
            if (!lifetime.signal.aborted && !removed) {
              cancelLaunch = await openExternal(url, webUrl)
              if (lifetime.signal.aborted || removed) cancelLaunch()
            }
          } catch (error) {
            if (!lifetime.signal.aborted && !removed)
              showError(error instanceof Error ? error.message : String(error))
          } finally {
            pending = false
            button.update({ disabled: false, label: 'VS Code' })
          }
        },
      },
    }
    button = client.addHeaderButton({
      id: 'open-vscode-tunnel',
      workspaceId: target.workspaceId,
      button: descriptor,
    })
    buttons.set(target.id, {
      workspaceId: target.workspaceId,
      button,
      dispose() {
        removed = true
        cancelLaunch()
        button.remove()
      },
    })
  }

  const observe = async () => {
    const { subscription } = await client.paseo.workspaces.list({ subscribe: {} })
    if (lifetime.signal.aborted) {
      await subscription.release()
      return
    }
    releases.push(() => subscription.release())
    subscription.subscribe({
      snapshot: ({ entries }) => {
        clear()
        for (const workspace of entries) register({ id: workspace.id, workspaceId: workspace.id })
      },
      update: message => {
        if (message.type !== 'workspace_update') return
        const update = message.payload
        if (update.kind === 'upsert')
          register({ id: update.workspace.id, workspaceId: update.workspace.id })
        else remove(update.id)
      },
      error: error => console.error('[vscode-tunnel] Workspace subscription failed', error),
    })
  }
  void observe().catch(error => {
    if (!lifetime.signal.aborted) console.error('[vscode-tunnel] Cannot observe workspaces', error)
  })

  return () => {
    lifetime.abort()
    for (const release of releases)
      void release().catch(error =>
        console.error('[vscode-tunnel] Cannot release subscription', error)
      )
    clear()
  }
}
