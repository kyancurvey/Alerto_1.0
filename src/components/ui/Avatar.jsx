const initialsOf = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')

export default function Avatar({ name, size = 'md', className = '' }) {
  return (
    <span className={['avatar', `avatar--${size}`, className].filter(Boolean).join(' ')} role="img" aria-label={name}>
      <span aria-hidden="true">{initialsOf(name)}</span>
    </span>
  )
}
