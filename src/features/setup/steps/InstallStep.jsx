import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import InstallHelp from '../../../components/install/InstallHelp'
import { useToast } from '../../../components/ui'
import { wait } from '../../../lib/latency'
import { useStore } from '../../../store/StoreProvider'
import StepNav from '../StepNav'
import useAlive from '../useAlive'

export default function InstallStep({ go, fillRef }) {
  const { t } = useTranslation('setup')
  const toast = useToast()
  const { actions } = useStore()
  const alive = useAlive()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // On success the guard moves the driver to Home, because the vehicle now exists.
  const finish = async () => {
    setError('')
    setBusy(true)
    const result = await actions.finishSetup()
    if (result.ok) {
      toast.show(t('install.done', { name: result.vehicleName }), 'success')
      return
    }
    if (!alive.current) return
    setBusy(false)
    setError(t(`install.errors.${result.error}`))
  }

  const fill = async () => {
    await wait(300)
    if (alive.current) await finish()
  }
  useEffect(() => {
    fillRef.current = fill
    return () => {
      fillRef.current = null
    }
  })

  return (
    <div className="setup__form">
      <InstallHelp />
      {error && <p className="auth__error" role="alert">{error}</p>}
      <StepNav onBack={() => go('tests')} onNext={finish} nextLabel={t('install.finish')} nextLoading={busy} />
    </div>
  )
}
