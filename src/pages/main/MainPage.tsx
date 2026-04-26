import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../shared/api/http'
import { getCurrentUser } from '../../features/auth/lib/session'
import { clearTokens } from '../../features/auth/lib/tokenStorage'
import { createTask, deleteTask, listTasks, updateTask } from '../../features/tasks/api/tasksApi'
import type { Task, TaskStatus } from '../../features/tasks/model/types'
import { getActiveTimer, startTimer, stopTimer } from '../../features/timers/api/timersApi'
import { listTimeEntries } from '../../features/time-entries/api/timeEntriesApi'
import type { TimeEntry } from '../../features/time-entries/model/types'

type MainView = 'tasks' | 'history' | 'settings'
type TimerMode = 'running' | 'paused' | 'stopped'
type TaskFilter = 'all' | TaskStatus
type SortOption = 'created_desc' | 'created_asc' | 'updated_desc' | 'title_asc' | 'status_asc'
type PersistedTimerState = {
  timerSeconds: number
  isTimerRunning: boolean
  selectedTaskId: string | null
  timerMode?: TimerMode
  runningStartedAtIso?: string | null
  runningTaskId?: string | null
}

const EMPTY_TASK_OPTION = 'Не выбрано'
const TIMER_STATE_KEY = 'time-tracker-timer-state-v1'

function formatTimer(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleString('ru-RU')
}

function readPersistedTimerState(): Partial<PersistedTimerState> | null {
  const raw = localStorage.getItem(TIMER_STATE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedTimerState>
    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function MainPage() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<MainView>('tasks')
  const [isUserMenuOpen, setUserMenuOpen] = useState(false)
  const [isTaskMenuOpen, setTaskMenuOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('created_desc')
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksCount, setTasksCount] = useState(0)
  const [isTasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [reloadIndex, setReloadIndex] = useState(0)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('active')
  const [isCreatingTask, setCreatingTask] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [username, setUsername] = useState('...')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => {
    const parsed = readPersistedTimerState()
    return parsed && typeof parsed.selectedTaskId === 'string' ? parsed.selectedTaskId : null
  })
  const [timerSeconds, setTimerSeconds] = useState(() => {
    const parsed = readPersistedTimerState()
    if (!parsed) {
      return 0
    }
    return typeof parsed.timerSeconds === 'number' && Number.isFinite(parsed.timerSeconds) && parsed.timerSeconds >= 0
      ? Math.floor(parsed.timerSeconds)
      : 0
  })
  const [isTimerRunning, setTimerRunning] = useState(() => {
    const parsed = readPersistedTimerState()
    return Boolean(parsed?.isTimerRunning)
  })
  const [timerMode, setTimerMode] = useState<TimerMode>(() => {
    const parsed = readPersistedTimerState()
    if (!parsed) {
      return 'paused'
    }
    if (parsed.timerMode === 'running' || parsed.timerMode === 'paused' || parsed.timerMode === 'stopped') {
      return parsed.timerMode
    }
    return parsed.isTimerRunning ? 'running' : 'paused'
  })
  const [runningStartedAtIso, setRunningStartedAtIso] = useState<string | null>(() => {
    const parsed = readPersistedTimerState()
    return parsed && typeof parsed.runningStartedAtIso === 'string' ? parsed.runningStartedAtIso : null
  })
  const [runningTaskId, setRunningTaskId] = useState<string | null>(() => {
    const parsed = readPersistedTimerState()
    return parsed && typeof parsed.runningTaskId === 'string' ? parsed.runningTaskId : null
  })
  const [isSavingTimeEntry, setSavingTimeEntry] = useState(false)
  const [timerSaveError, setTimerSaveError] = useState<string | null>(null)
  const [historyFromDate, setHistoryFromDate] = useState('')
  const [historyToDate, setHistoryToDate] = useState(() => toDateInputValue(new Date()))
  const [expandedHistoryTaskId, setExpandedHistoryTaskId] = useState<string | null>(null)
  const [historyEntries, setHistoryEntries] = useState<TimeEntry[]>([])
  const [isHistoryEntriesLoading, setHistoryEntriesLoading] = useState(false)
  const [historyEntriesError, setHistoryEntriesError] = useState<string | null>(null)
  const [historyFilterVersion, setHistoryFilterVersion] = useState(0)

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
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim())
    }, 350)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    if (!selectedTaskId) {
      return
    }

    if (!tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null)
    }
  }, [tasks, selectedTaskId])

  useEffect(() => {
    const state: PersistedTimerState = {
      timerSeconds,
      isTimerRunning,
      selectedTaskId,
      timerMode,
      runningStartedAtIso,
      runningTaskId,
    }
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state))
  }, [timerSeconds, isTimerRunning, selectedTaskId, timerMode, runningStartedAtIso, runningTaskId])

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

  useEffect(() => {
    let isMounted = true

    const loadTasks = async () => {
      setTasksLoading(true)
      setTasksError(null)

      const sortMap: Record<SortOption, { sort_by: 'created_at' | 'updated_at' | 'title' | 'status'; order: 'asc' | 'desc' }> =
        {
          created_desc: { sort_by: 'created_at', order: 'desc' },
          created_asc: { sort_by: 'created_at', order: 'asc' },
          updated_desc: { sort_by: 'updated_at', order: 'desc' },
          title_asc: { sort_by: 'title', order: 'asc' },
          status_asc: { sort_by: 'status', order: 'asc' },
        }

      try {
        const response = await listTasks({
          ...sortMap[sortOption],
          search: searchTerm || undefined,
          limit: 200,
          offset: 0,
        })
        if (!isMounted) {
          return
        }
        setTasks(response.tasks)
        setTasksCount(response.count)
      } catch (error) {
        if (!isMounted) {
          return
        }
        if (error instanceof ApiError && error.status === 401) {
          clearTokens()
          navigate('/login', { replace: true })
          return
        }
        setTasksError(error instanceof ApiError ? error.message : 'Не удалось загрузить задачи')
      } finally {
        if (isMounted) {
          setTasksLoading(false)
        }
      }
    }

    loadTasks()

    return () => {
      isMounted = false
    }
  }, [navigate, reloadIndex, searchTerm, sortOption])

  useEffect(() => {
    let isMounted = true

    const syncActiveTimer = async () => {
      try {
        const timer = await getActiveTimer()
        if (!isMounted) {
          return
        }

        const startedAtMs = Date.parse(timer.started_at)
        const elapsedSec = Number.isFinite(startedAtMs) ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)) : 0

        setSelectedTaskId(timer.task_id)
        setRunningTaskId(timer.task_id)
        setRunningStartedAtIso(timer.started_at)
        setTimerSeconds(elapsedSec)
        setTimerRunning(true)
        setTimerMode('running')
      } catch (error) {
        if (!isMounted) {
          return
        }
        if (error instanceof ApiError && error.status === 401) {
          clearTokens()
          navigate('/login', { replace: true })
          return
        }
        if (error instanceof ApiError && error.status === 404) {
          setTimerRunning(false)
          setTimerMode('paused')
          setRunningStartedAtIso(null)
          setRunningTaskId(null)
          return
        }
      }
    }

    void syncActiveTimer()

    return () => {
      isMounted = false
    }
  }, [navigate])

  const handleLogout = () => {
    clearTokens()
    setUserMenuOpen(false)
    navigate('/login', { replace: true })
  }

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = newTaskTitle.trim()
    if (!title) {
      return
    }

    setCreatingTask(true)
    setTasksError(null)

    try {
      await createTask({
        title,
        description: newTaskDescription.trim(),
        status: newTaskStatus,
      })
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskStatus('active')
      setReloadIndex((prev) => prev + 1)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearTokens()
        navigate('/login', { replace: true })
        return
      }
      setTasksError(error instanceof ApiError ? error.message : 'Не удалось создать задачу')
    } finally {
      setCreatingTask(false)
    }
  }

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    if (task.status === status) {
      return
    }

    setUpdatingTaskId(task.id)
    setTasksError(null)

    try {
      const updatedTask = await updateTask(task.id, {
        title: task.title,
        description: task.description,
        status,
      })
      setTasks((prev) => prev.map((item) => (item.id === task.id ? updatedTask : item)))
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearTokens()
        navigate('/login', { replace: true })
        return
      }
      setTasksError(error instanceof ApiError ? error.message : 'Не удалось обновить задачу')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTaskId(taskId)
    setTasksError(null)

    try {
      await deleteTask(taskId)
      setTasks((prev) => prev.filter((task) => task.id !== taskId))
      setTasksCount((prev) => Math.max(0, prev - 1))
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null)
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearTokens()
        navigate('/login', { replace: true })
        return
      }
      setTasksError(error instanceof ApiError ? error.message : 'Не удалось удалить задачу')
    } finally {
      setDeletingTaskId(null)
    }
  }

  const handleStartTimer = async () => {
    if (isSavingTimeEntry) {
      return
    }
    if (isTimerRunning) {
      return
    }
    if (!selectedTaskId) {
      setTimerSaveError('Выберите задачу перед запуском таймера')
      return
    }

    setTimerSaveError(null)
    setSavingTimeEntry(true)

    try {
      const timer = await startTimer({ task_id: selectedTaskId })
      setTaskMenuOpen(false)
      setSelectedTaskId(timer.task_id)
      setRunningTaskId(timer.task_id)
      setRunningStartedAtIso(timer.started_at)
      setTimerRunning(true)
      setTimerMode('running')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearTokens()
        navigate('/login', { replace: true })
        return
      }
      setTimerSaveError(error instanceof ApiError ? error.message : 'Failed to start timer.')
    } finally {
      setSavingTimeEntry(false)
    }
  }

  const handlePauseTimer = async () => {
    if (isSavingTimeEntry) {
      return
    }

    setTimerSaveError(null)
    if (!isTimerRunning) {
      setTimerMode('paused')
      return
    }

    setSavingTimeEntry(true)
    try {
      await stopTimer(runningTaskId ? { task_id: runningTaskId } : undefined)
      setReloadIndex((prev) => prev + 1)
      setTimerRunning(false)
      setTimerMode('paused')
      setRunningStartedAtIso(null)
      setRunningTaskId(null)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearTokens()
        navigate('/login', { replace: true })
        return
      }
      if (error instanceof ApiError && error.status === 404) {
        setTimerRunning(false)
        setTimerMode('paused')
        setRunningStartedAtIso(null)
        setRunningTaskId(null)
        return
      }
      setTimerSaveError(error instanceof ApiError ? error.message : 'Failed to stop timer.')
    } finally {
      setSavingTimeEntry(false)
    }
  }

  const handleStopTimer = async () => {
    if (isSavingTimeEntry) {
      return
    }

    setTimerSaveError(null)
    if (isTimerRunning) {
      setSavingTimeEntry(true)
      try {
        await stopTimer(runningTaskId ? { task_id: runningTaskId } : undefined)
        setReloadIndex((prev) => prev + 1)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearTokens()
          navigate('/login', { replace: true })
          return
        }
        if (!(error instanceof ApiError && error.status === 404)) {
          setTimerSaveError(error instanceof ApiError ? error.message : 'Failed to stop timer.')
          return
        }
      } finally {
        setSavingTimeEntry(false)
      }
    }

    setTimerRunning(false)
    setTimerSeconds(0)
    setTimerMode('stopped')
    setRunningStartedAtIso(null)
    setRunningTaskId(null)
  }

  const handleApplyHistoryFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHistoryEntriesError(null)

    if (historyFromDate && historyToDate && historyFromDate > historyToDate) {
      setHistoryEntriesError('Дата "С" не может быть позже даты "По"')
      return
    }

    setHistoryFilterVersion((prev) => prev + 1)
  }

  useEffect(() => {
    if (activeView !== 'history' || !expandedHistoryTaskId) {
      return
    }

    let isMounted = true
    setHistoryEntriesLoading(true)
    setHistoryEntriesError(null)

    const fromIso = historyFromDate ? `${historyFromDate}T00:00:00.000Z` : undefined
    const toIso = historyToDate ? `${historyToDate}T23:59:59.999Z` : undefined

    const loadEntries = async () => {
      try {
        const response = await listTimeEntries({
          task_id: expandedHistoryTaskId,
          from: fromIso,
          to: toIso,
          sort_by: 'started_at',
          order: 'desc',
          limit: 200,
          offset: 0,
        })
        if (!isMounted) {
          return
        }
        setHistoryEntries(response.time_entries)
      } catch (error) {
        if (!isMounted) {
          return
        }
        if (error instanceof ApiError && error.status === 401) {
          clearTokens()
          navigate('/login', { replace: true })
          return
        }
        setHistoryEntriesError(error instanceof ApiError ? error.message : 'Не удалось загрузить записи времени')
      } finally {
        if (isMounted) {
          setHistoryEntriesLoading(false)
        }
      }
    }

    void loadEntries()

    return () => {
      isMounted = false
    }
  }, [activeView, expandedHistoryTaskId, historyFromDate, historyToDate, historyFilterVersion, navigate])

  const selectedTaskLabel = tasks.find((task) => task.id === selectedTaskId)?.title ?? EMPTY_TASK_OPTION
  const visibleTasks = tasks.filter((task) => taskFilter === 'all' || task.status === taskFilter)
  const archivedTasks = tasks.filter((task) => task.status === 'archived')

  const getStatusLabel = (status: TaskStatus) => {
    if (status === 'active') {
      return 'В работе'
    }
    if (status === 'completed') {
      return 'Выполнено'
    }
    return 'В архиве'
  }

  const getStatusClassName = (status: TaskStatus) => {
    if (status === 'active') {
      return 'status in-progress'
    }
    if (status === 'completed') {
      return 'status done'
    }
    return 'status queued'
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
                  void handleStartTimer()
                }}
                disabled={isSavingTimeEntry}
              >
                {'\u0421\u0442\u0430\u0440\u0442'}
              </button>
              <button
                type="button"
                className={timerMode === 'paused' ? 'active' : ''}
                onClick={() => {
                  void handlePauseTimer()
                }}
                disabled={isSavingTimeEntry}
              >
                {'\u041F\u0430\u0443\u0437\u0430'}
              </button>
              <button
                type="button"
                className={timerMode === 'stopped' ? 'active' : ''}
                onClick={() => {
                  void handleStopTimer()
                }}
                disabled={isSavingTimeEntry}
              >
                {'\u0421\u0442\u043E\u043F'}
              </button>
            </div>

            <div className="timer-task-picker">
              <span className="timer-task-caption">{'Привязка к задаче'}</span>
              <button
                type="button"
                className="timer-task-link"
                disabled={isTimerRunning || isSavingTimeEntry}
                onClick={() => setTaskMenuOpen((prev) => !prev)}
              >
                {selectedTaskLabel === EMPTY_TASK_OPTION ? selectedTaskLabel : `Задача: ${selectedTaskLabel}`}
              </button>
              {isTaskMenuOpen ? (
                <div className="timer-task-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTaskId(null)
                      setTaskMenuOpen(false)
                    }}
                  >
                    {EMPTY_TASK_OPTION}
                  </button>
                  {tasks.map((task) => (
                    <button
                      type="button"
                      key={task.id}
                      onClick={() => {
                        setSelectedTaskId(task.id)
                        setTaskMenuOpen(false)
                      }}
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {timerSaveError ? <p className="timer-error">{timerSaveError}</p> : null}
        </header>

        {activeView === 'tasks' ? (
          <>
            <div className="dashboard-toolbar">
              <input
                type="text"
                placeholder="Поиск задачи"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <select value={taskFilter} onChange={(event) => setTaskFilter(event.target.value as TaskFilter)}>
                <option value="all">Все статусы</option>
                <option value="active">В работе</option>
                <option value="completed">Выполнено</option>
                <option value="archived">В архиве</option>
              </select>
              <select value={sortOption} onChange={(event) => setSortOption(event.target.value as SortOption)}>
                <option value="created_desc">Сначала новые</option>
                <option value="created_asc">Сначала старые</option>
                <option value="updated_desc">Недавно обновленные</option>
                <option value="title_asc">По названию</option>
                <option value="status_asc">По статусу</option>
              </select>
            </div>

            <div className="dashboard-grid">
              <section className="panel panel-tasks">
                <div className="panel-head">
                  <h2>{'Список задач'}</h2>
                  <span>{`${visibleTasks.length} из ${tasksCount}`}</span>
                </div>

                <form className="task-create-form" onSubmit={handleCreateTask}>
                  <input
                    type="text"
                    placeholder="Название задачи"
                    value={newTaskTitle}
                    onChange={(event) => setNewTaskTitle(event.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Описание (опционально)"
                    value={newTaskDescription}
                    onChange={(event) => setNewTaskDescription(event.target.value)}
                  />
                  <select
                    value={newTaskStatus}
                    onChange={(event) => setNewTaskStatus(event.target.value as TaskStatus)}
                  >
                    <option value="active">В работе</option>
                    <option value="completed">Выполнено</option>
                    <option value="archived">В архиве</option>
                  </select>
                  <button type="submit" disabled={isCreatingTask}>
                    {isCreatingTask ? 'Создание...' : 'Добавить'}
                  </button>
                </form>

                {tasksError ? <p className="tasks-error">{tasksError}</p> : null}
                {isTasksLoading ? <p className="tasks-note">Загрузка задач...</p> : null}

                <div className="task-list">
                  {!isTasksLoading && visibleTasks.length === 0 ? (
                    <p className="tasks-note">Задачи не найдены</p>
                  ) : null}

                  {visibleTasks.map((task) => (
                    <article className="task-row" key={task.id}>
                      <div>
                        <strong>{task.title}</strong>
                        <p>{task.description || 'Без описания'}</p>
                      </div>
                      <div className="task-row-actions">
                        <span className="task-time-badge">{formatTimer(task.total_time)}</span>
                        <span className={getStatusClassName(task.status)}>{getStatusLabel(task.status)}</span>
                        <select
                          className="task-status-select"
                          value={task.status}
                          disabled={updatingTaskId === task.id}
                          onChange={(event) => handleStatusChange(task, event.target.value as TaskStatus)}
                        >
                          <option value="active">В работе</option>
                          <option value="completed">Выполнено</option>
                          <option value="archived">В архиве</option>
                        </select>
                        <button
                          type="button"
                          className="task-delete-button"
                          disabled={deletingTaskId === task.id}
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          {deletingTaskId === task.id ? 'Удаление...' : 'Удалить'}
                        </button>
                      </div>
                    </article>
                  ))}
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
            <form className="report-filters" onSubmit={handleApplyHistoryFilter}>
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={historyFromDate}
                  onChange={(event) => setHistoryFromDate(event.target.value)}
                />
              </label>
              <label>
                <span>To</span>
                <input type="date" value={historyToDate} onChange={(event) => setHistoryToDate(event.target.value)} />
              </label>
              <button type="submit">Применить</button>
            </form>

            {archivedTasks.length === 0 ? <p className="tasks-note">Архивных задач пока нет</p> : null}

            <div className="history-list">
              {archivedTasks.map((task) => {
                const isExpanded = expandedHistoryTaskId === task.id
                return (
                  <article key={task.id} className="history-row">
                    <button
                      type="button"
                      className="history-toggle"
                      onClick={() => {
                        setHistoryEntriesError(null)
                        setHistoryEntries([])
                        setExpandedHistoryTaskId((prev) => (prev === task.id ? null : task.id))
                      }}
                    >
                      <span>{task.title}</span>
                      <span>{formatTimer(task.total_time)}</span>
                    </button>

                    {isExpanded ? (
                      <div className="history-body">
                        <p>{task.description || 'Без описания'}</p>
                        <p>{`Создана: ${formatDateTime(task.created_at)}`}</p>
                        <p>{`Обновлена: ${formatDateTime(task.updated_at)}`}</p>

                        {historyEntriesError ? <p className="tasks-error">{historyEntriesError}</p> : null}
                        {isHistoryEntriesLoading ? <p className="tasks-note">Загрузка записей...</p> : null}
                        {!isHistoryEntriesLoading && historyEntries.length === 0 ? (
                          <p className="tasks-note">Записей времени не найдено</p>
                        ) : null}

                        <div className="history-sublist">
                          {historyEntries.map((entry) => (
                            <div key={entry.id} className="history-entry">
                              <span>{formatDateTime(entry.started_at)}</span>
                              <span>{formatDateTime(entry.ended_at)}</span>
                              <strong>{formatTimer(entry.duration_sec)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              })}
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
