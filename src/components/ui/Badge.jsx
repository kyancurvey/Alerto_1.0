// Variants: neutral, ready (green), updating (blue), caution (amber, Level 1 and faults),
// warning (red, Level 2), critical (red with pulsing ring, Level 3), crash (deep red).
export default function Badge({ variant = 'neutral', className = '', children }) {
  return (
    <span className={['badge', `badge--${variant}`, className].filter(Boolean).join(' ')}>
      {variant !== 'neutral' && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}
