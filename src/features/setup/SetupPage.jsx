import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import AuthLayout from '../../components/layout/AuthLayout'
import useAppPresenterActions from '../../components/presenter/useAppPresenterActions'
import { Button } from '../../components/ui'
import { SETUP_STEPS } from '../../lib/setup'
import { selectSetup } from '../../store/selectors'
import { useStore } from '../../store/StoreProvider'
import useSession from '../../store/useSession'
import ContactsStep from './steps/ContactsStep'
import InstallStep from './steps/InstallStep'
import InviteStep from './steps/InviteStep'
import TestsStep from './steps/TestsStep'
import UnitStep from './steps/UnitStep'
import VehicleStep from './steps/VehicleStep'
import './setup.css'

const STEP_COMPONENTS = { vehicle: VehicleStep, unit: UnitStep, contacts: ContactsStep, invite: InviteStep, tests: TestsStep, install: InstallStep }

// First-time setup for a driver without a vehicle. The draft lives in the store, so a reload resumes on the same step.
export default function SetupPage() {
  const { t } = useTranslation('setup')
  const { t: tc } = useTranslation()
  const { t: tp } = useTranslation('presenter')
  const { state, actions } = useStore()
  const { account } = useSession()
  const draft = selectSetup(state, account?.id)
  const step = SETUP_STEPS.includes(draft.step) ? draft.step : SETUP_STEPS[0]
  const index = SETUP_STEPS.indexOf(step)

  // The gear's "Fill this step" runs whatever the current step registered in fillRef.
  const fillRef = useRef(null)
  const filling = useRef(false)
  const runFill = async () => {
    if (filling.current || !fillRef.current) return
    filling.current = true
    try {
      await fillRef.current()
    } finally {
      filling.current = false
    }
  }
  useAppPresenterActions([{
    id: 'fill',
    title: tp('fill.title'),
    layout: 'list',
    items: [{ id: 'step', label: tp('fill.step'), closeOnSelect: true, onSelect: runFill }],
  }])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  const Step = STEP_COMPONENTS[step]
  const progress = t('progress', { current: index + 1, total: SETUP_STEPS.length })

  return (
    <AuthLayout
      title={t(`steps.${step}.title`)}
      subtitle={t(`steps.${step}.subtitle`, { name: account?.name })}
      footer={<Button variant="ghost" onClick={actions.signOut}>{tc('account.signOut')}</Button>}
    >
      <div className="setup__progress">
        <p className="setup__progress-text">{progress}</p>
        <div
          className="setup__bar"
          role="progressbar"
          aria-label={t('progressLabel')}
          aria-valuemin={1}
          aria-valuemax={SETUP_STEPS.length}
          aria-valuenow={index + 1}
          aria-valuetext={progress}
        >
          {SETUP_STEPS.map((id, position) => <span key={id} className={`setup__seg${position <= index ? ' setup__seg--done' : ''}`} />)}
        </div>
      </div>
      <Step key={step} draft={draft} go={actions.setupStep} fillRef={fillRef} />
    </AuthLayout>
  )
}
