import { defineRpc } from '@getpaseo/plugin'
import { z } from 'zod'

export const openTunnelRpc = defineRpc({
  name: 'tunnel.open',
  input: z.object({ workspaceId: z.string().min(1) }),
  output: z.object({
    url: z.string(),
    webUrl: z.string(),
    tunnelName: z.string(),
    directory: z.string(),
  }),
})
