// ─────────────────────────────────────────────────────────────────────────────
// Data + auth layer. This is the ONLY file that talks to Supabase.
//   • .env has VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY  → live Supabase
//   • otherwise                                            → demo mode (browser storage)
// Table/column names match supabase/schema.sql exactly.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import { seed } from './seed'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const LIVE = !!(URL && KEY)
const sb = LIVE ? createClient(URL, KEY) : null

export const TABLES = ['trucks', 'drivers', 'trailers', 'fleet_links', 'employees', 'clients', 'suppliers', 'brokers', 'outsource_owners', 'truck_costs', 'trips']

// ── demo storage (falls back to memory when localStorage is blocked) ─────────
const mem = {}
const store = {
  get(k) {
    try { const v = localStorage.getItem(k); if (v) return JSON.parse(v) } catch {}
    return mem[k] ?? null
  },
  set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
  del(k) { delete mem[k]; try { localStorage.removeItem(k) } catch {} },
}
const DEMO_KEY = 'saqr_demo_v1'
const demo = () => store.get(DEMO_KEY) || (store.set(DEMO_KEY, seed()), mem[DEMO_KEY])

export const DEMO_USERS = [
  { email: 'admin@saqr.demo', password: 'Admin@123', name: 'Admin User', role: 'Admin' },
  { email: 'ops@saqr.demo', password: 'Ops@123', name: 'Operations User', role: 'Operations' },
  { email: 'finance@saqr.demo', password: 'Finance@123', name: 'Finance User', role: 'Finance' },
]

// ── auth ─────────────────────────────────────────────────────────────────────
async function profileFor(user) {
  const { data } = await sb.from('profiles').select('name, role, company_id').eq('id', user.id).maybeSingle()
  let company = null
  if (data?.company_id) {
    const { data: c } = await sb.from('companies').select('id, name, code').eq('id', data.company_id).maybeSingle()
    company = c
  }
  return {
    id: user.id,
    email: user.email,
    name: data?.name || user.email,
    role: data?.role || 'Operations',
    company_id: data?.company_id || '11111111-1111-1111-1111-111111111111',
    company: company || { id: '11111111-1111-1111-1111-111111111111', name: 'SAQR Transport', code: 'SAQR-FLEET-01' },
  }
}
export const auth = {
  async current() {
    if (!LIVE) return store.get('saqr_user')
    const { data } = await sb.auth.getSession()
    return data.session ? profileFor(data.session.user) : null
  },
  async signIn(email, password) {
    const cleanEmail = email.trim().toLowerCase()
    if (!LIVE) {
      const u = DEMO_USERS.find((x) => x.email === cleanEmail && x.password === password)
      if (!u) throw new Error('Wrong email or password.')
      const user = {
        id: u.email,
        email: u.email,
        name: u.name,
        role: u.role,
        company_id: '11111111-1111-1111-1111-111111111111',
        company: { id: '11111111-1111-1111-1111-111111111111', name: 'SAQR Transport', code: 'SAQR-FLEET-01' },
      }
      store.set('saqr_user', user)
      return user
    }
    const { data, error } = await sb.auth.signInWithPassword({ email: cleanEmail, password })
    if (error) throw new Error(error.message)
    return profileFor(data.user)
  },
  async signUp(name, email, password, companyPayload = { type: 'create', name: 'My Company' }) {
    const cleanEmail = email.trim().toLowerCase()
    if (!LIVE) {
      let company = { id: '11111111-1111-1111-1111-111111111111', name: 'SAQR Transport', code: 'SAQR-DEMO' }
      let userRole = 'Operations'
      if (companyPayload.type === 'create') {
        const cName = companyPayload.name?.trim() || 'New Company'
        const code = cName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) + '-' + Math.floor(1000 + Math.random() * 9000)
        company = { id: crypto.randomUUID(), name: cName, code }
        userRole = 'Admin'
      } else if (companyPayload.type === 'join') {
        const code = companyPayload.code?.trim().toUpperCase() || 'SAQR-DEMO'
        company = { id: 'demo-company-joined', name: 'Company ' + code, code }
        userRole = 'Operations'
      }
      const user = {
        id: cleanEmail,
        email: cleanEmail,
        name: name.trim() || cleanEmail.split('@')[0],
        role: userRole,
        company_id: company.id,
        company,
      }
      store.set('saqr_user', user)
      return user
    }

    let companyId = '11111111-1111-1111-1111-111111111111'
    let role = 'Operations'

    if (companyPayload.type === 'create') {
      const cName = companyPayload.name?.trim() || 'New Company'
      const basePrefix = cName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'COMP'
      const code = `${basePrefix}-${Math.floor(1000 + Math.random() * 9000)}`
      const newCompanyId = crypto.randomUUID()
      const { error: cErr } = await sb.from('companies').insert({
        id: newCompanyId,
        name: cName,
        code,
      })
      if (cErr) throw new Error(`Could not create company: ${cErr.message}`)
      companyId = newCompanyId
      role = 'Admin'
    } else if (companyPayload.type === 'join') {
      const inputCode = companyPayload.code?.trim().toUpperCase()
      if (!inputCode) throw new Error('Please enter a valid company code.')
      const { data: comp, error: cErr } = await sb.from('companies').select('id, name, code').eq('code', inputCode).maybeSingle()
      if (cErr || !comp) throw new Error('Company code not found. Please check with your company admin.')
      companyId = comp.id
      role = 'Operations'
    }

    const { data, error } = await sb.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: name.trim(),
          company_id: companyId,
          role,
        },
      },
    })
    if (error) throw new Error(error.message)
    if (!data.session) {
      const { data: sData, error: sErr } = await sb.auth.signInWithPassword({ email: cleanEmail, password })
      if (!sErr && sData.user) return profileFor(sData.user)
      throw new Error('Account created! Please check your email or sign in.')
    }
    return profileFor(data.user)
  },
  async signOut() {
    if (!LIVE) return store.del('saqr_user')
    await sb.auth.signOut()
  },
}

// ── data ─────────────────────────────────────────────────────────────────────
export const db = {
  async loadAll() {
    if (!LIVE) return structuredClone(demo())
    const out = {}
    await Promise.all(TABLES.map(async (t) => {
      const { data, error } = await sb.from(t).select('*').order('created_at', { ascending: true })
      if (error) throw new Error(`${t}: ${error.message}`)
      out[t] = data
    }))
    return out
  },

  // insert (no id) or update (has id). Returns the saved row.
  async save(table, row, user) {
    if (!LIVE) {
      const d = demo()
      let saved
      if (row.id) {
        d[table] = d[table].map((r) => (r.id === row.id ? (saved = { ...r, ...row }) : r))
      } else {
        saved = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() }
        d[table] = [...d[table], saved]
      }
      store.set(DEMO_KEY, d)
      return saved
    }
    const payload = { ...row }
    if (!payload.id && user?.company_id) {
      payload.company_id = user.company_id
    }
    const q = payload.id ? sb.from(table).update(payload).eq('id', payload.id) : sb.from(table).insert(payload)
    const { data, error } = await q.select().single()
    if (error) throw new Error(error.message)
    return data
  },

  async remove(table, id) {
    if (!LIVE) {
      const d = demo()
      d[table] = d[table].filter((r) => r.id !== id)
      if (table === 'trucks') d.fleet_links = d.fleet_links.filter((l) => l.truck_id !== id)
      store.set(DEMO_KEY, d)
      return
    }
    const { error } = await sb.from(table).delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // Upload a file → { name, url }. Live: Supabase Storage bucket "files". Demo: data URL.
  async upload(file) {
    if (LIVE) {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`
      const { error } = await sb.storage.from('files').upload(path, file)
      if (error) throw new Error(error.message)
      return { name: file.name, url: sb.storage.from('files').getPublicUrl(path).data.publicUrl }
    }
    return { name: file.name, url: await toDataUrl(file) }
  },

  resetDemo() { store.del(DEMO_KEY) },

  async clearAll(user) {
    if (!LIVE) {
      const empty = {}
      TABLES.forEach((t) => { empty[t] = [] })
      store.set(DEMO_KEY, empty)
      return empty
    }
    const order = ['truck_costs', 'trips', 'fleet_links', 'outsource_owners', 'brokers', 'suppliers', 'clients', 'employees', 'trailers', 'drivers', 'trucks']
    for (const t of order) {
      let q = sb.from(t).delete()
      if (user?.company_id) {
        q = q.eq('company_id', user.company_id)
      } else {
        q = q.neq('id', '00000000-0000-0000-0000-000000000000')
      }
      const { error } = await q
      if (error) throw new Error(`Failed to clear ${t}: ${error.message}`)
    }
    const empty = {}
    TABLES.forEach((t) => { empty[t] = [] })
    return empty
  },
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = reject
    r.onload = () => {
      if (!file.type.startsWith('image/')) return resolve(r.result)
      const img = new Image() // shrink photos so browser storage doesn't overflow
      img.onload = () => {
        const k = Math.min(1, 900 / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = img.width * k; c.height = img.height * k
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = () => resolve(r.result)
      img.src = r.result
    }
    r.readAsDataURL(file)
  })
}
