// Small seeded random generator (mulberry32), so every reset gives the same history.
export function createRng(seed) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    float: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
    // weights[i] is the weight of index i; returns the chosen index.
    weighted: (weights) => {
      const total = weights.reduce((sum, w) => sum + w, 0)
      let r = next() * total
      for (let i = 0; i < weights.length; i += 1) {
        r -= weights[i]
        if (r < 0) return i
      }
      return weights.length - 1
    },
  }
}
