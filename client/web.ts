import { Alert, Linking, Platform } from 'react-native'

import { launchNativeWithWebFallback, launchWithWebFallback } from './launch'

// Browser APIs stay confined to this module; no DOM types enter the plugin.
declare const window: {
  location: { assign(url: string): void }
  alert(message: string): void
  addEventListener(event: string, listener: () => void): void
  removeEventListener(event: string, listener: () => void): void
  navigator: { userAgent: string; maxTouchPoints?: number }
}
declare const document: {
  hidden: boolean
  addEventListener(event: string, listener: () => void): void
  removeEventListener(event: string, listener: () => void): void
}

export function isMobileClient(): boolean {
  return (
    Platform.OS === 'android' ||
    Platform.OS === 'ios' ||
    (Platform.OS === 'web' &&
      (/Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent) ||
        (/Macintosh/i.test(window.navigator.userAgent) &&
          (window.navigator.maxTouchPoints ?? 0) > 1)))
  )
}

export async function openExternal(url: string, webUrl: string): Promise<() => void> {
  if (Platform.OS !== 'web') {
    await launchNativeWithWebFallback(url, webUrl, Linking)
    return () => {}
  }
  return launchWithWebFallback(url, webUrl, {
    open: target => window.location.assign(target),
    schedule(callback, delayMs) {
      const timer = setTimeout(callback, delayMs)
      return () => clearTimeout(timer)
    },
    onDeparture(listener) {
      const onHidden = () => {
        if (document.hidden) listener()
      }
      window.addEventListener('blur', listener)
      window.addEventListener('pagehide', listener)
      document.addEventListener('visibilitychange', onHidden)
      return () => {
        window.removeEventListener('blur', listener)
        window.removeEventListener('pagehide', listener)
        document.removeEventListener('visibilitychange', onHidden)
      }
    },
  })
}

export function showError(message: string): void {
  if (Platform.OS === 'web') window.alert(message)
  else Alert.alert('VS Code Tunnel', message)
}
