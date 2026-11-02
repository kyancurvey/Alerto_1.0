import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button } from '../../../components/ui'
import { latency, wait } from '../../../lib/latency'
import { useStore } from '../../../store/StoreProvider'
import CheckList from '../CheckList'
import StepNav from '../StepNav'
import useAlive from '../useAlive'

export default function TestsStep({ draft, go, fillRef }) {
  const { t } = useTranslation('setup')
  const { actions } = useStore()
  const alive = useAlive()
  // While a test runs: which one, and how many of its steps are finished.
  const [progress, setProgress] = useState(null)
  const { contacts, tests } = draft

  const stepsOf = (kind) => (kind === 'sms'
    ? [
      { id: 'request', label: t('tests.request') },
      { id: 'received', label: t('tests.received') },
      ...contacts.map((contact) => ({ id: contact.id, label: t('tests.sms.contact', { name: contact.name }), done: t('tests.sms.delivered') })),
    ]
    : [
      { id: 'request', label: t('tests.request') },
      { id: 'received', label: t('tests.received') },
      { id: 'sound', label: t('tests.alarm.sound'), done: t('tests.alarm.heard') },
    ])

  // Returns true when the test finished.
  const run = async (kind) => {
    const count = stepsOf(kind).length
    for (let index = 0; index < count; index += 1) {
      setProgress({ kind, index })
      await latency(400, 800)
      if (!alive.current) return false
    }
    actions.recordSetupTest(kind)
    setProgress(null)
    return true
  }

  const fill = async () => {
    if (progress) return
    if (!tests.sms && !(await run('sms'))) return
    if (!tests.alarm && !(await run('alarm'))) return
    await wait(600)
    if (alive.current) go('install')
  }
  useEffect(() => {
    fillRef.current = fill
    return () => {
      fillRef.current = null
    }
  })

  const card = (kind) => {
    const done = Boolean(tests[kind])
    const active = progress?.kind === kind
    const steps = stepsOf(kind)
    const items = steps.map((item, index) => {
      const state = active ? (index < progress.index ? 'ok' : index === progress.index ? 'running' : 'pending') : 'ok'
      return { id: item.id, label: item.label, state, detail: state === 'ok' ? item.done : state === 'running' ? t('tests.running') : undefined }
    })
    return (
      <section className="setup__section setup__test" aria-labelledby={`test-${kind}`}>
        <div className="setup__test-head">
          <h3 id={`test-${kind}`} className="setup__section-title">{t(`tests.${kind}.title`)}</h3>
          {done && !active && <Badge variant="ready">{t('tests.passed')}</Badge>}
        </div>
        {!done && !active && <p>{t(`tests.${kind}.intro`)}</p>}
        {(done || active) && <CheckList items={items} label={t(`tests.${kind}.title`)} />}
        <Button variant={done ? 'outline' : 'secondary'} block loading={active} disabled={Boolean(progress) && !active} onClick={() => run(kind)}>
          {done ? t(`tests.${kind}.again`) : t(`tests.${kind}.send`)}
        </Button>
      </section>
    )
  }

  const both = Boolean(tests.sms && tests.alarm)
  return (
    <div className="setup__form">
      {card('sms')}
      {card('alarm')}
      {both && !progress ? <p className="setup__status" role="status">{t('tests.allPassed')}</p> : <p className="setup__hint">{t('tests.bothNeeded')}</p>}
      <StepNav onBack={() => go('invite')} onNext={() => go('install')} nextDisabled={!both || Boolean(progress)} />
    </div>
  )
}
