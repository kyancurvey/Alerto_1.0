import { useId } from 'react'

export default function Toggle({ label, hint, checked, onChange, disabled = false }) {
  const id = useId()
  return (
    <div className="toggle">
      <div className="toggle__text">
        <span id={`${id}-label`} className="toggle__label">{label}</span>
        {hint && <span id={`${id}-hint`} className="toggle__hint">{hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        disabled={disabled}
        className="toggle__switch"
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__thumb" />
      </button>
    </div>
  )
}
