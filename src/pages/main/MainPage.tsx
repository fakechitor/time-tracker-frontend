import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../shared/api/http'
import { getCurrentUser } from '../../features/auth/lib/session'
import { clearTokens } from '../../features/auth/lib/tokenStorage'

export function MainPage() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [username, setUsername] = useState('...')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
          setErrorMessage('Failed to load user profile.')
        }
      }
    }

    loadUser()

    return () => {
      isMounted = false
    }
  }, [navigate])

  const handleLogout = () => {
    setMenuOpen(false)
    clearTokens()
    navigate('/login', { replace: true })
  }

  return (
    <main className="main-page">
      <aside className="main-sidebar">
        <div className="main-sidebar-top">Time Tracker</div>
        <div className="user-box">
          <button
            type="button"
            className="user-trigger"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {username}
          </button>
          {menuOpen ? (
            <div className="user-menu">
              <button type="button" className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <section className="main-content">
        <h1 className="main-title">Main page</h1>
        {errorMessage ? <p className="main-error">{errorMessage}</p> : null}
      </section>
    </main>
  )
}
