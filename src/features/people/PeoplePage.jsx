// TEMP: replaced in Prompt 8
import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Page from '../../components/layout/Page'
import { EmptyState } from '../../components/ui'

export default function PeoplePage() {
  const { t } = useTranslation('people')
  return (
    <Page title={t('title')}>
      <EmptyState icon={Users} title={t('purpose')} description={t('detail')} />
    </Page>
  )
}
