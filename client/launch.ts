export interface BrowserLaunchEnvironment {
  onDeparture(listener: () => void): () => void
  open(url: string): void
  schedule(callback: () => void, delayMs: number): () => void
}

// Browser protocol launches have no success result. Leaving the page is only a hint.
export function launchWithWebFallback(
  appUrl: string,
  webUrl: string,
  environment: BrowserLaunchEnvironment
): () => void {
  let finished = false
  let cancelTimer = () => {}
  let removeListeners = () => {}
  const cleanup = () => {
    finished = true
    cancelTimer()
    removeListeners()
  }
  const fallback = () => {
    if (finished) return
    cleanup()
    environment.open(webUrl)
  }
  removeListeners = environment.onDeparture(cleanup)
  cancelTimer = environment.schedule(fallback, 2500)
  try {
    environment.open(appUrl)
  } catch {
    fallback()
  }
  return cleanup
}

export async function launchNativeWithWebFallback(
  appUrl: string,
  webUrl: string,
  linking: { canOpenURL(url: string): Promise<boolean>; openURL(url: string): Promise<unknown> }
): Promise<void> {
  try {
    if (await linking.canOpenURL(appUrl)) {
      await linking.openURL(appUrl)
      return
    }
  } catch {
    // Missing handler, denied protocol query, or failed app launch: use HTTPS.
  }
  await linking.openURL(webUrl)
}
