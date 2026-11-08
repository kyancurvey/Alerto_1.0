import { useTranslation } from 'react-i18next'
import { Copy } from 'lucide-react'
import { Button, useToast } from '../../components/ui'

// Copies a link or a code to the clipboard and says so.
export default function CopyButton({ text, label, done }) {
  const { t } = useTranslation('people')
  const toast = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.show(done, 'success')
    } catch {
      toast.show(t('copyFailed'), 'error')
    }
  }
  return (
    <Button variant="secondary" onClick={copy}>
      <Copy size={22} aria-hidden="true" />{label}
    </Button>
  )
}
