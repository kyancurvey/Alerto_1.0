import { useTranslation } from 'react-i18next'

export default function Brand() {
  const { t } = useTranslation()
  return (
    <div className="brand">
      <span className="brand__tile">
        <img className="brand__logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="40" height="40" />
      </span>
      <span className="brand__name">{t('app.name')}</span>
    </div>
  )
}
