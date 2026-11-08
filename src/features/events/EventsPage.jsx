import { CalendarClock, Download, Lock } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Page from '../../components/layout/Page'
import { Button, EmptyState, Skeleton, useToast } from '../../components/ui'
import { downloadCsv } from '../../lib/csv'
import { DEFAULT_FILTERS, groupByDay, matchesFilters, parseFilters } from '../../lib/events'
import { can } from '../../lib/permissions'
import { formatDayHeading, formatSheetDate, manilaDayStart } from '../../lib/time'
import useNow from '../../lib/useNow'
import { useStore } from '../../store/StoreProvider'
import useSession from '../../store/useSession'
import { selectEventScope, selectVisibleEvents } from '../../store/selectors'
import EventFilters from './EventFilters'
import EventRow from './EventRow'
import { buildEventsCsv } from './exportEvents'
import useEventsReady from './useEventsReady'
import './events.css'

const DAY_MS = 24 * 60 * 60 * 1000

export default function EventsPage() {
  const { t, i18n } = useTranslation('events')
  const { state } = useStore()
  const { account, role } = useSession()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const now = useNow(30000)
  const ready = useEventsReady()

  const filters = parseFilters(params)
  const scope = selectEventScope(state, account, { linked: can(role, 'followLinkedDrivers'), all: can(role, 'viewAllUnits') })
  const vehicles = scope.map((entry) => entry.vehicle)
  const visible = selectVisibleEvents(state, scope)
  const shown = visible.filter((event) => matchesFilters(event, filters, now))
  const groups = groupByDay(shown)
  const vehicleOf = (id) => vehicles.find((vehicle) => vehicle.id === id)

  const change = (key, value) => {
    const next = new URLSearchParams(params)
    if (value === '' || value === DEFAULT_FILTERS[key]) next.delete(key)
    else next.set(key, value)
    if (key === 'period' && value !== 'custom') {
      next.delete('from')
      next.delete('to')
    }
    setParams(next, { replace: true })
  }
  const clear = () => setParams({}, { replace: true })

  const dayTitle = (start) => {
    const today = manilaDayStart(now)
    if (start === today) return t('day.today')
    if (start === today - DAY_MS) return t('day.yesterday')
    return formatDayHeading(start + 12 * 60 * 60 * 1000, i18n.language)
  }

  const exportCsv = () => {
    downloadCsv(`${t('csv.file')}-${formatSheetDate(Date.now())}.csv`, buildEventsCsv({ t, events: shown, state }))
    toast.show(t('csv.done', { count: shown.length }), 'success')
  }

  if (!ready) {
    return (
      <Page title={t('title')}>
        <div className="evlist__skeleton" role="status" aria-label={t('loading')}>
          {[0, 1, 2, 3, 4].map((index) => <Skeleton key={index} height="72px" />)}
        </div>
      </Page>
    )
  }

  if (scope.length === 0 || (scope.every((entry) => !entry.alerts && !entry.status))) {
    return (
      <Page title={t('title')}>
        <EmptyState
          icon={scope.length === 0 ? CalendarClock : Lock}
          title={scope.length === 0 ? t('none.title') : t('locked.title')}
          description={scope.length === 0 ? t('none.detail') : t('locked.detail')}
        />
      </Page>
    )
  }

  return (
    <Page title={t('title')}>
      <EventFilters filters={filters} vehicles={vehicles} onChange={change} onClear={clear} />
      <div className="evlist__bar">
        <p className="evlist__count" role="status" aria-live="polite">{t('count', { count: shown.length })}</p>
        {can(role, 'exportEvents') && (
          <Button variant="outline" onClick={exportCsv} disabled={shown.length === 0}>
            <Download size={20} aria-hidden="true" />{t('csv.button')}
          </Button>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={visible.length === 0 ? t('empty.title') : t('noMatch.title')}
          description={visible.length === 0 ? t('empty.detail') : t('noMatch.detail')}
          action={visible.length > 0 ? <Button variant="outline" onClick={clear}>{t('filters.clear')}</Button> : undefined}
        />
      ) : (
        groups.map((group) => (
          <section key={group.start} className="evlist__day" aria-labelledby={`day-${group.start}`}>
            <h2 id={`day-${group.start}`} className="evlist__heading">{dayTitle(group.start)}</h2>
            <ul className="evlist__rows">
              {group.events.map((event) => (
                <li key={event.id}><EventRow event={event} vehicle={vehicleOf(event.vehicleId)} showVehicle={vehicles.length > 1} /></li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Page>
  )
}
