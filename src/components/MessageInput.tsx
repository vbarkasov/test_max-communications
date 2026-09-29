import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { MAX_MESSAGE_LENGTH } from '../api/greenApi'
import { IconSend } from './Icons'

type Props = {
  disabled: boolean
  onSend: (text: string) => void
}

const WARNING_THRESHOLD = MAX_MESSAGE_LENGTH - 200

export function MessageInput({ disabled, onSend }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const node = textareaRef.current
    if (!node) return

    node.style.height = 'auto'
    node.style.height = `${node.scrollHeight}px`
  }, [value])

  function submit() {
    const text = value.trim()
    if (!text || text.length > MAX_MESSAGE_LENGTH || disabled) return

    onSend(text)
    setValue('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return

    event.preventDefault()
    submit()
  }

  const tooLong = value.length > MAX_MESSAGE_LENGTH
  const canSend = value.trim().length > 0 && !tooLong && !disabled

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className="composer__row">
        <div className="composer__field">
          <textarea
            ref={textareaRef}
            className="composer__input"
            value={value}
            rows={1}
            disabled={disabled}
            placeholder={disabled ? 'Сначала подключите GREEN-API' : 'Напишите сообщение'}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <button className="composer__send" type="submit" disabled={!canSend} aria-label="Отправить сообщение">
          <IconSend />
        </button>
      </div>

      {(tooLong || value.length > WARNING_THRESHOLD) && (
        <p className="composer__hint">
          {value.length} / {MAX_MESSAGE_LENGTH}
        </p>
      )}
    </form>
  )
}
