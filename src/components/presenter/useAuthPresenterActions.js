import { useTranslation } from 'react-i18next'
import { useStore } from '../../store/StoreProvider'
import { dataSection } from './dataSection'
import { usePresenterActions } from './registry'

// Gear actions for screens before sign-in: a fill section from the screen (when it has fields to fill), plus Reset data.
export default function useAuthPresenterActions(fill) {
  const { t } = useTranslation('presenter')
  const { actions } = useStore()
  usePresenterActions([...(fill ? [{ id: 'fill', layout: 'list', ...fill }] : []), dataSection(t, actions)])
}
