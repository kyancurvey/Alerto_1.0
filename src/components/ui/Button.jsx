export default function Button({ variant = 'primary', block = false, loading = false, disabled, className = '', children, type = 'button', ...rest }) {
  const classes = ['btn', `btn--${variant}`, block && 'btn--block', loading && 'btn--loading', className].filter(Boolean).join(' ')
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}
