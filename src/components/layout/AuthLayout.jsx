import { useTranslation } from 'react-i18next'
import { Card } from '../ui'
import Brand from './Brand'
import useBareChrome from './useBareChrome'
import './auth-layout.css'

// Branded frame for screens without the app navigation: navy panel with the logo, form on the right.
export default function AuthLayout({ title, subtitle, children, footer }) {
  const { t } = useTranslation('auth')
  useBareChrome()
  return (
    <div className="auth">
      <header className="auth__brand">
        <Brand />
        <p className="auth__tagline">{t('brand.tagline')}</p>
      </header>
      <main className="auth__main">
        <div className="auth__content">
          <div className="auth__heading">
            <h1 className="auth__title">{title}</h1>
            {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          </div>
          <Card className="auth__card">{children}</Card>
          {footer && <div className="auth__footer">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
