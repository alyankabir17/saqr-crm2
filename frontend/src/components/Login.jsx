import { useState } from 'react'
import { auth, LIVE, DEMO_USERS } from '../lib/db'
import { Icon } from './ui'

export default function Login({ onLogin, enter }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [companyMode, setCompanyMode] = useState('create') // 'create' | 'join'
  const [companyName, setCompanyName] = useState('')
  const [companyCode, setCompanyCode] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      const cleanEmail = email.trim().toLowerCase()
      if (mode === 'signup') {
        const companyPayload = companyMode === 'create'
          ? { type: 'create', name: companyName.trim() }
          : { type: 'join', code: companyCode.trim().toUpperCase() }
        const user = await auth.signUp(name, cleanEmail, pw, companyPayload)
        onLogin(user)
      } else {
        const user = await auth.signIn(cleanEmail, pw)
        onLogin(user)
      }
    } catch (x) {
      const m = x.message || ''
      if (m.toLowerCase().includes('invalid login credentials')) {
        setErr('Invalid email or password. Please verify your password and try again.')
      } else {
        setErr(m)
      }
      setBusy(false)
    }
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setErr('')
    setMsg('')
  }

  return (
    <div className={'login' + (enter ? ' enter' : '')}>
      <aside>
        <div className="brand big"><Icon name="Truck" size={26} /> SAQR Transport</div>
        <h1>Fleet CRM</h1>
        <p>Trucks, drivers, trailers, clients, suppliers, brokers and outsource owners in one register. Documents expire. We tell you 45 days before.</p>
        <ul>
          <li><Icon name="FileWarning" size={16} /> Mulkiya, insurance and licence expiry alerts</li>
          <li><Icon name="Link2" size={16} /> Truck, driver and trailer pairing board</li>
          <li><Icon name="FileSpreadsheet" size={16} /> PDF and Excel export on every list</li>
        </ul>
      </aside>
      <main>
        <form onSubmit={submit}>
          <div className="auth-tabs">
            <button
              type="button"
              className={'auth-tab' + (mode === 'login' ? ' active' : '')}
              onClick={() => switchMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={'auth-tab' + (mode === 'signup' ? ' active' : '')}
              onClick={() => switchMode('signup')}
            >
              Create account
            </button>
          </div>

          <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>

          {mode === 'signup' && (
            <>
              <div className="company-toggle">
                <label className={'toggle-opt' + (companyMode === 'create' ? ' selected' : '')}>
                  <input
                    type="radio"
                    name="companyMode"
                    checked={companyMode === 'create'}
                    onChange={() => setCompanyMode('create')}
                  />
                  <div>
                    <b>Register new company</b>
                    <span>Create a separate workspace (Admin)</span>
                  </div>
                </label>
                <label className={'toggle-opt' + (companyMode === 'join' ? ' selected' : '')}>
                  <input
                    type="radio"
                    name="companyMode"
                    checked={companyMode === 'join'}
                    onChange={() => setCompanyMode('join')}
                  />
                  <div>
                    <b>Join company with code</b>
                    <span>Connect to an existing workspace</span>
                  </div>
                </label>
              </div>

              {companyMode === 'create' ? (
                <>
                  <label htmlFor="cname">Company name *</label>
                  <input
                    id="cname"
                    type="text"
                    required
                    placeholder="e.g. Al Zahra Logistics"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <label htmlFor="ccode">Company code *</label>
                  <input
                    id="ccode"
                    type="text"
                    required
                    placeholder="e.g. SAQR-FLEET-01"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                  />
                </>
              )}

              <label htmlFor="name">Full name *</label>
              <input
                id="name"
                type="text"
                required
                autoFocus
                placeholder="e.g. Tariq Mansoor"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </>
          )}

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoFocus={mode === 'login'}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label htmlFor="pw">Password</label>
          <div className="pw-wrap">
            <input
              id="pw"
              type={showPw ? 'text' : 'password'}
              required
              minLength={6}
              placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw(!showPw)}
              title={showPw ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              <Icon name={showPw ? 'EyeOff' : 'Eye'} size={16} />
            </button>
          </div>

          {mode === 'signup' && (
            <p className="auth-hint">
              {companyMode === 'create'
                ? <>Creating a new company gives you the <b>Admin</b> role with an isolated database. You will receive a code to invite your team.</>
                : <>Joining an existing company assigns you the <b>Operations</b> role. Your company Admin can update your role.</>}
            </p>
          )}

          {err && <div className="err">{err}</div>}
          {msg && <div className="auth-msg">{msg}</div>}

          <button className="btn primary" disabled={busy}>
            {busy
              ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
              : (mode === 'signup' ? 'Create account' : 'Sign in')}
          </button>

          {mode === 'login' && (
            <div className="demo-box">
              <b>{LIVE ? 'Configured Accounts' : 'Demo Accounts'}</b> <span className="mut">(click to fill)</span>
              {DEMO_USERS.map((u) => (
                <button
                  type="button"
                  key={u.email}
                  onClick={() => {
                    setEmail(u.email)
                    setPw(u.password)
                  }}
                >
                  <span>{u.role}</span>
                  <code>{u.email}</code>
                  <code>{u.password}</code>
                </button>
              ))}
            </div>
          )}
        </form>
      </main>
    </div>
  )
}
