export default function Skeleton({ width, height, className = '' }) {
  return <span className={['skeleton', className].filter(Boolean).join(' ')} style={{ width, height }} aria-hidden="true" />
}
