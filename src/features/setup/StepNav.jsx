import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui'

// Back and Next for a step. Without onNext the Next button submits the form around it.
export default function StepNav({ onBack, onNext, nextLabel, nextLoading = false, nextDisabled = false, nextVariant = 'primary' }) {
  const { t } = useTranslation('setup')
  return (
    <div className="setup__nav">
      {onBack && <Button variant="outline" onClick={onBack}>{t('back')}</Button>}
      <Button
        className="setup__next"
        variant={nextVariant}
        type={onNext ? 'button' : 'submit'}
        onClick={onNext}
        loading={nextLoading}
        disabled={nextDisabled}
      >
        {nextLabel ?? t('next')}
      </Button>
    </div>
  )
}
