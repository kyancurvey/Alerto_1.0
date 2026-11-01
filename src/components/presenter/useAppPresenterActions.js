import { useTranslation } from 'react-i18next'
import { useToast } from '../ui'
import { scenarios } from '../../sim/scenarios'
import { useStore } from '../../store/StoreProvider'
import { usePresenterActions } from './registry'

// Gear actions for every screen inside the app shell (signed-in screens).
// Prompt 3 limits these by role and turns on Switch account.
export default function useAppPresenterActions() {
  const { t } = useTranslation('presenter')
  const toast = useToast()
  const { state, actions, getState } = useStore()

  // TEMP: confirms each triggered scenario until Home shows alerts (removed in Prompt 5)
  const start = (scenarioId) => {
    const name = t(`scenarios.${scenarioId}`)
    toast.show(t('toast.started', { name }), 'info')
    actions.runScenario(scenarioId).then(() => toast.show(t('toast.finished', { name, count: getState().events.length }), 'success'))
  }

  usePresenterActions([
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
    {
      id: 'account',
      title: t('account.title'),
      layout: 'segmented',
      items: ['driver', 'family', 'admin'].map((role) => ({ id: role, label: t(`account.${role}`), disabled: true })),
    },
    {
      id: 'data',
      title: t('data.title'),
      layout: 'list',
      items: [{ id: 'reset', label: t('data.reset'), confirm: t('data.resetConfirm'), danger: true, closeOnSelect: true, onSelect: () => actions.resetData() }],
    },
  ])
}
