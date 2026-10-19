import { execFile } from 'node:child_process'
import { isAbsolute } from 'node:path'
import { promisify } from 'node:util'

import { z } from 'zod'

const execFileAsync = promisify(execFile)
const statusSchema = z.object({
  tunnel: z.object({ name: z.string().min(1), tunnel: z.string() }).nullable(),
})

export function parseTunnelName(stdout: string): string {
  let status
  try {
    status = statusSchema.parse(JSON.parse(stdout))
  } catch {
    throw new Error('Invalid response from code tunnel status.')
  }
  if (status.tunnel?.tunnel !== 'Connected') {
    throw new Error('No connected tunnel. Start a tunnel with code tunnel.')
  }
  return status.tunnel.name
}

export function createTunnelUrl(
  tunnelName: string,
  directory: string,
  target: 'desktop' | 'web' = 'desktop'
): string {
  if (!isAbsolute(directory)) throw new Error('The workspace directory must be an absolute path.')
  const prefix = target === 'web' ? 'https://vscode.dev/tunnel/' : 'vscode://vscode-remote/tunnel+'
  const query = target === 'desktop' ? '?windowId=_blank' : ''
  return `${prefix}${encodeURIComponent(tunnelName)}${directory.split('/').map(encodeURIComponent).join('/')}${query}`
}

export async function detectTunnelName(): Promise<string> {
  let stdout: string
  try {
    ;({ stdout } = await execFileAsync('code', ['tunnel', 'status'], {
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
      encoding: 'utf8',
    }))
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT')
      throw new Error('The code command was not found in the Paseo daemon’s PATH.')
    throw new Error('Unable to read tunnel status. Check code tunnel status on the server.')
  }
  return parseTunnelName(stdout)
}
