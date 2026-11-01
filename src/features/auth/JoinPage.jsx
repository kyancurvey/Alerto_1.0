import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthLayout from '../../components/layout/AuthLayout'
import { Button, Field } from '../../components/ui'
import useAuthPresenterActions from '../../components/presenter/useAuthPresenterActions'
import useTypeFill from '../../components/presenter/useTypeFill'
import { paths } from '../../routes'
import { fills } from '../../sim/fills'
import { useStore } from '../../store/StoreProvider'

export default function JoinPage() {
  const { t } = useTranslation('auth')
  const { t: tp } = useTranslation('presenter')
  const { actions } = useStore()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const typeFill = useTypeFill()

  useAuthPresenterActions({
    title: tp('fill.title'),
    items: [{
      id: 'inviteCode',
      label: tp('fill.inviteCode'),
      closeOnSelect: true,
      onSelect: () => {
        setError('')
        typeFill([[setCode, fills.invite.code]])
      },
    }],
  })

  const submit = async (event) => {
    event.preventDefault()
    if (!code.trim()) return setError(t('errors.codeRequired'))
    setError('')
    setBusy(true)
    const result = await actions.checkInviteCode(code)
    setBusy(false)
    if (!result.ok) return setError(t(`errors.${result.error}`))
    return navigate(`${paths.join}/${result.code}`)
  }

  return (
    <AuthLayout
      title={t('join.title')}
      subtitle={t('join.subtitle')}
      footer={<p><Link className="auth__link" to={paths.signin}>{t('join.back')}</Link></p>}
    >
      <form className="auth__card" onSubmit={submit} noValidate>
        <Field
          label={t('join.code')}
          hint={t('join.codeHint')}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          value={code}
          error={error}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
        />
        <Button type="submit" block loading={busy}>{t('join.submit')}</Button>
      </form>
    </AuthLayout>
  )
}
