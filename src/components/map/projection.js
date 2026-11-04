// The drawing of the route. The map is a hand-drawn schematic, not a survey: the road is a curve drawn to fit a
// phone held upright, and a place on it is the same 0 to 1 `s` that every event and unit position already uses
// (a share of the route's length). North is not up and nothing is to scale.
const KEY_POINTS = [
  [150, 1180], [300, 1090], [420, 1010], [500, 900], [600, 790],
  [640, 660], [760, 560], [850, 450], [860, 320], [800, 200],
]
const SAMPLES = 12

// Smooth curve through the key points (Catmull-Rom), as a dense list of points.
function smooth(points) {
  const at = (index) => points[Math.min(points.length - 1, Math.max(0, index))]
  const result = [points[0]]
  for (let i = 0; i < points.length - 1; i += 1) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    for (let step = 1; step <= SAMPLES; step += 1) {
      const t = step / SAMPLES
      const blend = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
      result.push([blend(p0[0], p1[0], p2[0], p3[0]), blend(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  return result.map(([x, y]) => ({ x, y }))
}

const ROAD = smooth(KEY_POINTS)
const LENGTHS = ROAD.reduce((list, point, index) => {
  list.push(index === 0 ? 0 : list[index - 1] + Math.hypot(point.x - ROAD[index - 1].x, point.y - ROAD[index - 1].y))
  return list
}, [])
const TOTAL = LENGTHS[LENGTHS.length - 1]

export const WORLD = { x0: -500, y0: -300, x1: 1500, y1: 1600 }

// The point at `s` along the road.
export function xyAt(s) {
  const target = Math.min(1, Math.max(0, s)) * TOTAL
  let index = 1
  while (index < LENGTHS.length - 1 && LENGTHS[index] < target) index += 1
  const span = LENGTHS[index] - LENGTHS[index - 1]
  const f = span === 0 ? 0 : (target - LENGTHS[index - 1]) / span
  const [a, b] = [ROAD[index - 1], ROAD[index]]
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
}

// The road between two places, in the order travelled, and any list of points as an SVG path.
export function xyBetween(s0, s1) {
  const from = Math.min(s0, s1)
  const to = Math.max(s0, s1)
  const inside = ROAD.filter((_, index) => LENGTHS[index] / TOTAL > from && LENGTHS[index] / TOTAL < to)
  const points = [xyAt(from), ...inside, xyAt(to)]
  return s0 <= s1 ? points : points.reverse()
}
export const toPath = (points) => points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
export const ROUTE_PATH = toPath(ROAD)

// The box that holds the stretch from s0 to s1 (never smaller than about 3 km, so a single place is not zoomed to nothing).
const MIN_SPAN = 240
export function boundsBetween(s0, s1) {
  const points = xyBetween(s0, s1)
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, width: Math.max(x1 - x0, MIN_SPAN), height: Math.max(y1 - y0, MIN_SPAN) }
}
