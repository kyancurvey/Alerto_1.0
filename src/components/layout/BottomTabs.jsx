import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useSession from '../../store/useSession'
import { moreItemsFor, nav, tabsFor } from '../../routes'

export default function BottomTabs() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { role } = useSession()
  const moreSection = moreItemsFor(role).map((item) => item.to)

  return (
    <nav className="tabbar" aria-label={t('nav.main')}>
      {tabsFor(role).map(({ to, key, icon: Icon }) => {
        const forceActive = to === nav.more.to && moreSection.includes(pathname)
        return (
          <NavLink key={to} to={to} className={({ isActive }) => `tabbar__item${isActive || forceActive ? ' tabbar__item--active' : ''}`}>
            <Icon size={24} aria-hidden="true" />
            <span className="tabbar__label">{t(`nav.${key}`)}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
