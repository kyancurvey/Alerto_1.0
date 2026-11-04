import { useTranslation } from 'react-i18next'
import { formatRelative } from '../../lib/time'
import useNow from '../../lib/useNow'

export default function RelativeTime({ value }) {
  const { t, i18n } = useTranslation()
  const now = useNow(1000)
  return <time dateTime={new Date(value).toISOString()}>{formatRelative(value, now, i18n.language, t('time.justNow'))}</time>
}
