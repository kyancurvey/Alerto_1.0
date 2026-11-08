import { useEffect, useState } from 'react'
import { latency } from '../../lib/latency'

// The first time the app opens Events (list or an event from a notification) it waits a moment, like a real
// request would. After that the data is already here.
let shown = false
export default function useEventsReady() {
  const [ready, setReady] = useState(shown)
  useEffect(() => {
    if (shown) return undefined
    let current = true
    latency().then(() => {
      shown = true
      if (current) setReady(true)
    })
    return () => {
      current = false
    }
  }, [])
  return ready
}
