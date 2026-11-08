import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, RelativeTime, Textarea, useToast } from '../../components/ui'
import { NOTE_MAX } from '../../store/actions'
import { useStore } from '../../store/StoreProvider'

// Who has seen this event and what they wrote. A family member can acknowledge it and add notes; others read.
export default function FollowUp({ event, me, canAcknowledge, canNote }) {
  const { t } = useTranslation('events')
  const { actions } = useStore()
  const toast = useToast()
  const [acking, setAcking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const mine = event.acks.some((ack) => ack.accountId === me)
  // Older acknowledgements carry their note inside; show it with the others.
  const notes = [
    ...event.notes,
    ...event.acks.filter((ack) => ack.note).map((ack) => ({ id: `ack-${ack.accountId}`, name: ack.name, at: ack.at, text: ack.note })),
  ].sort((a, b) => a.at - b.at)

  const acknowledge = async () => {
    setAcking(true)
    const result = await actions.acknowledgeEvent(event.id)
    setAcking(false)
    toast.show(result.ok ? t('follow.acknowledged') : t('follow.error'), result.ok ? 'success' : 'error')
  }

  const addNote = async (submit) => {
    submit.preventDefault()
    if (!text.trim()) {
      setError(t('follow.noteEmpty'))
      return
    }
    setError('')
    setSaving(true)
    const result = await actions.addEventNote(event.id, text)
    setSaving(false)
    if (result.ok) {
      setText('')
      toast.show(t('follow.noteAdded'), 'success')
    } else {
      setError(t(result.error === 'noteLong' ? 'follow.noteLong' : 'follow.error', { max: NOTE_MAX }))
    }
  }

  return (
    <section className="evcard card" aria-labelledby="follow-title">
      <h2 id="follow-title" className="evcard__title">{t('follow.title')}</h2>

      {event.acks.length === 0 ? (
        <p className="evcard__sub">{t('follow.nobody')}</p>
      ) : (
        <ul className="evacks">
          {event.acks.map((ack) => (
            <li key={ack.accountId} className="evacks__item">
              <CircleCheck size={20} aria-hidden="true" />
              <span>{t('follow.ackBy', { name: ack.name })} · <RelativeTime value={ack.at} /></span>
            </li>
          ))}
        </ul>
      )}

      {canAcknowledge && (
        <Button variant={mine ? 'secondary' : 'primary'} loading={acking} disabled={mine} onClick={acknowledge}>
          {mine ? t('follow.youAcknowledged') : t('follow.acknowledge')}
        </Button>
      )}

      <h3 className="evcard__subtitle">{t('follow.notes')}</h3>
      {notes.length === 0 ? (
        <p className="evcard__sub">{t('follow.noNotes')}</p>
      ) : (
        <ul className="evnotes">
          {notes.map((note) => (
            <li key={note.id} className="evnotes__item">
              <p className="evnotes__text">{note.text}</p>
              <p className="evnotes__meta">{note.name} · <RelativeTime value={note.at} /></p>
            </li>
          ))}
        </ul>
      )}

      {canNote && (
        <form className="evnotes__form" onSubmit={addNote} noValidate>
          <Textarea
            label={t('follow.addNote')}
            value={text}
            maxLength={NOTE_MAX}
            error={error}
            hint={t('follow.noteHint', { max: NOTE_MAX })}
            onChange={(change) => setText(change.target.value)}
          />
          <Button type="submit" variant="outline" loading={saving}>{t('follow.saveNote')}</Button>
        </form>
      )}
    </section>
  )
}
