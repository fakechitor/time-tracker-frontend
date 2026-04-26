import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../../shared/api/http'
import { login, register } from '../api/authApi'
import { saveTokens } from '../lib/tokenStorage'

type AuthMode = 'login' | 'register'

type AuthFormProps = {
  mode: AuthMode
}

type FormState = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

const TIMER_STATE_KEY = 'time-tracker-timer-state-v1'

const initialState: FormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export function AuthForm({ mode }: AuthFormProps) {
  const [form, setForm] = useState<FormState>(initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  const content = useMemo(() => {
    if (mode === 'register') {
      return {
        title: 'Create account',
        submitLabel: 'Sign up',
        secondaryText: 'Already have an account?',
        secondaryLink: '/login',
        secondaryLinkLabel: 'Sign in',
      }
    }

    return {
      title: 'Welcome back',
      submitLabel: 'Sign in',
      secondaryText: "Don't have an account?",
      secondaryLink: '/register',
      secondaryLinkLabel: 'Create one',
    }
  }, [mode])

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const tokens =
        mode === 'register'
          ? await register({
              username: form.name,
              email: form.email,
              password: form.password,
              confirmed_password: form.confirmPassword,
            })
          : await login({
              email: form.email,
              password: form.password,
            })

      saveTokens(tokens)
      if (mode === 'register') {
        localStorage.removeItem(TIMER_STATE_KEY)
      }
      navigate('/app')
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Unexpected error, try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1 className="auth-title">{content.title}</h1>
        <form className="auth-form" onSubmit={onSubmit}>
          {mode === 'register' ? (
            <label className="auth-field">
              <span>Username</span>
              <input
                autoComplete="username"
                name="name"
                type="text"
                value={form.name}
                onChange={onChange}
                minLength={3}
                required
              />
            </label>
          ) : null}

          <label className="auth-field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              minLength={6}
              required
            />
          </label>

          {mode === 'register' ? (
            <label className="auth-field">
              <span>Confirm password</span>
              <input
                autoComplete="new-password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={onChange}
                minLength={6}
                required
              />
            </label>
          ) : null}

          {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : content.submitLabel}
          </button>
        </form>
        <p className="auth-secondary">
          {content.secondaryText}{' '}
          <Link to={content.secondaryLink}>{content.secondaryLinkLabel}</Link>
        </p>
      </section>
    </main>
  )
}
