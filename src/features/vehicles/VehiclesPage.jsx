// TEMP: replaced in Prompt 8
import { Bus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Page from '../../components/layout/Page'
import { EmptyState } from '../../components/ui'

export default function VehiclesPage() {
  const { t } = useTranslation('vehicles')
  return (
    <Page title={t('title')}>
      <EmptyState icon={Bus} title={t('purpose')} description={t('detail')} />
    </Page>
  )
}
