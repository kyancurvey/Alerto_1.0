import { useCallback, useEffect, useRef } from 'react'

const CHAR_MS = 28
const PAUSE_MS = 160
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Types text into form state one character at a time (instantly when the device asks for less motion).
// Steps are [setter, text] pairs or plain functions; a newer fill or leaving the screen stops the old one.
export default function useTypeFill() {
  const current = useRef(0)
  useEffect(() => () => {
    current.current += 1
  }, [])

  return useCallback(async (steps) => {
    const id = ++current.current
    const still = () => current.current === id
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    for (const step of steps) {
      if (typeof step === 'function') {
        step()
        continue
      }
      const [set, text] = step
      if (calm) {
        set(text)
        continue
      }
      set('')
      for (let count = 1; count <= text.length; count += 1) {
        await wait(CHAR_MS)
        if (!still()) return
        set(text.slice(0, count))
      }
      await wait(PAUSE_MS)
      if (!still()) return
    }
  }, [])
}
