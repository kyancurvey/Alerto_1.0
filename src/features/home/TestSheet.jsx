import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, CheckList, Sheet } from '../../components/ui'
import { latency } from '../../lib/latency'
import { pathOf } from '../../routes'
import { useStore } from '../../store/StoreProvider'
import { selectContacts } from '../../store/selectors'

// One test running inside the sheet: each step ticks, then the result is saved.
function TestRun({ kind, vehicle, contacts, contactId, onDone }) {
  const { t } = useTranslation(['home', 'setup'])
  const { actions } = useStore()
  const steps = kind === 'sms'
    ? [
      { id: 'request', label: t('setup:tests.request') },
      { id: 'received', label: t('setup:tests.received') },
      ...contacts.map((contact) => ({ id: contact.id, label: t('setup:tests.sms.contact', { name: contact.name }), done: t('setup:tests.sms.delivered') })),
    ]
    : [
      { id: 'request', label: t('setup:tests.request') },
      { id: 'received', label: t('setup:tests.received') },
      { id: 'sound', label: t('setup:tests.alarm.sound'), done: t('setup:tests.alarm.heard') },
    ]
  // How many steps are finished.
  const [finished, setFinished] = useState(0)
  const complete = finished >= steps.length

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (let index = 0; index < steps.length; index += 1) {
        setFinished(index)
        await latency(400, 800)
        if (cancelled) return
      }
      actions.recordUnitTest(vehicle.id, kind, contactId)
      setFinished(steps.length)
    })()
    return () => {
      cancelled = true
    }
    // The run starts once, when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = steps.map((item, index) => {
    const state = index < finished ? 'ok' : index === finished ? 'running' : 'pending'
    return { id: item.id, label: item.label, state, detail: state === 'ok' ? item.done : state === 'running' ? t('setup:tests.running') : undefined }
  })

  return (
    <div className="home__test">
      <CheckList items={items} label={t(`setup:tests.${kind}.title`)} />
      {complete && (
        <p className="home__test-result" role="status">
          {kind === 'sms' ? t('test.doneSms', { count: contacts.length }) : t('test.doneAlarm')}
        </p>
      )}
      <Button block variant={complete ? 'primary' : 'outline'} onClick={onDone}>{complete ? t('test.done') : t('test.cancel')}</Button>
    </div>
  )
}

// With `contactId`, the SMS test goes to that one contact.
export default function TestSheet({ kind, vehicle, contactId = null, onClose }) {
  const { t } = useTranslation(['home', 'setup'])
  const { state } = useStore()
  const contacts = vehicle ? selectContacts(state, vehicle.id).filter((contact) => !contactId || contact.id === contactId) : []
  const open = Boolean(kind)
  const noContacts = kind === 'sms' && contacts.length === 0

  return (
    <Sheet open={open} onClose={onClose} title={kind ? t(`setup:tests.${kind}.title`) : ''}>
      {open && noContacts && (
        <div className="home__test">
          <p>{t('test.noContacts')}</p>
          <Link to={pathOf('people')} className="btn btn--primary btn--block" onClick={onClose}>{t('test.addContacts')}</Link>
        </div>
      )}
      {open && !noContacts && <TestRun key={`${kind}-${vehicle.id}-${contactId}`} kind={kind} vehicle={vehicle} contacts={contacts} contactId={contactId} onDone={onClose} />}
    </Sheet>
  )
}
