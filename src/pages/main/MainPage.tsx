import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../shared/api/http'
import { getCurrentUser } from '../../features/auth/lib/session'
import { clearTokens } from '../../features/auth/lib/tokenStorage'

type MainView = 'tasks' | 'history' | 'settings'
type TimerMode = 'running' | 'paused' | 'stopped'
type PersistedTimerState = {
  timerSeconds: number
  isTimerRunning: boolean
  selectedTaskLabel: string
  timerMode?: TimerMode
}

const TASK_OPTIONS = [
  '\u041D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043E',
  '\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C weekly \u043E\u0442\u0447\u0435\u0442',
  '\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C UI \u0434\u0430\u0448\u0431\u043E\u0440\u0434\u0430',
  '\u0420\u0435\u0432\u044C\u044E pull request',
]
const TIMER_STATE_KEY = 'time-tracker-timer-state-v1'

function formatTimer(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function MainPage() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<MainView>('tasks')
  const [isUserMenuOpen, setUserMenuOpen] = useState(false)
  const [isTaskMenuOpen, setTaskMenuOpen] = useState(false)
  const [username, setUsername] = useState('...')
  const [selectedTaskLabel, setSelectedTaskLabel] = useState(() => {
    const raw = localStorage.getItem(TIMER_STATE_KEY)
    if (!raw) {
      return TASK_OPTIONS[0]
    }
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedTimerState>
      return typeof parsed.selectedTaskLabel === 'string' ? parsed.selectedTaskLabel : TASK_OPTIONS[0]
    } catch {
      return TASK_OPTIONS[0]
    }
  })
  const [timerSeconds, setTimerSeconds] = useState(() => {
    const raw = localStorage.getItem(TIMER_STATE_KEY)
    if (!raw) {
      return 5483
    }
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedTimerState>
      return typeof parsed.timerSeconds === 'number' ? parsed.timerSeconds : 5483
    } catch {
      return 5483
    }
  })
  const [isTimerRunning, setTimerRunning] = useState(() => {
    const raw = localStorage.getItem(TIMER_STATE_KEY)
    if (!raw) {
      return false
    }
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedTimerState>
      return Boolean(parsed.isTimerRunning)
    } catch {
      return false
    }
  })
  const [timerMode, setTimerMode] = useState<TimerMode>(() => {
    const raw = localStorage.getItem(TIMER_STATE_KEY)
    if (!raw) {
      return 'paused'
    }
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedTimerState>
      if (parsed.timerMode === 'running' || parsed.timerMode === 'paused' || parsed.timerMode === 'stopped') {
        return parsed.timerMode
      }
      return parsed.isTimerRunning ? 'running' : 'paused'
    } catch {
      return 'paused'
    }
  })

  useEffect(() => {
    if (!isTimerRunning) {
      return
    }

    const intervalId = window.setInterval(() => {
      setTimerSeconds((prev) => prev + 1)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isTimerRunning])

  useEffect(() => {
    const state: PersistedTimerState = {
      timerSeconds,
      isTimerRunning,
      selectedTaskLabel,
      timerMode,
    }
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state))
  }, [timerSeconds, isTimerRunning, selectedTaskLabel, timerMode])

  useEffect(() => {
    let isMounted = true

    const loadUser = async () => {
      try {
        const user = await getCurrentUser()
        if (isMounted) {
          setUsername(user.username)
        }
      } catch (error) {
        clearTokens()
        if (error instanceof ApiError && error.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        if (isMounted) {
          setUsername('Unknown user')
        }
      }
    }

    loadUser()

    return () => {
      isMounted = false
    }
  }, [navigate])

  const handleLogout = () => {
    clearTokens()
    setUserMenuOpen(false)
    navigate('/login', { replace: true })
  }

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">Time Tracker</div>

        <nav className="dashboard-nav">
          <button
            type="button"
            className={activeView === 'tasks' ? 'active' : ''}
            onClick={() => setActiveView('tasks')}
          >
            {'\u0417\u0430\u0434\u0430\u0447\u0438'}
          </button>
          <button
            type="button"
            className={activeView === 'history' ? 'active' : ''}
            onClick={() => setActiveView('history')}
          >
            {'\u0418\u0441\u0442\u043E\u0440\u0438\u044F'}
          </button>
          <button
            type="button"
            className={activeView === 'settings' ? 'active' : ''}
            onClick={() => setActiveView('settings')}
          >
            {'\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438'}
          </button>
        </nav>

        <div className="dashboard-user-wrap">
          <button
            type="button"
            className="dashboard-user-trigger"
            onClick={() => setUserMenuOpen((prev) => !prev)}
          >
            {username}
          </button>
          {isUserMenuOpen ? (
            <div className="dashboard-user-menu">
              <button type="button" onClick={handleLogout}>
                {'\u0412\u044B\u0439\u0442\u0438 \u0438\u0437 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430'}
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div className="timer-box timer-box-header timer-accent">
            <div className="timer-value">{formatTimer(timerSeconds)}</div>
            <div className="timer-controls">
              <button
                type="button"
                className={timerMode === 'running' ? 'active' : ''}
                onClick={() => {
                  setTimerRunning(true)
                  setTimerMode('running')
                }}
              >
                {'\u0421\u0442\u0430\u0440\u0442'}
              </button>
              <button
                type="button"
                className={timerMode === 'paused' ? 'active' : ''}
                onClick={() => {
                  setTimerRunning(false)
                  setTimerMode('paused')
                }}
              >
                {'\u041F\u0430\u0443\u0437\u0430'}
              </button>
              <button
                type="button"
                className={timerMode === 'stopped' ? 'active' : ''}
                onClick={() => {
                  setTimerRunning(false)
                  setTimerSeconds(0)
                  setTimerMode('stopped')
                }}
              >
                {'\u0421\u0442\u043E\u043F'}
              </button>
            </div>

            <div className="timer-task-picker">
              <span className="timer-task-caption">
                {'\u041F\u0440\u0438\u0432\u044F\u0437\u043A\u0430 \u043A \u0437\u0430\u0434\u0430\u0447\u0435'}
              </span>
              <button
                type="button"
                className="timer-task-link"
                onClick={() => setTaskMenuOpen((prev) => !prev)}
              >
                {selectedTaskLabel === TASK_OPTIONS[0]
                  ? selectedTaskLabel
                  : `\u0417\u0430\u0434\u0430\u0447\u0430: ${selectedTaskLabel}`}
              </button>
              {isTaskMenuOpen ? (
                <div className="timer-task-menu">
                  {TASK_OPTIONS.map((task) => (
                    <button
                      type="button"
                      key={task}
                      onClick={() => {
                        setSelectedTaskLabel(task)
                        setTaskMenuOpen(false)
                      }}
                    >
                      {task}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {activeView === 'tasks' ? (
          <>
            <div className="dashboard-toolbar">
              <input type="text" placeholder={'\u041F\u043E\u0438\u0441\u043A \u0437\u0430\u0434\u0430\u0447\u0438'} />
              <select defaultValue="all">
                <option value="all">{'\u0412\u0441\u0435'}</option>
                <option value="in-progress">{'\u0412 \u0440\u0430\u0431\u043E\u0442\u0435'}</option>
                <option value="done">{'\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E'}</option>
              </select>
              <select defaultValue="today">
                <option value="today">{'\u0421\u0435\u0433\u043E\u0434\u043D\u044F'}</option>
                <option value="week">{'\u041D\u0435\u0434\u0435\u043B\u044F'}</option>
                <option value="month">{'\u041C\u0435\u0441\u044F\u0446'}</option>
              </select>
            </div>

            <div className="dashboard-grid">
              <section className="panel panel-tasks">
                <div className="panel-head">
                  <h2>{'\u0421\u043F\u0438\u0441\u043E\u043A \u0437\u0430\u0434\u0430\u0447'}</h2>
                  <span>{'6 \u0437\u0430\u0434\u0430\u0447'}</span>
                </div>

                <div className="task-list">
                  <article className="task-row">
                    <div>
                      <strong>{'\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C weekly \u043E\u0442\u0447\u0435\u0442'}</strong>
                      <p>{'\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C \u0438 \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u043A\u043E\u043C\u0430\u043D\u0434\u044B'}</p>
                    </div>
                    <span className="status in-progress">{'\u0412 \u0440\u0430\u0431\u043E\u0442\u0435'}</span>
                  </article>

                  <article className="task-row">
                    <div>
                      <strong>{'\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C UI \u0434\u0430\u0448\u0431\u043E\u0440\u0434\u0430'}</strong>
                      <p>{'\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0435\u0442\u043A\u0443 \u0438 \u0442\u0438\u043F\u043E\u0433\u0440\u0430\u0444\u0438\u043A\u0443'}</p>
                    </div>
                    <span className="status done">{'\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E'}</span>
                  </article>

                  <article className="task-row">
                    <div>
                      <strong>{'\u0420\u0435\u0432\u044C\u044E pull request'}</strong>
                      <p>{'\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u044E \u0442\u0440\u0435\u043A\u0438\u043D\u0433\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u0438'}</p>
                    </div>
                    <span className="status queued">{'\u0412 \u043E\u0447\u0435\u0440\u0435\u0434\u0438'}</span>
                  </article>
                </div>
              </section>
            </div>
          </>
        ) : null}

        {activeView === 'history' ? (
          <section className="panel page-panel">
            <div className="panel-head">
              <h2>{'\u0418\u0441\u0442\u043E\u0440\u0438\u044F'}</h2>
            </div>
            <div className="history-list">
              <div className="history-row">
                <span>10:02</span>
                <p>{'\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430 \u0437\u0430\u0434\u0430\u0447\u0430 \u00AB\u0420\u0435\u0432\u044C\u044E pull request\u00BB'}</p>
              </div>
              <div className="history-row">
                <span>11:27</span>
                <p>{'\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D \u0441\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u0434\u0430\u0447\u0438 \u00ABUI \u0434\u0430\u0448\u0431\u043E\u0440\u0434\u0430\u00BB'}</p>
              </div>
              <div className="history-row">
                <span>12:05</span>
                <p>{'\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u0442\u0430\u0439\u043C\u0435\u0440 \u00ABweekly \u043E\u0442\u0447\u0435\u0442\u00BB'}</p>
              </div>
            </div>
          </section>
        ) : null}

        {activeView === 'settings' ? (
          <section className="panel page-panel">
            <div className="panel-head">
              <h2>{'\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438'}</h2>
            </div>
            <div className="settings-list">
              <label className="settings-row">
                <span>{'\u0424\u043E\u0440\u043C\u0430\u0442 \u0432\u0440\u0435\u043C\u0435\u043D\u0438'}</span>
                <select defaultValue="24h">
                  <option value="24h">24h</option>
                  <option value="12h">12h</option>
                </select>
              </label>
              <label className="settings-row">
                <span>{'\u0421\u0442\u0430\u0440\u0442 \u043D\u0435\u0434\u0435\u043B\u0438'}</span>
                <select defaultValue="monday">
                  <option value="monday">{'\u041F\u043E\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u0438\u043A'}</option>
                  <option value="sunday">{'\u0412\u043E\u0441\u043A\u0440\u0435\u0441\u0435\u043D\u044C\u0435'}</option>
                </select>
              </label>
              <label className="settings-check">
                <input type="checkbox" defaultChecked />
                <span>{'\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u044F\u0442\u044C \u043E \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u0438 \u0441\u0435\u0441\u0441\u0438\u0438'}</span>
              </label>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}
