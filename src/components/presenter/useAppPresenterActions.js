import { useTranslation } from 'react-i18next'
import { useToast } from '../ui'
import { can } from '../../lib/permissions'
import { fills } from '../../sim/fills'
import { scenarios } from '../../sim/scenarios'
import { useStore } from '../../store/StoreProvider'
import useSession from '../../store/useSession'
import { dataSection } from './dataSection'
import { usePresenterActions } from './registry'

// Gear actions for signed-in screens, limited by role: Driver and Family member get scenarios and timing
// (when they can see a vehicle); the Admin gets Switch account and Reset data only.
// A screen can pass its own sections (for example the setup wizard's fill action); they come first.
export default function useAppPresenterActions(extraSections = []) {
  const { t } = useTranslation('presenter')
  const toast = useToast()
  const { state, actions, getState } = useStore()
  const { role, hasVehicle } = useSession()

  // TEMP: confirms each triggered scenario until Home shows alerts (removed in Prompt 5)
  const start = (scenarioId) => {
    const name = t(`scenarios.${scenarioId}`)
    toast.show(t('toast.started', { name }), 'info')
    actions.runScenario(scenarioId).then(() => toast.show(t('toast.finished', { name, count: getState().events.length }), 'success'))
  }

  const switchTo = (target) => {
    const account = state.accounts.find((item) => item.email === fills[target].email)
    if (account) actions.switchAccount(account.id)
  }

  const sections = [...extraSections]
  if (can(role, 'runScenarios') && hasVehicle) {
    sections.push(
      {
        id: 'scenarios',
        title: t('scenarios.title'),
        layout: 'list',
        items: scenarios.map(({ id }) => ({ id, label: t(`scenarios.${id}`), closeOnSelect: true, onSelect: () => start(id) })),
      },
      {
        id: 'timing',
        title: t('timing.title'),
        layout: 'segmented',
        items: ['quick', 'realistic'].map((mode) => ({ id: mode, label: t(`timing.${mode}`), active: state.timing === mode, onSelect: () => actions.setTiming(mode) })),
      },
    )
  }
  sections.push(
    {
      id: 'account',
      title: t('account.title'),
      layout: 'segmented',
      items: ['driver', 'family', 'admin'].map((target) => ({ id: target, label: t(`account.${target}`), active: role === target, closeOnSelect: true, onSelect: () => switchTo(target) })),
    },
    dataSection(t, actions),
  )

  usePresenterActions(sections)
}
