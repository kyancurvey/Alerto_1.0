// TEMP: replaced in Prompt 4 by the family join flow (create account, accept link, notifications)
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthLayout from '../../components/layout/AuthLayout'
import useAuthPresenterActions from '../../components/presenter/useAuthPresenterActions'
import { paths } from '../../routes'
import { selectInviteByCode } from '../../store/selectors'
import { useStore } from '../../store/StoreProvider'

export default function JoinInvitePage() {
  const { t } = useTranslation('auth')
  const { code } = useParams()
  const { state } = useStore()
  const invite = selectInviteByCode(state, code)
  const driver = invite && state.accounts.find((account) => account.id === invite.driverId)
  useAuthPresenterActions(null)

  if (!invite || invite.status !== 'invited') return <Navigate to={paths.join} replace />
  return (
    <AuthLayout
      title={t('join.invited', { name: driver?.name ?? '' })}
      subtitle={t('join.invitedDetail', { code: invite.code })}
      footer={<p><Link className="auth__link" to={paths.join}>{t('join.back')}</Link></p>}
    >
      <p>{t('join.invitedNext')}</p>
    </AuthLayout>
  )
}
