import type { PluginServerContext } from '@getpaseo/plugin/server'

import { createTunnelUrl, detectTunnelName } from './server/tunnel'
import { openTunnelRpc } from './shared/tunnel'

export default function contribute(server: PluginServerContext) {
  server.handle(openTunnelRpc, async ({ workspaceId }, { paseo }) => {
    const result = await paseo.workspaces.ref(workspaceId).refresh()
    if (!result) throw new Error('Workspace not found.')
    const directory = result.workspaceDirectory
    const tunnelName = await detectTunnelName()
    return {
      url: createTunnelUrl(tunnelName, directory),
      webUrl: createTunnelUrl(tunnelName, directory, 'web'),
      tunnelName,
      directory,
    }
  })
  return () => {}
}
