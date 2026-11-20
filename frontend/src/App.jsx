import { useEffect, useState } from 'react'
import { auth, db, LIVE } from './lib/db'
import { ENTITIES, NAV, expiryAlerts, canView, ROLES, DEFAULT_ROLE } from './lib/config'
import Login from './components/Login'
import EntityPage from './components/EntityPage'
import FleetLink from './components/FleetLink'
import TruckIntro from './components/TruckIntro'
import { Icon, Modal } from './components/ui'

const getFirstAllowedPage = (role) => {
  const allowed = (ROLES[role] || ROLES[DEFAULT_ROLE]).pages
  return allowed[0] || 'trucks'
}

const pageFromHash = (role) => {
  const h = location.hash.slice(1)
  if (NAV.includes(h) && canView(role, h)) return h
  return getFirstAllowedPage(role)
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = checking
  const [intro, setIntro] = useState(true)
  const [entering, setEntering] = useState(false)
  const [data, setData] = useState(null)
  const [page, setPage] = useState('trucks')
  const [menu, setMenu] = useState(false)
  const [error, setError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearErr, setClearErr] = useState('')

  useEffect(() => { auth.current().then(setUser).catch(() => setUser(null)) }, [])
  useEffect(() => {
    if (!user) return setData(null)
    db.loadAll().then(setData).catch((e) => setError(e.message))
  }, [user])

  // Guard route when user is set / changes
  useEffect(() => {
    if (!user) return
    const cur = location.hash.slice(1)
    if (!canView(user.role, cur)) {
      const target = getFirstAllowedPage(user.role)
      location.hash = target
      setPage(target)
    } else {
      setPage(cur)
    }
  }, [user])

  // Guard route on hash change
  useEffect(() => {
    const on = () => {
      const h = location.hash.slice(1)
      if (user && !canView(user.role, h)) {
        const target = getFirstAllowedPage(user.role)
        location.hash = target
        setPage(target)
      } else if (NAV.includes(h)) {
        setPage(h)
      }
    }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [user])

  const go = (k) => { location.hash = k; setPage(k); setMenu(false) }

  const actions = {
    async save(table, row) {
      const saved = await db.save(table, row, user)
      setData((d) => ({ ...d, [table]: row.id ? d[table].map((r) => (r.id === saved.id ? saved : r)) : [...d[table], saved] }))
      return saved
    },
    async remove(table, id) {
      await db.remove(table, id)
      setData((d) => ({
        ...d, [table]: d[table].filter((r) => r.id !== id),
        ...(table === 'trucks' ? { fleet_links: d.fleet_links.filter((l) => l.truck_id !== id), truck_costs: d.truck_costs.filter((c) => c.truck_id !== id) } : {}),
      }))
    },
  }

  // Play truck animation before revealing login/signup page
  if (intro) {
    return (
      <>
        {!user && <Login onLogin={setUser} enter={entering} />}
        <TruckIntro
          onOpening={() => setEntering(true)}
          onDone={() => setIntro(false)}
        />
      </>
    )
  }

  if (user === undefined) return <div className="boot">Loading…</div>
  if (!user) return <Login onLogin={setUser} />

  const badge = (k) => (data && ENTITIES[k].fields?.some((f) => f.expiry) ? expiryAlerts(ENTITIES[k], data[k]).length : 0)

  return (
    <div className={'shell' + (menu ? ' menu-open' : '')}>
      <aside className="sidebar">
        <div className="brand">
          <Icon name="Truck" size={22} />
          <div className="brand-text">
            <span className="brand-title">{user.company?.name || 'SAQR Transport'}</span>
            {user.company?.code && (
              <span className="brand-code" title="Company invitation code">
                {user.company.code}
              </span>
            )}
          </div>
        </div>
        <div className="group">CRM</div>
        <nav>
          {NAV.filter((k) => canView(user.role, k)).map((k) => (
            <button key={k} className={page === k ? 'on' : ''} onClick={() => go(k)}>
              <Icon name={ENTITIES[k].icon} />
              <span>{ENTITIES[k].title}</span>
              {badge(k) > 0 && <em>{badge(k)}</em>}
            </button>
          ))}
        </nav>
        {user.role === 'Admin' && (
          <button
            className="side-clear-btn"
            onClick={() => { setClearErr(''); setConfirmClear(true) }}
            title="Clear all CRM records"
          >
            <Icon name="Trash2" size={15} /> Clear all records
          </button>
        )}
        <div className="side-foot">
          <div className="who">
            <b>{user.name}</b>
            <span>{user.role}</span>
          </div>
          <button onClick={async () => { await auth.signOut(); setUser(null) }}><Icon name="LogOut" size={16} /> Sign out</button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setMenu(false)} />
      <div className="main">
        <div className="topbar">
          <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Menu"><Icon name="Menu" /></button>
          <span className="mut">CRM</span> <span className="mut">/</span> <b>{ENTITIES[page]?.title}</b>
          {user.role === 'Admin' && (
            <button
              className="btn-clear-all"
              onClick={() => { setClearErr(''); setConfirmClear(true) }}
              title="Delete all CRM records from database"
            >
              <Icon name="Trash2" size={14} /> Clear all records
            </button>
          )}
          {!LIVE && (
            <button className="reset" onClick={() => { db.resetDemo(); db.loadAll().then(setData) }}>Reset demo data</button>
          )}
        </div>
        <div className="content">
          {error && <div className="err">{error}</div>}
          {!data ? <div className="boot">Loading data…</div> : page === 'fleet_links'
            ? <FleetLink data={data} user={user} actions={actions} />
            : <EntityPage key={page} table={page} data={data} user={user} actions={actions} />}
        </div>
      </div>

      {confirmClear && (
        <Modal title="Clear All CRM Records" onClose={() => !clearing && setConfirmClear(false)}>
          <div className="modal-body">
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px', borderRadius: '50%', flexShrink: 0 }}>
                <Icon name="AlertTriangle" size={24} />
              </div>
              <div>
                <b style={{ fontSize: '15px', display: 'block', marginBottom: '6px' }}>Delete all fleet and CRM records?</b>
                <p className="mut" style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
                  This will permanently clear all <b>trucks, drivers, trailers, fleet links, employees, clients, suppliers, brokers, outsource owners, trips, and costs</b> for <b>{user.company?.name || 'your company'}</b>.
                </p>
                <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--red)', fontWeight: 500 }}>
                  ⚠️ This action cannot be undone. User accounts will be kept.
                </p>
              </div>
            </div>
            {clearErr && <div className="err">{clearErr}</div>}
            <footer>
              <button type="button" className="btn" disabled={clearing} onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                disabled={clearing}
                onClick={async () => {
                  setClearing(true)
                  setClearErr('')
                  try {
                    const empty = await db.clearAll(user)
                    setData(empty)
                    setConfirmClear(false)
                  } catch (e) {
                    setClearErr(e.message)
                  } finally {
                    setClearing(false)
                  }
                }}
              >
                {clearing ? 'Clearing records…' : 'Yes, delete all records'}
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </div>
  )
}
