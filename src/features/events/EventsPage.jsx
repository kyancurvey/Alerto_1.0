// TEMP: replaced in Prompt 7
import { CalendarClock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Page from '../../components/layout/Page'
import { EmptyState } from '../../components/ui'

export default function EventsPage() {
  const { t } = useTranslation('events')
  return (
    <Page title={t('title')}>
      <EmptyState icon={CalendarClock} title={t('purpose')} description={t('detail')} />
    </Page>
  )
}
