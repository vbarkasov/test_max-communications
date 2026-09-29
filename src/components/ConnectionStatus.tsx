import type { ConnectionState } from '../hooks/useNotifications'

const LABELS: Record<ConnectionState, string> = {
  connecting: 'Подключение…',
  online: 'GREEN-API на связи',
  error: 'Нет связи с GREEN-API',
}

type Props = {
  connection: ConnectionState
  title?: string
}

export function ConnectionStatus({ connection, title }: Props) {
  return (
    <span className={`status status--${connection}`} title={title}>
      <span className="status__dot" />
      {LABELS[connection]}
    </span>
  )
}
