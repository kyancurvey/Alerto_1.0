// TEMP: replaced in Prompt 5
import { House } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Page from '../../components/layout/Page'
import { EmptyState } from '../../components/ui'

export default function HomePage() {
  const { t } = useTranslation('home')
  return (
    <Page title={t('title')}>
      <EmptyState icon={House} title={t('purpose')} description={t('detail')} />
    </Page>
  )
}
