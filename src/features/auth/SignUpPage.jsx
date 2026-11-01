import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthLayout from '../../components/layout/AuthLayout'
import { Button, Field, Select } from '../../components/ui'
import useAuthPresenterActions from '../../components/presenter/useAuthPresenterActions'
import useTypeFill from '../../components/presenter/useTypeFill'
import { languages } from '../../i18n'
import { isEmail, MIN_PASSWORD } from '../../lib/validate'
import { paths } from '../../routes'
import { fills } from '../../sim/fills'
import { useStore } from '../../store/StoreProvider'
import PasswordField from './PasswordField'

export default function SignUpPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const { t: tp } = useTranslation('presenter')
  const { state, actions } = useStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const typeFill = useTypeFill()

  // The chosen language applies to the screen at once.
  const language = state.language
  const fill = () => {
    setErrors({})
    const { name: fillName, email: fillEmail, password: fillPassword, language: fillLanguage } = fills.newDriver
    typeFill([[setName, fillName], [setEmail, fillEmail], [setPassword, fillPassword], () => actions.setLanguage(fillLanguage)])
  }

  useAuthPresenterActions({
    title: tp('fill.title'),
    items: [{ id: 'newDriver', label: tp('fill.newDriver'), closeOnSelect: true, onSelect: fill }],
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
    const result = await actions.signUp({ name, email, password, language })
    // On success the guard moves the new driver to setup.
    if (!result.ok) {
      setBusy(false)
      setErrors({ email: t(`errors.${result.error}`) })
    }
  }

  return (
    <AuthLayout
      title={t('signUp.title')}
      subtitle={t('signUp.subtitle')}
      footer={<p>{t('signUp.haveAccount')} <Link className="auth__link" to={paths.signin}>{t('signUp.signIn')}</Link></p>}
    >
      <form className="auth__card" onSubmit={submit} noValidate>
        <Field label={t('fields.name')} autoComplete="name" value={name} error={errors.name} onChange={(event) => setName(event.target.value)} />
        <Field label={t('fields.email')} type="email" autoComplete="email" inputMode="email" value={email} error={errors.email} onChange={(event) => setEmail(event.target.value)} />
        <PasswordField label={t('fields.password')} autoComplete="new-password" hint={t('signUp.passwordHint', { min: MIN_PASSWORD })} value={password} error={errors.password} onChange={(event) => setPassword(event.target.value)} />
        <Select
          label={tc('language.label')}
          value={language}
          onChange={(event) => actions.setLanguage(event.target.value)}
          options={languages.map((code) => ({ value: code, label: tc(`language.${code}`) }))}
        />
        <Button type="submit" block loading={busy}>{t('signUp.submit')}</Button>
      </form>
    </AuthLayout>
  )
}
