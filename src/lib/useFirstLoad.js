import { useEffect, useState } from 'react'
import { latency } from './latency'

// The first time a screen opens after the app loads it waits a moment, like a real request would.
// After that the data is already here.
const shown = new Set()
export default function useFirstLoad(key) {
  const [ready, setReady] = useState(shown.has(key))
  useEffect(() => {
    if (shown.has(key)) {
      setReady(true)
      return undefined
    }
    let current = true
    latency().then(() => {
      shown.add(key)
      if (current) setReady(true)
    })
    return () => {
      current = false
    }
  }, [key])
  return ready
}
