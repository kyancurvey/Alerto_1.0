// TEMP: replaced in Prompt 9
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Page from '../../components/layout/Page'
import { EmptyState } from '../../components/ui'

export default function AdminPage() {
  const { t } = useTranslation('admin')
  return (
    <Page title={t('title')}>
      <EmptyState icon={ShieldCheck} title={t('purpose')} description={t('detail')} />
    </Page>
  )
}
