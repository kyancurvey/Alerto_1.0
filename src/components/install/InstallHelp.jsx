import { useTranslation } from 'react-i18next'
import { CircleCheck, Download, Share, SquarePlus } from 'lucide-react'
import { Button } from '../ui'
import useInstallPrompt, { isIos } from './useInstallPrompt'
import './install.css'

// Install help: an install button where the browser supports it, and the Add to Home Screen guide for iPhone.
export default function InstallHelp() {
  const { t } = useTranslation('setup')
  const { canInstall, installed, install } = useInstallPrompt()

  if (installed) {
    return (
      <p className="install__done">
        <CircleCheck size={24} aria-hidden="true" />
        <span>{t('installHelp.installed')}</span>
      </p>
    )
  }

  return (
    <div className="install">
      {canInstall && (
        <Button block onClick={install}>
          <Download size={22} aria-hidden="true" />
          {t('installHelp.button')}
        </Button>
      )}
      <section className="install__guide" aria-labelledby="install-iphone">
        <h3 id="install-iphone" className="install__title">{t('installHelp.iphoneTitle')}</h3>
        <ol className="install__steps">
          <li><span className="install__num" aria-hidden="true">1</span><span className="install__text">{t('installHelp.iphone1')}</span></li>
          <li><span className="install__num" aria-hidden="true">2</span><span className="install__text">{t('installHelp.iphone2')}</span><Share size={24} aria-hidden="true" /></li>
          <li><span className="install__num" aria-hidden="true">3</span><span className="install__text">{t('installHelp.iphone3')}</span><SquarePlus size={24} aria-hidden="true" /></li>
        </ol>
      </section>
      {!canInstall && !isIos() && (
        <section className="install__guide" aria-labelledby="install-other">
          <h3 id="install-other" className="install__title">{t('installHelp.otherTitle')}</h3>
          <p>{t('installHelp.otherText')}</p>
        </section>
      )}
    </div>
  )
}
