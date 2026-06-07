export const formatScore = (score) => {
  const n = Number(score)
  if (Number.isNaN(n)) return '—'
  return n === Math.round(n) ? String(Math.round(n)) : n.toFixed(1)
}
