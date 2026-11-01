import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Select({ label, hint, options, id, className = '', ...selectProps }) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={selectId}>{label}</label>
      <div className="select">
        <select id={selectId} className="field__control select__control" aria-describedby={hint ? `${selectId}-hint` : undefined} {...selectProps}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown className="select__icon" size={20} aria-hidden="true" />
      </div>
      {hint && <p id={`${selectId}-hint`} className="field__hint">{hint}</p>}
    </div>
  )
}
