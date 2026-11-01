// TEMP: replaced in Prompt 9
import { ChartColumn } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Page from '../../components/layout/Page'
import { EmptyState } from '../../components/ui'

export default function ReportsPage() {
  const { t } = useTranslation('reports')
  return (
    <Page title={t('title')}>
      <EmptyState icon={ChartColumn} title={t('purpose')} description={t('detail')} />
    </Page>
  )
}
