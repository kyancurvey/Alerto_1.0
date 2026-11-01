import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import Page from '../../components/layout/Page'
import { Card, Select, useToast } from '../../components/ui'
import { languages } from '../../i18n'
import { moreItems } from '../../routes'
import './more.css'

export default function MorePage() {
  const { t, i18n } = useTranslation()
  const toast = useToast()

  const onLanguageChange = async (event) => {
    await i18n.changeLanguage(event.target.value)
    toast.show(i18n.t('language.changed'), 'success')
  }

  return (
    <Page title={t('nav.more')}>
      <Card flush>
        <ul className="more__list">
          {moreItems.map(({ to, key, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className="more__item">
                <Icon size={24} aria-hidden="true" />
                <span className="more__label">{t(`nav.${key}`)}</span>
                <ChevronRight size={20} aria-hidden="true" className="more__chevron" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {/* TEMP: language row, replaced by Settings in Prompt 9 */}
      <Card>
        <Select
          label={t('language.label')}
          value={languages.includes(i18n.language) ? i18n.language : 'en'}
          onChange={onLanguageChange}
          options={languages.map((code) => ({ value: code, label: t(`language.${code}`) }))}
        />
      </Card>
    </Page>
  )
}
