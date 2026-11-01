import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, Sheet } from '../../components/ui'
import { isEmail } from '../../lib/validate'
import { useStore } from '../../store/StoreProvider'

// Asks for an email and always answers politely, whether or not an account exists. Mounted only while open.
export default function ForgotPasswordSheet({ open, onClose, initialEmail = '' }) {
  const { t } = useTranslation('auth')
  const { actions } = useStore()
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!email.trim()) return setError(t('errors.emailRequired'))
    if (!isEmail(email)) return setError(t('errors.emailInvalid'))
    setError('')
    setBusy(true)
    await actions.requestPasswordCode(email)
    setBusy(false)
    setSent(true)
  }

  return (
    <Sheet open={open} onClose={onClose} title={sent ? t('forgot.sentTitle') : t('forgot.title')}>
      {sent ? (
        <div className="auth__card">
          <p>{t('forgot.sent', { email: email.trim() })}</p>
          <Button block onClick={onClose}>{t('forgot.done')}</Button>
        </div>
      ) : (
        <form className="auth__card" onSubmit={submit} noValidate>
          <p>{t('forgot.intro')}</p>
          <Field label={t('fields.email')} type="email" autoComplete="email" inputMode="email" value={email} error={error} onChange={(event) => setEmail(event.target.value)} />
          <Button type="submit" block loading={busy}>{t('forgot.send')}</Button>
        </form>
      )}
    </Sheet>
  )
}
