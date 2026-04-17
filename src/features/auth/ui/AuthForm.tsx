import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'

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

const initialState: FormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export function AuthForm({ mode }: AuthFormProps) {
  const [form, setForm] = useState<FormState>(initialState)

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

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // TODO: wire API integration in features/auth/api.
    console.log(`${mode} form`, form)
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1 className="auth-title">{content.title}</h1>
        <form className="auth-form" onSubmit={onSubmit}>
          {mode === 'register' ? (
            <label className="auth-field">
              <span>Name</span>
              <input
                autoComplete="name"
                name="name"
                type="text"
                value={form.name}
                onChange={onChange}
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
                required
              />
            </label>
          ) : null}

          <button className="auth-submit" type="submit">
            {content.submitLabel}
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
