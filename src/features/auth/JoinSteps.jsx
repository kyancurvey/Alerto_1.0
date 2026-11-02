import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import InstallHelp from '../../components/install/InstallHelp'
import useAuthPresenterActions from '../../components/presenter/useAuthPresenterActions'
import useTypeFill from '../../components/presenter/useTypeFill'
import { Badge, Button, Field, Select } from '../../components/ui'
import { languages } from '../../i18n'
import { isEmail, MIN_PASSWORD } from '../../lib/validate'
import { fills } from '../../sim/fills'
import { useStore } from '../../store/StoreProvider'
import PasswordField from './PasswordField'
import './join.css'

// Step 1: the family member's own details and language.
export function DetailsStep({ initial, initialError, onDone }) {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const { t: tp } = useTranslation('presenter')
  const { state, actions } = useStore()
  const [name, setName] = useState(initial?.name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [password, setPassword] = useState(initial?.password ?? '')
  const [errors, setErrors] = useState(initialError ? { email: t(`errors.${initialError}`) } : {})
  const [busy, setBusy] = useState(false)
  const typeFill = useTypeFill()
  const language = state.language

  useAuthPresenterActions({
    title: tp('fill.title'),
    items: [{
      id: 'joinAccount',
      label: tp('fill.joinAccount'),
      closeOnSelect: true,
      onSelect: () => {
        setErrors({})
        const { name: fillName, email: fillEmail, password: fillPassword, language: fillLanguage } = fills.invite
        typeFill([[setName, fillName], [setEmail, fillEmail], [setPassword, fillPassword], () => actions.setLanguage(fillLanguage)])
      },
    }],
  })

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (name.trim().length < 2) next.name = t('errors.nameRequired')
    if (!email.trim()) next.email = t('errors.emailRequired')
    else if (!isEmail(email)) next.email = t('errors.emailInvalid')
    if (!password) next.password = t('errors.passwordRequired')
    else if (password.length < MIN_PASSWORD) next.password = t('errors.passwordShort')
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setBusy(true)
    const result = await actions.checkNewEmail(email)
    setBusy(false)
    if (!result.ok) return setErrors({ email: t(`errors.${result.error}`) })
    return onDone({ name, email, password, language })
  }

  return (
    <form className="join__form" onSubmit={submit} noValidate>
      <Field label={t('fields.name')} autoComplete="name" value={name} error={errors.name} onChange={(event) => setName(event.target.value)} />
      <Field label={t('fields.email')} type="email" autoComplete="email" inputMode="email" value={email} error={errors.email} onChange={(event) => setEmail(event.target.value)} />
      <PasswordField label={t('fields.password')} autoComplete="new-password" hint={t('signUp.passwordHint', { min: MIN_PASSWORD })} value={password} error={errors.password} onChange={(event) => setPassword(event.target.value)} />
      <Select
        label={tc('language.label')}
        value={language}
        onChange={(event) => actions.setLanguage(event.target.value)}
        options={languages.map((code) => ({ value: code, label: tc(`language.${code}`) }))}
      />
      <Button type="submit" block loading={busy}>{t('join.submit')}</Button>
    </form>
  )
}

// Step 2: accept the link to the driver. This is where the account is created and the driver sees the invitation as accepted.
export function AcceptStep({ code, values, share, driverName, onBack, onEmailTaken, onDone }) {
  const { t } = useTranslation('auth')
  const { actions } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useAuthPresenterActions(null)

  const accept = async () => {
    setError('')
    setBusy(true)
    const result = await actions.joinWithInvite({ code, ...values })
    if (result.ok) return onDone()
    setBusy(false)
    if (result.error === 'emailTaken') return onEmailTaken()
    return setError(t(`errors.${result.error}`))
  }

  return (
    <div className="join__form">
      <p>{t('join.accept.intro', { name: driverName })}</p>
      <ul className="join__shares">
        {['alerts', 'map', 'status'].map((key) => (
          <li key={key} className="join__share">
            <span className="join__share-label">{t(`join.accept.${key}`)}</span>
            <Badge variant={share[key] ? 'ready' : 'neutral'}>{share[key] ? t('join.accept.shared') : t('join.accept.notShared')}</Badge>
          </li>
        ))}
      </ul>
      <p className="join__hint">{t('join.accept.note', { name: driverName })}</p>
      {error && <p className="auth__error" role="alert">{error}</p>}
      <Button block loading={busy} onClick={accept}>{t('join.accept.submit')}</Button>
      <Button variant="outline" block disabled={busy} onClick={onBack}>{t('join.accept.back')}</Button>
    </div>
  )
}

// Step 3: an in-app screen that explains notifications. It does not open the browser's own permission prompt.
export function NotifyStep({ onDone }) {
  const { t } = useTranslation('auth')
  useAuthPresenterActions(null)
  return (
    <div className="join__form">
      <span className="join__bell" aria-hidden="true"><Bell size={32} /></span>
      <ul className="join__list">
        {['crash', 'sent', 'critical', 'offline'].map((key) => <li key={key}>{t(`join.notify.${key}`)}</li>)}
      </ul>
      <Button block onClick={onDone}>{t('join.notify.allow')}</Button>
      <Button variant="outline" block onClick={onDone}>{t('join.notify.later')}</Button>
    </div>
  )
}

// Step 4: home screen tip, then sign in with the new account and open the app.
export function TipStep({ values }) {
  const { t } = useTranslation('auth')
  const { actions } = useStore()
  const [busy, setBusy] = useState(false)
  useAuthPresenterActions(null)

  // On success the sign-in guard moves the person to Home.
  const open = async () => {
    setBusy(true)
    const result = await actions.signIn({ email: values.email, password: values.password })
    if (!result.ok) setBusy(false)
  }

  return (
    <div className="join__form">
      <InstallHelp />
      <Button block loading={busy} onClick={open}>{t('join.tip.open')}</Button>
    </div>
  )
}
