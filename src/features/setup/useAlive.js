import { useEffect, useRef } from 'react'

// A ref that turns false when the screen goes away, so a long step (a fill, a check) stops instead of acting on a screen that is gone.
export default function useAlive() {
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  return alive
}
