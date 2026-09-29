import { useState, type FormEvent } from 'react'
import { getStateInstance, normalizeApiUrl, setHttpApiSettings, toErrorMessage } from '../api/greenApi'
import type { Credentials, InstanceState } from '../api/types'

type Props = {
  onConnect: (credentials: Credentials) => void
}

function describeState(state: InstanceState): string | null {
  switch (state) {
    case 'authorized':
      return null
    case 'notAuthorized':
      return 'Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API и попробуйте снова.'
    case 'starting':
      return 'Инстанс запускается. Повторите подключение через минуту.'
    default:
      return `Инстанс в статусе «${state}».`
  }
}

export function LoginForm({ onConnect }: Props) {
  const [apiUrl, setApiUrl] = useState('https://api.green-api.com')
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [autoSettings, setAutoSettings] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const credentials: Credentials = {
      apiUrl: normalizeApiUrl(apiUrl),
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    }

    if (!credentials.idInstance || !credentials.apiTokenInstance) {
      setError('Заполните idInstance и apiTokenInstance из личного кабинета GREEN-API.')
      return
    }

    setBusy(true)
    try {
      const { stateInstance } = await getStateInstance(credentials)
      const problem = describeState(stateInstance)
      if (problem) {
        setError(problem)
        return
      }

      if (autoSettings) {
        await setHttpApiSettings(credentials)
      }

      onConnect(credentials)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <div className="login__logo" aria-hidden="true">
            M
          </div>
          <div>
            <h1 className="login__title">Чат с MAX</h1>
            <p className="login__subtitle">Обмен текстовыми сообщениями через GREEN-API</p>
          </div>
        </div>

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field__label">Адрес API (apiUrl)</span>
            <input
              className="field__input"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder="https://api.green-api.com"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="hint">
              Скопируйте поле <code>apiUrl</code> из личного кабинета GREEN-API. Префикс <code>/v3</code> можно
              оставить — он будет убран автоматически.
            </span>
          </label>

          <label className="field">
            <span className="field__label">idInstance</span>
            <input
              className="field__input"
              value={idInstance}
              onChange={(event) => setIdInstance(event.target.value)}
              placeholder="110100001"
              inputMode="numeric"
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span className="field__label">apiTokenInstance</span>
            <input
              className="field__input"
              type="password"
              value={apiTokenInstance}
              onChange={(event) => setApiTokenInstance(event.target.value)}
              placeholder="d75b3a66374942c5b3c019c698abc206"
              autoComplete="off"
            />
          </label>

          <label className="login__checkbox">
            <input
              type="checkbox"
              checked={autoSettings}
              onChange={(event) => setAutoSettings(event.target.checked)}
            />
            <span>
              Настроить приём уведомлений через HTTP API (очистить <code>webhookUrl</code>, включить входящие и исходящие)
            </span>
          </label>

          {error && <p className="error-text">{error}</p>}

          <button className="button button--primary button--block" type="submit" disabled={busy}>
            {busy ? 'Подключение…' : 'Подключиться'}
          </button>

          <div className="login__divider">Данные хранятся только в этом браузере</div>

          <p className="hint">
            Учётные данные доступны в{' '}
            <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
              личном кабинете GREEN-API
            </a>
            . Инстанс должен быть авторизован и создан на тарифе с поддержкой MAX.
          </p>
        </form>
      </div>
    </div>
  )
}
