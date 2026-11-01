// Schematic route geometry: Batangas City -> Ibaan -> Rosario. Town labels only.
// Every event position and the live marker is a point on this line, stored as `s` (0 to 1 along its length).
const POINTS = [
  [13.7565, 121.0583],
  [13.765, 121.072],
  [13.775, 121.09],
  [13.79, 121.108],
  [13.8186, 121.1328],
  [13.83, 121.156],
  [13.84, 121.18],
  [13.8458, 121.2033],
]

const toRad = (deg) => (deg * Math.PI) / 180
function km([lat1, lon1], [lat2, lon2]) {
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}

const cumulative = POINTS.reduce((list, point, index) => {
  list.push(index === 0 ? 0 : list[index - 1] + km(POINTS[index - 1], point))
  return list
}, [])

export const ROUTE_KM = cumulative[cumulative.length - 1]
export const ROUTE_POINTS = POINTS

// Town labels at their position along the line.
export const ROUTE_TOWNS = [
  { key: 'batangasCity', name: 'Batangas City', s: 0 },
  { key: 'ibaan', name: 'Ibaan', s: cumulative[4] / ROUTE_KM },
  { key: 'rosario', name: 'Rosario', s: 1 },
]

export function pointAt(s) {
  const clamped = Math.min(1, Math.max(0, s))
  const target = clamped * ROUTE_KM
  let index = 1
  while (index < cumulative.length - 1 && cumulative[index] < target) index += 1
  const span = cumulative[index] - cumulative[index - 1]
  const f = span === 0 ? 0 : (target - cumulative[index - 1]) / span
  const [lat1, lon1] = POINTS[index - 1]
  const [lat2, lon2] = POINTS[index]
  return { s: clamped, lat: +(lat1 + (lat2 - lat1) * f).toFixed(5), lon: +(lon1 + (lon2 - lon1) * f).toFixed(5) }
}
