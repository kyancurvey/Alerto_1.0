// TEMP: only the profile is built; notifications, privacy, install help, version and feedback arrive in Prompt 9
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Page from '../../components/layout/Page'
import { Avatar, Badge, Button, Card, Field, Select, useToast } from '../../components/ui'
import { languages } from '../../i18n'
import { isEmail } from '../../lib/validate'
import { useStore } from '../../store/StoreProvider'
import useSession from '../../store/useSession'
import './settings.css'

function ProfileCard({ account }) {
  const { t } = useTranslation('settings')
  const { t: tc, i18n } = useTranslation()
  const { t: ta } = useTranslation('auth')
  const toast = useToast()
  const { state, actions } = useStore()
  const [name, setName] = useState(account.name)
  const [email, setEmail] = useState(account.email)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const changeLanguage = (event) => {
    actions.setLanguage(event.target.value)
    toast.show(i18n.t('language.changed', { lng: event.target.value }), 'success')
  }

  const save = async (event) => {
    event.preventDefault()
    const next = {}
    if (name.trim().length < 2) next.name = ta('errors.nameRequired')
    if (!email.trim()) next.email = ta('errors.emailRequired')
    else if (!isEmail(email)) next.email = ta('errors.emailInvalid')
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setBusy(true)
    const result = await actions.updateProfile({ name, email })
    setBusy(false)
    if (!result.ok) return setErrors({ email: ta(`errors.${result.error}`) })
    return toast.show(t('profile.saved'), 'success')
  }

  return (
    <Card>
      <form className="settings__form" onSubmit={save} noValidate>
        <div className="settings__who">
          <Avatar name={account.name} size="lg" />
          <div>
            <h2>{t('profile.title')}</h2>
            <Badge>{tc(`role.${account.role}`)}</Badge>
          </div>
        </div>
        <Field label={ta('fields.name')} autoComplete="name" value={name} error={errors.name} onChange={(event) => setName(event.target.value)} />
        <Field label={ta('fields.email')} type="email" autoComplete="email" inputMode="email" value={email} error={errors.email} onChange={(event) => setEmail(event.target.value)} />
        <Select
          label={tc('language.label')}
          value={state.language}
          onChange={changeLanguage}
          options={languages.map((code) => ({ value: code, label: tc(`language.${code}`) }))}
        />
        <Button type="submit" loading={busy}>{t('profile.save')}</Button>
      </form>
    </Card>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation()
  const { actions } = useStore()
  const { account } = useSession()
  if (!account) return null

  return (
    <Page title={t('title')}>
      <ProfileCard key={account.id} account={account} />
      <Card>
        <Button variant="outline" block onClick={actions.signOut}>{tc('account.signOut')}</Button>
      </Card>
    </Page>
  )
}
