// Ids for records made in the app. The random part keeps two records made in the same millisecond apart.
export const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
