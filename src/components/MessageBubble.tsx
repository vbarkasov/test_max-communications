import type { Message } from '../chat'
import { formatTime } from '../chat'
import { IconCheck, IconCheckDouble, IconClock, IconWarning } from './Icons'

type Props = {
  message: Message
  onRetry?: (message: Message) => void
}

function StatusIcon({ message }: { message: Message }) {
  switch (message.status) {
    case 'pending':
      return (
        <span className="bubble__status" title="Отправляется">
          <IconClock />
        </span>
      )
    case 'delivered':
      return (
        <span className="bubble__status" title="Доставлено">
          <IconCheck />
        </span>
      )
    case 'read':
      return (
        <span className="bubble__status" title="Прочитано">
          <IconCheckDouble />
        </span>
      )
    case 'failed':
      return (
        <span className="bubble__status bubble__error" title={message.error ?? 'Не отправлено'}>
          <IconWarning />
        </span>
      )
    default:
      return (
        <span className="bubble__status" title="Отправлено">
          <IconCheck />
        </span>
      )
  }
}

export function MessageBubble({ message, onRetry }: Props) {
  return (
    <div className={`bubble bubble--${message.direction === 'out' ? 'out' : 'in'}`}>
      <span className="bubble__text">{message.text}</span>
      <span className="bubble__meta">
        {message.status === 'failed' && onRetry && (
          <button
            className="bubble__retry"
            type="button"
            onClick={() => onRetry(message)}
            title="Повторить отправку"
          >
            Повторить
          </button>
        )}
        {message.direction === 'out' && <StatusIcon message={message} />}
        <span>{formatTime(message.timestamp)}</span>
      </span>
    </div>
  )
}
