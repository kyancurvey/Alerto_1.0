import { useEffect, useId, useSyncExternalStore } from 'react'

// Each screen can add actions to the gear panel. A section looks like:
// { id, title, layout: 'list' | 'segmented', items: [{ id, label, onSelect, active, disabled, danger, confirm, closeOnSelect }] }
const entries = new Map()
const listeners = new Set()
let signature = ''
let version = 0

// Only what the panel shows (not the handlers) decides whether it needs to redraw.
function publish() {
  const next = JSON.stringify([...entries.values()])
  if (next === signature) return
  signature = next
  version += 1
  listeners.forEach((listener) => listener())
}

export function usePresenterActions(sections) {
  const owner = useId()
  useEffect(() => {
    entries.set(owner, sections)
    publish()
  })
  useEffect(() => () => {
    entries.delete(owner)
    publish()
  }, [owner])
}

export function usePresenterSections() {
  useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, () => version)
  return [...entries.values()].flat()
}

// Runs the newest handler for an item, so a stale panel never calls an old closure.
export function invokePresenterItem(sectionId, itemId) {
  for (const sections of entries.values()) {
    const item = sections.find((section) => section.id === sectionId)?.items.find((entry) => entry.id === itemId)
    if (item) return item.onSelect?.()
  }
  return undefined
}
