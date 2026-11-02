import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Field } from '../../../components/ui'
import useTypeFill from '../../../components/presenter/useTypeFill'
import { wait } from '../../../lib/latency'
import { normalizePlate } from '../../../lib/validate'
import { fills } from '../../../sim/fills'
import { useStore } from '../../../store/StoreProvider'
import StepNav from '../StepNav'
import useAlive from '../useAlive'

export default function VehicleStep({ draft, go, fillRef }) {
  const { t } = useTranslation('setup')
  const { actions } = useStore()
  const alive = useAlive()
  const typeFill = useTypeFill()
  const [name, setName] = useState(draft.vehicle?.name ?? '')
  const [plate, setPlate] = useState(draft.vehicle?.plate ?? '')
  const [route, setRoute] = useState(draft.vehicle?.route ?? '')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const save = async (values) => {
    const found = {}
    if (values.name.trim().length < 2) found.name = t('vehicle.errors.nameRequired')
    if (!values.plate.trim()) found.plate = t('vehicle.errors.plateRequired')
    else if (!normalizePlate(values.plate)) found.plate = t('vehicle.errors.plateInvalid')
    if (values.route.trim().length < 2) found.route = t('vehicle.errors.routeRequired')
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setBusy(true)
    const result = await actions.saveSetupVehicle(values)
    if (!alive.current) return
    setBusy(false)
    if (!result.ok) return setErrors({ plate: t(`vehicle.errors.${result.error}`) })
    go('unit')
  }

  const fill = async () => {
    setErrors({})
    const values = fills.newVehicle
    if (!(await typeFill([[setName, values.name], [setPlate, values.plate], [setRoute, values.route]]))) return
    await wait(500)
    if (alive.current) await save(values)
  }
  useEffect(() => {
    fillRef.current = fill
    return () => {
      fillRef.current = null
    }
  })

  const submit = (event) => {
    event.preventDefault()
    save({ name, plate, route })
  }

  return (
    <form className="setup__form" onSubmit={submit} noValidate>
      <Field label={t('vehicle.name')} hint={t('vehicle.nameHint')} autoComplete="off" value={name} error={errors.name} onChange={(event) => setName(event.target.value)} />
      <Field
        label={t('vehicle.plate')}
        hint={t('vehicle.plateHint')}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        value={plate}
        error={errors.plate}
        onChange={(event) => setPlate(event.target.value.toUpperCase())}
      />
      <Field label={t('vehicle.route')} hint={t('vehicle.routeHint')} autoComplete="off" value={route} error={errors.route} onChange={(event) => setRoute(event.target.value)} />
      <StepNav nextLoading={busy} />
    </form>
  )
}
