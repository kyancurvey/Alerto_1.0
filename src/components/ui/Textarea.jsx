import { useId } from 'react'

export default function Textarea({ label, hint, error, id, className = '', rows = 3, ...textareaProps }) {
  const autoId = useId()
  const textareaId = id ?? autoId
  const describedBy = [hint && `${textareaId}-hint`, error && `${textareaId}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={textareaId}>{label}</label>
      <textarea
        id={textareaId}
        className="field__control field__control--area"
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...textareaProps}
      />
      {hint && <p id={`${textareaId}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${textareaId}-error`} className="field__error">{error}</p>}
    </div>
  )
}
