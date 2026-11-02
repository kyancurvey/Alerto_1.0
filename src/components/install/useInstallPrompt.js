import { useSyncExternalStore } from 'react'

// The browser offers "install" once, early (Chrome, Edge, Android). It is kept here so a screen that opens later can still use it.
let deferred = null
let installedNow = false
let version = 0
const listeners = new Set()
const emit = () => {
  version += 1
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installedNow = true
    emit()
  })
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export default function useInstallPrompt() {
  useSyncExternalStore(subscribe, () => version)
  return {
    canInstall: Boolean(deferred),
    installed: installedNow || isStandalone(),
    async install() {
      if (!deferred) return false
      const event = deferred
      deferred = null
      emit()
      event.prompt()
      const choice = await event.userChoice
      return choice.outcome === 'accepted'
    },
  }
}
