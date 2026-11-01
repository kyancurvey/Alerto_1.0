import { useRef } from 'react'

export default function Tabs({ label, items, value, onChange }) {
  const listRef = useRef(null)

  const onKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const index = items.findIndex((item) => item.id === value)
    const next = items[(index + step + items.length) % items.length]
    onChange(next.id)
    listRef.current.querySelector(`[data-tab="${next.id}"]`)?.focus()
  }

  return (
    <div className="tabs" role="tablist" aria-label={label} ref={listRef} onKeyDown={onKeyDown}>
      {items.map((item) => {
        const selected = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            data-tab={item.id}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={['tabs__tab', selected && 'tabs__tab--selected'].filter(Boolean).join(' ')}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
