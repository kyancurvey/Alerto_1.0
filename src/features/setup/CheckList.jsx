import { Circle, CircleCheck, LoaderCircle, TriangleAlert } from 'lucide-react'

const ICONS = { pending: Circle, running: LoaderCircle, ok: CircleCheck, fault: TriangleAlert }

// A list of checks that tick one by one. item: { id, label, state: 'pending' | 'running' | 'ok' | 'fault', detail }
export default function CheckList({ items, label }) {
  return (
    <ul className="checks" aria-label={label} aria-live="polite">
      {items.map((item) => {
        const Icon = ICONS[item.state]
        return (
          <li key={item.id} className={`checks__item checks__item--${item.state}`}>
            <Icon className="checks__icon" size={22} aria-hidden="true" />
            <span className="checks__text">
              <span className="checks__label">{item.label}</span>
              {item.detail && <span className="checks__detail">{item.detail}</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
