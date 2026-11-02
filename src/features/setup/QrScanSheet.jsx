import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck } from 'lucide-react'
import { Button, Sheet } from '../../components/ui'
import { wait } from '../../lib/latency'
import { useStore } from '../../store/StoreProvider'

const LOCK_MS = 2000
const HOLD_MS = 700

// The viewfinder is drawn, not a camera view: nothing is recorded or shown. It locks on after about two seconds.
function ScanBody({ onResult, onClose }) {
  const { t } = useTranslation('setup')
  const { actions } = useStore()
  const [phase, setPhase] = useState('searching')
  const [error, setError] = useState('')
  const resultRef = useRef(onResult)
  useEffect(() => {
    resultRef.current = onResult
  })

  useEffect(() => {
    let live = true
    Promise.all([wait(LOCK_MS), actions.scanUnitQr()]).then(([, result]) => {
      if (!live) return
      if (!result.ok) {
        setError(result.error)
        setPhase('failed')
        return
      }
      setPhase('found')
      wait(HOLD_MS).then(() => live && resultRef.current(result.code))
    })
    return () => {
      live = false
    }
  }, [actions])

  const message = phase === 'searching' ? t('unit.scanSearching') : phase === 'found' ? t('unit.scanFound') : t(`unit.errors.${error}`)

  return (
    <div className="scan__wrap">
      <div className={`scan scan--${phase}`} aria-hidden="true">
        <span className="scan__corner scan__corner--tl" />
        <span className="scan__corner scan__corner--tr" />
        <span className="scan__corner scan__corner--bl" />
        <span className="scan__corner scan__corner--br" />
        <span className="scan__line" />
        {phase === 'found' && <CircleCheck className="scan__check" size={56} />}
      </div>
      <p className="scan__message" role="status">{message}</p>
      {phase === 'searching' && <p className="setup__hint">{t('unit.scanHint')}</p>}
      <Button variant="outline" block onClick={onClose}>{t('unit.scanCancel')}</Button>
    </div>
  )
}

export default function QrScanSheet({ open, onClose, onResult }) {
  const { t } = useTranslation('setup')
  return (
    <Sheet open={open} onClose={onClose} title={t('unit.scanTitle')}>
      <ScanBody onResult={onResult} onClose={onClose} />
    </Sheet>
  )
}
