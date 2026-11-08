import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, Users } from 'lucide-react'
import { Avatar, Badge, Button, Card, EmptyState, Sheet, Toggle, useToast } from '../../components/ui'
import { inviteLink } from '../../lib/links'
import { useStore } from '../../store/StoreProvider'
import { selectFamilyLinks } from '../../store/selectors'
import CopyButton from './CopyButton'
import InviteSheet from './InviteSheet'
import { relationText } from './relation'

const SHARES = ['alerts', 'map', 'status']

function Member({ link, onRemove }) {
  const { t } = useTranslation(['people', 'setup'])
  const { actions } = useStore()
  const joined = link.status === 'accepted'

  return (
    <li className="pmember">
      <div className="pmember__head">
        <Avatar name={link.name} />
        <div className="pmember__who">
          <span className="pmember__name">{link.name}</span>
          <span className="pmember__detail">{relationText(t, link.relation)}{link.email ? ` · ${link.email}` : ''}</span>
        </div>
        <Badge variant={joined ? 'ready' : 'updating'}>{t(joined ? 'family.joined' : 'family.invited')}</Badge>
      </div>

      {!joined && (
        <div className="pmember__invite">
          <p className="pmember__detail">{t('family.codeLine', { code: link.code })}</p>
          <div className="pform__buttons">
            <CopyButton text={inviteLink(link.code)} label={t('invite.copyLink')} done={t('invite.copiedLink')} />
            <CopyButton text={link.code} label={t('invite.copyCode')} done={t('invite.copiedCode')} />
          </div>
        </div>
      )}

      <fieldset className="pform__fieldset">
        <legend className="pform__legend">{t('family.sees', { name: link.name })}</legend>
        {SHARES.map((key) => (
          <Toggle key={key} label={t(`share.${key}`)} hint={t(`share.${key}Hint`)} checked={Boolean(link.share[key])} onChange={(value) => actions.setFamilyShare(link.id, key, value)} />
        ))}
      </fieldset>

      <Button variant="outline" className="pmember__remove" onClick={() => onRemove(link)}>{t(joined ? 'family.remove' : 'family.cancel', { name: link.name })}</Button>
    </li>
  )
}

// The driver's family members: who joined, who was invited, what each can see, and ending access.
export default function FamilySection({ driverId }) {
  const { t } = useTranslation('people')
  const toast = useToast()
  const { state, actions } = useStore()
  const links = selectFamilyLinks(state, driverId)
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    setBusy(true)
    setError('')
    const result = await actions.removeFamilyAccess(removing.id)
    setBusy(false)
    if (!result.ok) return setError(t('family.removeFailed'))
    toast.show(t(removing.status === 'accepted' ? 'family.removedToast' : 'family.cancelledToast', { name: removing.name }), 'success')
    return setRemoving(null)
  }

  return (
    <Card as="section" className="psection" aria-labelledby="family-title">
      <h2 id="family-title" className="psection__title">{t('family.title')}</h2>
      <p className="psection__intro">{t('family.intro')}</p>

      {links.length === 0 ? (
        <EmptyState icon={Users} title={t('family.emptyTitle')} description={t('family.emptyDetail')} />
      ) : (
        <ul className="pmembers">
          {links.map((link) => <Member key={link.id} link={link} onRemove={(item) => { setError(''); setRemoving(item) }} />)}
        </ul>
      )}

      <Button variant="secondary" onClick={() => setInviting(true)}>
        <UserPlus size={22} aria-hidden="true" />{t('family.invite')}
      </Button>

      <InviteSheet open={inviting} onClose={() => setInviting(false)} />
      <Sheet open={Boolean(removing)} onClose={() => setRemoving(null)} title={removing?.status === 'accepted' ? t('family.removeTitle') : t('family.cancelTitle')}>
        {removing && (
          <div className="pform">
            <p>{t(removing.status === 'accepted' ? 'family.removeText' : 'family.cancelText', { name: removing.name })}</p>
            {error && <p className="field__error" role="alert">{error}</p>}
            <Button variant="danger" block loading={busy} onClick={confirm}>{t(removing.status === 'accepted' ? 'family.removeConfirm' : 'family.cancelConfirm', { name: removing.name })}</Button>
            <Button variant="outline" block onClick={() => setRemoving(null)}>{t('family.keep')}</Button>
          </div>
        )}
      </Sheet>
    </Card>
  )
}
