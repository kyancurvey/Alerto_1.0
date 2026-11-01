// TEMP: replaced in Prompt 9
import { Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Page from '../../components/layout/Page'
import { EmptyState } from '../../components/ui'

export default function SettingsPage() {
  const { t } = useTranslation('settings')
  return (
    <Page title={t('title')}>
      <EmptyState icon={Settings} title={t('purpose')} description={t('detail')} />
    </Page>
  )
}
