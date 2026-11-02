import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthLayout from '../../components/layout/AuthLayout'
import useAuthPresenterActions from '../../components/presenter/useAuthPresenterActions'
import { paths } from '../../routes'
import { selectInviteByCode } from '../../store/selectors'
import { useStore } from '../../store/StoreProvider'
import { AcceptStep, DetailsStep, NotifyStep, TipStep } from './JoinSteps'

function UnavailableInvite({ error }) {
  const { t } = useTranslation('auth')
  useAuthPresenterActions(null)
  return (
    <AuthLayout
      title={t('join.invalidTitle')}
      footer={<p><Link className="auth__link" to={paths.join}>{t('signIn.join')}</Link></p>}
    >
      <p className="auth__error" role="alert">{t(`errors.${error}`)}</p>
    </AuthLayout>
  )
}

// Opened from the invitation link (#/join/CODE) or after entering the code.
// Steps: account details, accept the link, allow notifications, home screen tip, then Home.
function JoinFlow({ code }) {
  const { t } = useTranslation('auth')
  const { state } = useStore()
  // The invitation as it was when the page opened: accepting it later in this flow must not turn it into an error.
  const [invite] = useState(() => selectInviteByCode(state, code))
  const [step, setStep] = useState('details')
  const [values, setValues] = useState(null)
  const [detailsError, setDetailsError] = useState('')

  if (!invite) return <UnavailableInvite error="codeNotFound" />
  if (invite.status !== 'invited') return <UnavailableInvite error="codeUsed" />

  const driver = state.accounts.find((account) => account.id === invite.driverId)
  const name = driver?.name ?? ''
  const heading = {
    details: { title: t('join.invited', { name }), subtitle: t('join.invitedDetail', { name }) },
    accept: { title: t('join.accept.title', { name }) },
    notify: { title: t('join.notify.title'), subtitle: t('join.notify.intro', { name }) },
    tip: { title: t('join.tip.title'), subtitle: t('join.tip.intro') },
  }[step]

  return (
    <AuthLayout
      title={heading.title}
      subtitle={heading.subtitle}
      footer={step === 'details' ? <p><Link className="auth__link" to={paths.signin}>{t('join.back')}</Link></p> : undefined}
    >
      {step === 'details' && (
        <DetailsStep
          initial={values}
          initialError={detailsError}
          onDone={(next) => {
            setValues(next)
            setDetailsError('')
            setStep('accept')
          }}
        />
      )}
      {step === 'accept' && (
        <AcceptStep
          code={invite.code}
          values={values}
          share={invite.share}
          driverName={name}
          onBack={() => setStep('details')}
          onEmailTaken={() => {
            setDetailsError('emailTaken')
            setStep('details')
          }}
          onDone={() => setStep('notify')}
        />
      )}
      {step === 'notify' && <NotifyStep onDone={() => setStep('tip')} />}
      {step === 'tip' && <TipStep values={values} />}
    </AuthLayout>
  )
}

export default function JoinInvitePage() {
  const { code } = useParams()
  return <JoinFlow key={code} code={code} />
}
