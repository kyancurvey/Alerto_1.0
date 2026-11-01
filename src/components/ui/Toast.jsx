import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'

const ToastContext = createContext(null)
const ICONS = { info: Info, success: CircleCheck, error: CircleAlert }
const DURATION_MS = 4000

export function ToastProvider({ children }) {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), [])

  const show = useCallback((message, tone = 'info') => {
    const id = nextId.current++
    setToasts((list) => [...list, { id, message, tone }])
    setTimeout(() => dismiss(id), DURATION_MS)
  }, [dismiss])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone] ?? Info
          return (
            <div key={toast.id} className={`toast toast--${toast.tone}`}>
              <Icon size={20} aria-hidden="true" />
              <span className="toast__message">{toast.message}</span>
              <button type="button" className="toast__close" onClick={() => dismiss(toast.id)} aria-label={t('ui.close')}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
