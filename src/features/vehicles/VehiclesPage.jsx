import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bus, Lock, Plus } from 'lucide-react'
import Page from '../../components/layout/Page'
import { Avatar, Card, EmptyState, Skeleton } from '../../components/ui'
import { can } from '../../lib/permissions'
import useFirstLoad from '../../lib/useFirstLoad'
import { pathOf } from '../../routes'
import { useStore } from '../../store/StoreProvider'
import useSession from '../../store/useSession'
import { selectHomeSubjects } from '../../store/selectors'
import VehicleCard from './VehicleCard'
import './vehicles.css'

// The driver's own vehicles, or for a family member the vehicles of each linked driver (when the driver shares unit status).
export default function VehiclesPage() {
  const { t } = useTranslation('vehicles')
  const { state } = useStore()
  const { account, role } = useSession()
  const ready = useFirstLoad('vehicles')
  const linked = can(role, 'followLinkedDrivers')
  const owner = can(role, 'addVehicle')
  const subjects = selectHomeSubjects(state, account, linked)

  if (!ready) {
    return (
      <div className="page" role="status" aria-label={t('loading')}>
        <Skeleton height="48px" />
        <Skeleton height="132px" />
        <Skeleton height="132px" />
      </div>
    )
  }

  return (
    <Page title={t('title')}>
      {owner && (
        <Link to={`${pathOf('vehicles')}/new`} className="btn btn--secondary vehicles__add">
          <Plus size={22} aria-hidden="true" />{t('addVehicle')}
        </Link>
      )}
      {subjects.length === 0 && <EmptyState icon={Bus} title={t('empty.title')} description={linked ? t('empty.family') : t('empty.driver')} />}
      {subjects.map((subject) => (
        <section key={subject.id} className="vehicles__group" aria-label={linked ? subject.name : undefined}>
          {linked && (
            <header className="vehicles__who">
              <Avatar name={subject.name} />
              <div>
                <h2 className="vehicles__who-name">{subject.name}</h2>
                <p className="vehicles__who-role">{t('driver')}</p>
              </div>
            </header>
          )}
          {subject.share.status ? (
            subject.vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} owner={owner} />)
          ) : (
            <Card className="vehicles__locked">
              <Lock size={24} aria-hidden="true" />
              <div>
                <h3>{t('locked.title')}</h3>
                <p>{t('locked.detail', { name: subject.name })}</p>
              </div>
            </Card>
          )}
        </section>
      ))}
    </Page>
  )
}
