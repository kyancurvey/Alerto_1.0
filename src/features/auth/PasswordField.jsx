import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { Field } from '../../components/ui'

// Password input with a show/hide button.
export default function PasswordField(props) {
  const { t } = useTranslation('auth')
  const [shown, setShown] = useState(false)
  const Icon = shown ? EyeOff : Eye
  return (
    <Field
      {...props}
      type={shown ? 'text' : 'password'}
      trailing={(
        <button type="button" className="field__trailing" onClick={() => setShown((value) => !value)} aria-label={t(shown ? 'password.hide' : 'password.show')} aria-pressed={shown}>
          <Icon size={22} aria-hidden="true" />
        </button>
      )}
    />
  )
}
