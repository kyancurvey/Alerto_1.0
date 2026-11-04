import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, MessageSquareText, OctagonAlert, Siren, TriangleAlert, WifiOff, X } from 'lucide-react'
import { pathOf } from '../../routes'
import { useStore } from '../../store/StoreProvider'
import { selectAccount, selectVehicle } from '../../store/selectors'
import './push.css'

const FRESH_MS = 45 * 1000
const MAX_VISIBLE = 3
const SHOW_MS = { crash_countdown: 10000, crash_sms: 10000 }
const DEFAULT_SHOW_MS = 7000
const shown = new Set()

// Which copy, icon and colour a notification uses (spec 4.5).
function describe(notification) {
  const { kind, params } = notification
  switch (kind) {
    case 'crash_countdown': return { copy: 'crash_countdown', icon: Siren, tone: 'crash' }
    case 'crash_cancelled': return { copy: 'crash_cancelled', icon: CircleCheck, tone: 'ready' }
    case 'crash_sms': {
      const all = params.sent === params.total
      return { copy: all ? 'crash_sms_all' : 'crash_sms_partial', icon: MessageSquareText, tone: all ? 'ready' : 'caution' }
    }
    case 'drowsiness_critical': return { copy: params.count > 1 ? 'drowsiness_critical_many' : 'drowsiness_critical', icon: OctagonAlert, tone: 'critical' }
    case 'unit_offline': return { copy: 'unit_offline', icon: WifiOff, tone: 'neutral' }
    default: return { copy: `unit_fault_${params.fault}`, icon: TriangleAlert, tone: 'caution' }
  }
}

function Banner({ notification, onOpen, onDismiss }) {
  const { t } = useTranslation('home')
  const { state } = useStore()
  const vehicle = selectVehicle(state, notification.vehicleId)
  const { copy, icon: Icon, tone } = describe(notification)
  const values = { ...notification.params, driver: (vehicle?.ownerName ?? '').split(' ')[0], vehicle: vehicle?.name ?? '' }

  useEffect(() => {
    const timer = setTimeout(onDismiss, SHOW_MS[notification.kind] ?? DEFAULT_SHOW_MS)
    return () => clearTimeout(timer)
    // Each banner starts its own timer once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`push push--${tone}`}>
      <button type="button" className="push__open" onClick={onOpen}>
        <span className="push__icon"><Icon size={24} aria-hidden="true" /></span>
        <span className="push__text">
          <span className="push__title">{t(`push.${copy}.title`, values)}</span>
          <span className="push__body">{t(`push.${copy}.body`, values)}</span>
        </span>
      </button>
      <button type="button" className="push__close" onClick={onDismiss} aria-label={t('push.dismiss')}>
        <X size={20} aria-hidden="true" />
      </button>
    </div>
  )
}

// Push-style banners that slide in from the top when a notification arrives for the signed-in person.
// Repeated notifications of the same group replace each other. Tapping one opens its event.
export default function PushLayer() {
  const { state } = useStore()
  const navigate = useNavigate()
  const account = selectAccount(state)
  const accountId = account?.id ?? null
  const [view, setView] = useState({ accountId: null, banners: [] })

  useEffect(() => {
    if (!accountId) {
      setView((prev) => (prev.banners.length ? { accountId: null, banners: [] } : prev))
      return
    }
    const now = Date.now()
    const fresh = state.notifications
      .filter((item) => item.recipients.includes(accountId) && now - item.time < FRESH_MS && !shown.has(`${accountId}:${item.id}`))
      .reverse()
    if (fresh.length === 0) return
    fresh.forEach((item) => shown.add(`${accountId}:${item.id}`))
    setView((prev) => {
      let banners = prev.accountId === accountId ? prev.banners : []
      fresh.forEach((item) => {
        banners = [item, ...banners.filter((banner) => !item.group || banner.group !== item.group)]
      })
      return { accountId, banners: banners.slice(0, MAX_VISIBLE) }
    })
  }, [state.notifications, accountId])

  const dismiss = (id) => setView((prev) => ({ ...prev, banners: prev.banners.filter((banner) => banner.id !== id) }))
  const open = (notification) => {
    dismiss(notification.id)
    navigate(notification.eventId ? `${pathOf('events')}/${notification.eventId}` : pathOf('home'))
  }
  const banners = view.accountId === accountId ? view.banners : []

  return (
    <div className="pushes" aria-live="assertive">
      {banners.map((notification) => (
        <Banner key={notification.id} notification={notification} onOpen={() => open(notification)} onDismiss={() => dismiss(notification.id)} />
      ))}
    </div>
  )
}
