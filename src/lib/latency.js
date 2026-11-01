// Short artificial wait so actions feel like a round trip to a server (250 to 700 ms).
export const LATENCY_MIN_MS = 250
export const LATENCY_MAX_MS = 700

export function latency(min = LATENCY_MIN_MS, max = LATENCY_MAX_MS) {
  const ms = Math.round(min + Math.random() * (max - min))
  return new Promise((resolve) => setTimeout(resolve, ms))
}
