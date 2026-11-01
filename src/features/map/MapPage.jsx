// TEMP: replaced in Prompt 6
import { Map as MapIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Page from '../../components/layout/Page'
import { EmptyState } from '../../components/ui'

export default function MapPage() {
  const { t } = useTranslation('map')
  return (
    <Page title={t('title')}>
      <EmptyState icon={MapIcon} title={t('purpose')} description={t('detail')} />
    </Page>
  )
}
