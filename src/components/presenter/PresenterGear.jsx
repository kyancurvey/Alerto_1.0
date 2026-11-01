import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Cog, X } from 'lucide-react'
import { Sheet } from '../ui'
import useMediaQuery from './useMediaQuery'
import { invokePresenterItem, usePresenterSections } from './registry'
import './presenter.css'

const CONFIRM_MS = 4000

function PanelBody({ sections, onClose }) {
  const [confirming, setConfirming] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const select = (section, item) => {
    if (item.confirm && confirming !== `${section.id}:${item.id}`) {
      setConfirming(`${section.id}:${item.id}`)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setConfirming(null), CONFIRM_MS)
      return
    }
    setConfirming(null)
    invokePresenterItem(section.id, item.id)
    if (item.closeOnSelect) onClose()
  }

  return (
    <div className="gear-panel">
      {sections.map((section) => (
        <section key={section.id} className="gear-section" aria-labelledby={`gear-${section.id}`}>
          <h3 id={`gear-${section.id}`} className="gear-section__title">{section.title}</h3>
          <div className={section.layout === 'segmented' ? 'gear-segments' : 'gear-list'}>
            {section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={['gear-item', item.danger && 'gear-item--danger', item.active && 'gear-item--active'].filter(Boolean).join(' ')}
                aria-pressed={section.layout === 'segmented' ? Boolean(item.active) : undefined}
                disabled={item.disabled}
                onClick={() => select(section, item)}
              >
                {confirming === `${section.id}:${item.id}` ? item.confirm : item.label}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function Popover({ open, onClose, title, children }) {
  const { t } = useTranslation()
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    ref.current?.focus()
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <>
      <div className="gear-pop__scrim" onClick={onClose} />
      <div className="gear-pop" role="dialog" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="gear-pop__header">
          <h2 className="gear-pop__title">{title}</h2>
          <button type="button" className="sheet__close" onClick={onClose} aria-label={t('ui.close')}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="gear-pop__body">{children}</div>
      </div>
    </>,
    document.body,
  )
}

// The one presenter surface. Bottom sheet on phones, popover beside the side navigation on large screens.
export default function PresenterGear() {
  const { t } = useTranslation('presenter')
  const [open, setOpen] = useState(false)
  const large = useMediaQuery('(min-width: 1024px)')
  const sections = usePresenterSections()
  const button = useRef(null)

  const close = useCallback(() => {
    setOpen(false)
    button.current?.focus()
  }, [])

  const body = <PanelBody sections={sections} onClose={close} />
  const Panel = large ? Popover : Sheet

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`gear${open ? ' gear--open' : ''}`}
        aria-label={t('gear.label')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Cog size={22} aria-hidden="true" />
      </button>
      <Panel open={open} onClose={close} title={t('gear.title')}>{body}</Panel>
    </>
  )
}
