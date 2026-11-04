// A position along the route in words: "Near Ibaan" or "Between Batangas City and Ibaan". Town names only.
// `t` is the translate function of the `map` namespace.
import { placeOf } from '../../lib/route'

export function placeText(t, s) {
  const place = placeOf(s)
  if (place.near) return t('place.near', { town: t(`towns.${place.near}`) })
  return t('place.between', { from: t(`towns.${place.from}`), to: t(`towns.${place.to}`) })
}
