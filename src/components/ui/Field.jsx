import { useId } from 'react'

// `trailing` is an optional control (for example a show/hide button) placed inside the input box.
export default function Field({ label, hint, error, id, trailing, className = '', ...inputProps }) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={inputId}>{label}</label>
      {trailing ? (
        <div className="field__box">
          <input
            id={inputId}
            className="field__control field__control--trailing"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...inputProps}
          />
          {trailing}
        </div>
      ) : (
        <input
          id={inputId}
          className="field__control"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
      )}
      {hint && <p id={`${inputId}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${inputId}-error`} className="field__error">{error}</p>}
    </div>
  )
}
