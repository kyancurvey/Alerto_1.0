import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useSession from '../../store/useSession'
import { sideItemsFor } from '../../routes'
import Brand from './Brand'

export default function SideNav() {
  const { t } = useTranslation()
  const { role } = useSession()

  return (
    <aside className="sidenav">
      <Brand />
      <nav className="sidenav__list" aria-label={t('nav.main')}>
        {sideItemsFor(role).map(({ to, key, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `sidenav__item${isActive ? ' sidenav__item--active' : ''}`}>
            <Icon size={22} aria-hidden="true" />
            <span>{t(`nav.${key}`)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
