import { useEffect } from 'react'

// Screens without a tab bar (sign-in, setup) tell the CSS so the gear and toasts sit at the bottom edge.
export default function useBareChrome() {
  useEffect(() => {
    document.documentElement.dataset.chrome = 'bare'
    return () => {
      delete document.documentElement.dataset.chrome
    }
  }, [])
}
