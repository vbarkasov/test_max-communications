import { useEffect, useRef, useState, type FormEvent } from 'react'
import { checkAccount, normalizePhone, toErrorMessage } from '../api/greenApi'
import type { Credentials } from '../api/types'
import type { Chat } from '../chat'

type Props = {
  credentials: Credentials
  onClose: () => void
  onCreated: (chat: Chat) => void
}

export function NewChatDialog({ credentials, onClose, onCreated }: Props) {
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      const digits = normalizePhone(phone)
      const result = await checkAccount(credentials, digits)

      if (!result.exist || !result.chatId) {
        setError('Аккаунт MAX с таким номером не найден.')
        return
      }

      onCreated({
        chatId: result.chatId,
        phone: digits,
        title: digits,
        createdAt: Date.now(),
        messages: [],
      })
      onClose()
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog">
      <div className="dialog__backdrop" onClick={onClose} />
      <form className="dialog__card" onSubmit={handleSubmit} noValidate>
        <h3 className="dialog__title">Новый чат</h3>

        <label className="field">
          <span className="field__label">Номер телефона получателя</span>
          <input
            ref={inputRef}
            className="field__input"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="7 999 123-45-67"
            inputMode="tel"
            autoComplete="off"
          />
          <span className="hint">
            GREEN-API работает с номерами РФ и РБ в международном формате: 11 цифр (7…) или 12 цифр (375…).
          </span>
        </label>

        {error && <p className="error-text">{error}</p>}

        <div className="dialog__actions">
          <button className="button button--ghost" type="button" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? 'Проверяем…' : 'Создать чат'}
          </button>
        </div>
      </form>
    </div>
  )
}
