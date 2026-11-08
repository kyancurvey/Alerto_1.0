import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { Button, Field, Select } from '../../components/ui'
import { EVENT_TYPES, LEVELS, PERIODS, activeFilterCount, levelApplies } from '../../lib/events'

// Vehicle, type, level and date range. On phones the panel opens from a button; on larger screens it is always open.
export default function EventFilters({ filters, vehicles, onChange, onClear }) {
  const { t } = useTranslation('events')
  const [open, setOpen] = useState(false)
  const count = activeFilterCount(filters)
  const option = (value, label) => ({ value, label })

  return (
    <section className="evfilters" aria-label={t('filters.title')}>
      <button type="button" className="evfilters__toggle" aria-expanded={open} aria-controls="evfilters-panel" onClick={() => setOpen(!open)}>
        <span>{t('filters.title')}{count > 0 ? ` (${count})` : ''}</span>
        <ChevronDown size={20} aria-hidden="true" className={open ? 'evfilters__chevron evfilters__chevron--open' : 'evfilters__chevron'} />
      </button>
      <div id="evfilters-panel" className={open ? 'evfilters__panel evfilters__panel--open' : 'evfilters__panel'}>
        {vehicles.length > 1 && (
          <Select
            label={t('filters.vehicle')}
            value={vehicles.some((vehicle) => vehicle.id === filters.vehicle) ? filters.vehicle : 'all'}
            onChange={(event) => onChange('vehicle', event.target.value)}
            options={[option('all', t('filters.allVehicles')), ...vehicles.map((vehicle) => option(vehicle.id, vehicle.name))]}
          />
        )}
        <Select
          label={t('filters.type')}
          value={filters.type}
          onChange={(event) => onChange('type', event.target.value)}
          options={[option('all', t('filters.allTypes')), ...EVENT_TYPES.map((type) => option(type, t(`type.${type}`)))]}
        />
        <Select
          label={t('filters.level')}
          value={levelApplies(filters) ? filters.level : 'all'}
          disabled={!levelApplies(filters)}
          hint={levelApplies(filters) ? undefined : t('filters.levelHint')}
          onChange={(event) => onChange('level', event.target.value)}
          options={[option('all', t('filters.allLevels')), ...LEVELS.map((level) => option(level, t(`level.${level}`)))]}
        />
        <Select
          label={t('filters.period')}
          value={filters.period}
          onChange={(event) => onChange('period', event.target.value)}
          options={PERIODS.map((period) => option(period, t(`filters.periods.${period}`)))}
        />
        {filters.period === 'custom' && (
          <>
            <Field label={t('filters.from')} type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => onChange('from', event.target.value)} />
            <Field label={t('filters.to')} type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => onChange('to', event.target.value)} />
          </>
        )}
        {count > 0 && (
          <Button variant="ghost" className="evfilters__clear" onClick={onClear}>{t('filters.clear')}</Button>
        )}
      </div>
    </section>
  )
}

