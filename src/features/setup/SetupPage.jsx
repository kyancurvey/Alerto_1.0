// TEMP: replaced in Prompt 4 by the first-time setup wizard
import { useTranslation } from 'react-i18next'
import AuthLayout from '../../components/layout/AuthLayout'
import useAppPresenterActions from '../../components/presenter/useAppPresenterActions'
import { Button } from '../../components/ui'
import { useStore } from '../../store/StoreProvider'
import useSession from '../../store/useSession'

export default function SetupPage() {
  const { t } = useTranslation('setup')
  const { t: tc } = useTranslation()
  const { actions } = useStore()
  const { account } = useSession()
  useAppPresenterActions()

  return (
    <AuthLayout title={t('title')} subtitle={t('welcome', { name: account?.name })}>
      <p>{t('detail')}</p>
      <Button variant="outline" block onClick={actions.signOut}>{tc('account.signOut')}</Button>
    </AuthLayout>
  )
}
