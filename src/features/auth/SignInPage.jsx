import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthLayout from '../../components/layout/AuthLayout'
import { Button, Field } from '../../components/ui'
import useAuthPresenterActions from '../../components/presenter/useAuthPresenterActions'
import useTypeFill from '../../components/presenter/useTypeFill'
import { isEmail } from '../../lib/validate'
import { paths } from '../../routes'
import { fills } from '../../sim/fills'
import { useStore } from '../../store/StoreProvider'
import ForgotPasswordSheet from './ForgotPasswordSheet'
import PasswordField from './PasswordField'

export default function SignInPage() {
  const { t } = useTranslation('auth')
  const { t: tp } = useTranslation('presenter')
  const { actions } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const typeFill = useTypeFill()

  const fill = (role) => {
    setErrors({})
    setFailed(false)
    typeFill([[setEmail, fills[role].email], [setPassword, fills[role].password]])
  }

  useAuthPresenterActions({
    title: tp('fill.account'),
    layout: 'segmented',
    items: ['driver', 'family', 'admin'].map((role) => ({ id: role, label: tp(`account.${role}`), closeOnSelect: true, onSelect: () => fill(role) })),
  })

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!email.trim()) next.email = t('errors.emailRequired')
    else if (!isEmail(email)) next.email = t('errors.emailInvalid')
    if (!password) next.password = t('errors.passwordRequired')
    setErrors(next)
    setFailed(false)
    if (Object.keys(next).length > 0) return
    setBusy(true)
    const result = await actions.signIn({ email, password })
    // On success the guard moves the person to their start screen.
    if (!result.ok) {
      setBusy(false)
      setFailed(true)
    }
  }

  return (
    <AuthLayout
      title={t('signIn.title')}
      subtitle={t('signIn.subtitle')}
      footer={(
        <>
          <p>{t('signIn.noAccount')} <Link className="auth__link" to={paths.signup}>{t('signIn.createAccount')}</Link></p>
          <p>{t('signIn.joinPrompt')} <Link className="auth__link" to={paths.join}>{t('signIn.join')}</Link></p>
        </>
      )}
    >
      <form className="auth__card" onSubmit={submit} noValidate>
        {failed && <p className="auth__error" role="alert">{t('errors.invalidLogin')}</p>}
        <Field label={t('fields.email')} type="email" autoComplete="email" inputMode="email" value={email} error={errors.email} onChange={(event) => setEmail(event.target.value)} />
        <PasswordField label={t('fields.password')} autoComplete="current-password" value={password} error={errors.password} onChange={(event) => setPassword(event.target.value)} />
        <Button type="submit" block loading={busy}>{t('signIn.submit')}</Button>
        <button type="button" className="auth__linkbtn" onClick={() => setForgotOpen(true)}>{t('signIn.forgot')}</button>
      </form>
      {forgotOpen && <ForgotPasswordSheet open onClose={() => setForgotOpen(false)} initialEmail={email} />}
    </AuthLayout>
  )
}
