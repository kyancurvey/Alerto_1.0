import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { moreSection, nav, tabs } from '../../routes'

export default function BottomTabs() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <nav className="tabbar" aria-label={t('nav.main')}>
      {tabs.map(({ to, key, icon: Icon }) => {
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
