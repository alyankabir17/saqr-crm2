// Page definitions, roles and formatting helpers.
export const WARN_DAYS = 45

export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
export const daysTo = (s) => (s ? Math.round((new Date(s) - new Date(today())) / 864e5) : null)
export const aed = (n) => (n == null || n === '' ? '—' : 'AED ' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }))
export const byId = (list, id) => list.find((x) => x.id === id)

// ── roles ────────────────────────────────────────────────────────────────────
// Keep in sync with the policies in supabase/schema.sql
export const DEFAULT_ROLE = 'Operations'

export const ROLES = {
  Admin: {
    pages: ['trucks', 'drivers', 'trailers', 'fleet_links', 'employees', 'clients', 'suppliers', 'brokers', 'outsource_owners'],
    edit: '*',
    del: true,
    money: true,
  },
  Operations: {
    pages: ['trucks', 'drivers', 'trailers', 'fleet_links', 'clients', 'suppliers'],
    edit: ['trucks', 'drivers', 'trailers', 'fleet_links', 'clients', 'suppliers', 'truck_costs'],
    del: false,
    money: false,
  },
  Finance: {
    pages: ['trucks', 'drivers', 'employees', 'clients', 'suppliers', 'brokers', 'outsource_owners'],
    edit: ['employees', 'clients', 'suppliers', 'brokers', 'outsource_owners'],
    del: false,
    money: true,
  },
}

export const canView = (role, page) => {
  const r = ROLES[role] || ROLES[DEFAULT_ROLE]
  return r.pages.includes(page)
}

export const can = (role, table, act = 'edit') => {
  const r = ROLES[role] || ROLES[DEFAULT_ROLE]
  if (act === 'del') return r.del
  return r.edit === '*' || r.edit.includes(table)
}

// ── helpers for computed columns ─────────────────────────────────────────────
const live = (d, key, id) => d.trips.filter((t) => t[key] === id && t.status !== 'Cancelled')
const thisMonth = () => today().slice(0, 7)
const linkOf = (d, key, id) => d.fleet_links.find((l) => l[key] === id)

const S = (options) => ({ key: 'status', label: 'Status', type: 'select', options, req: 1 })
const ACTIVE = ['Active', 'Inactive']

export const ENTITIES = {
  trucks: {
    title: 'Trucks', one: 'Truck', icon: 'Truck', label: (r) => r.plate, fk: 'truck_id', statuses: ['Active', 'Maintenance', 'Inactive'],
    fields: [
      { key: 'plate', label: 'Plate no.', req: 1 },
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'year', label: 'Year', type: 'number' },
      { key: 'type', label: 'Type', type: 'select', options: ['Prime mover', 'Flatbed', 'Tipper', 'Box truck'] },
      { key: 'purchase_price', label: 'Purchase price (AED)', type: 'money', money: 1 },
      { key: 'mulkiya_expiry', label: 'Mulkiya expiry', type: 'date', expiry: 1 },
      { key: 'insurance_expiry', label: 'Insurance expiry', type: 'date', expiry: 1 },
      { key: 'mulkiya_file', label: 'Mulkiya copy', type: 'file' },
      { key: 'insurance_file', label: 'Insurance copy', type: 'file' },
      { key: 'photos', label: 'Photos', type: 'photos' },
      S(['Active', 'Maintenance', 'Inactive']),
    ],
    cols: [
      'plate',
      { k: 'veh', label: 'Vehicle', get: (r) => [r.make, r.model, r.year].filter(Boolean).join(' ') },
      'type', 'purchase_price', 'mulkiya_expiry', 'insurance_expiry',
      { k: 'drv', label: 'Driver', get: (r, d) => byId(d.drivers, linkOf(d, 'truck_id', r.id)?.driver_id)?.name || '—' },
      'status',
    ],
  },
  drivers: {
    title: 'Drivers', one: 'Driver', icon: 'UserRound', label: (r) => r.name, fk: 'driver_id', statuses: ['Active', 'On leave', 'Inactive'],
    fields: [
      { key: 'name', label: 'Full name', req: 1 },
      { key: 'phone', label: 'Phone' },
      { key: 'licence_no', label: 'Licence no.' },
      { key: 'licence_expiry', label: 'Licence expiry', type: 'date', expiry: 1 },
      { key: 'salary', label: 'Monthly salary (AED)', type: 'money', money: 1 },
      { key: 'photo', label: 'Photo', type: 'image' },
      { key: 'licence_file', label: 'Licence copy', type: 'file' },
      S(['Active', 'On leave', 'Inactive']),
    ],
    cols: [
      'name', 'phone', 'licence_no', 'licence_expiry',
      { k: 'truck', label: 'Assigned truck', get: (r, d) => byId(d.trucks, linkOf(d, 'driver_id', r.id)?.truck_id)?.plate || '—' },
      'salary',
      { k: 'tm', label: 'Trips this month', num: 1, get: (r, d) => live(d, 'driver_id', r.id).filter((t) => t.date.startsWith(thisMonth())).length },
      'status',
    ],
  },
  trailers: {
    title: 'Trailers', one: 'Trailer', icon: 'Container', label: (r) => r.number, statuses: ACTIVE,
    fields: [
      { key: 'number', label: 'Trailer no.', req: 1 },
      { key: 'type', label: 'Type', type: 'select', options: ['Flatbed 40ft', 'Skeleton 40ft', 'Skeleton 20ft', 'Lowbed', 'Curtain side', 'Tanker'] },
      { key: 'capacity', label: 'Capacity' },
      { key: 'photo', label: 'Photo', type: 'image' },
      S(ACTIVE),
    ],
    cols: [
      'number', 'type', 'capacity',
      { k: 'truck', label: 'Linked truck', get: (r, d) => byId(d.trucks, linkOf(d, 'trailer_id', r.id)?.truck_id)?.plate || '—' },
      'status',
    ],
  },
  fleet_links: { title: 'Fleet Link', icon: 'Link2', special: true },
  employees: {
    title: 'Employees', one: 'Employee', icon: 'Briefcase', label: (r) => r.name, statuses: ACTIVE,
    fields: [
      { key: 'name', label: 'Full name', req: 1 },
      { key: 'designation', label: 'Designation' },
      { key: 'phone', label: 'Phone' },
      { key: 'salary', label: 'Monthly salary (AED)', type: 'money', money: 1 },
      { key: 'photo', label: 'Photo', type: 'image' },
      { key: 'contract_file', label: 'Contract / ID copy', type: 'file' },
      S(ACTIVE),
    ],
    cols: ['name', 'designation', 'phone', 'salary', 'status'],
  },
  clients: {
    title: 'Clients', one: 'Client', icon: 'Building2', label: (r) => r.name, fk: 'client_id', statuses: ACTIVE,
    fields: [
      { key: 'name', label: 'Company name', req: 1 },
      { key: 'contact', label: 'Contact person' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'trade_licence', label: 'Trade licence', type: 'file' },
      S(ACTIVE),
    ],
    cols: [
      'name', 'contact', 'phone', 'email',
      { k: 'trips', label: 'Trips', num: 1, get: (r, d) => live(d, 'client_id', r.id).length },
      { k: 'spend', label: 'Total spend', money: 1, num: 1, get: (r, d) => live(d, 'client_id', r.id).reduce((a, t) => a + (t.rate || 0), 0) },
      'status',
    ],
  },
  suppliers: {
    title: 'Suppliers', one: 'Supplier', icon: 'Store', label: (r) => r.name, statuses: ACTIVE,
    extra: { key: 'category', label: 'All categories', options: ['Fuel', 'Garage', 'Parts', 'Tyres', 'Other'] },
    fields: [
      { key: 'name', label: 'Supplier name', req: 1 },
      { key: 'category', label: 'Category', type: 'select', options: ['Fuel', 'Garage', 'Parts', 'Tyres', 'Other'], req: 1 },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'trade_licence', label: 'Trade licence', type: 'file' },
      S(ACTIVE),
    ],
    cols: ['name', 'category', 'phone', 'email', 'status'],
  },
  brokers: {
    title: 'Brokers', one: 'Broker', icon: 'Handshake', label: (r) => r.name, fk: 'broker_id', statuses: ACTIVE,
    fields: [
      { key: 'name', label: 'Full name', req: 1 },
      { key: 'phone', label: 'Phone' },
      { key: 'commission_pct', label: 'Commission (%)', type: 'number', step: '0.1', money: 1 },
      S(ACTIVE),
    ],
    cols: [
      'name', 'phone', 'commission_pct',
      { k: 'trips', label: 'Trips', num: 1, get: (r, d) => live(d, 'broker_id', r.id).length },
      { k: 'owed', label: 'Commission earned', money: 1, num: 1, get: (r, d) => Math.round(live(d, 'broker_id', r.id).reduce((a, t) => a + (t.rate || 0), 0) * (r.commission_pct || 0)) / 100 },
      'status',
    ],
  },
  outsource_owners: {
    title: 'Outsource', one: 'Outsource owner', icon: 'ExternalLink', label: (r) => r.name, fk: 'outsource_id', statuses: ACTIVE,
    fields: [
      { key: 'name', label: 'Owner / company', req: 1 },
      { key: 'phone', label: 'Phone' },
      { key: 'paid', label: 'Amount paid so far (AED)', type: 'money', money: 1 },
      { key: 'agreement', label: 'Agreement copy', type: 'file' },
      S(ACTIVE),
    ],
    cols: [
      'name', 'phone',
      { k: 'trips', label: 'Trips', num: 1, get: (r, d) => live(d, 'outsource_id', r.id).length },
      { k: 'payable', label: 'Payable', money: 1, num: 1, get: (r, d) => live(d, 'outsource_id', r.id).reduce((a, t) => a + (t.outsource_cost || 0), 0) },
      { k: 'paidc', label: 'Paid', money: 1, num: 1, get: (r) => r.paid || 0 },
      { k: 'rem', label: 'Remaining', money: 1, num: 1, strong: 1, get: (r, d) => live(d, 'outsource_id', r.id).reduce((a, t) => a + (t.outsource_cost || 0), 0) - (r.paid || 0) },
      'status',
    ],
  },
}

export const NAV = Object.keys(ENTITIES)

// ── columns & cell text ──────────────────────────────────────────────────────
export const colsOf = (ent) =>
  ent.cols.map((c) => {
    if (typeof c !== 'string') return c
    const f = ent.fields.find((x) => x.key === c)
    return { k: c, label: f.label.replace(/ \(.*\)/, ''), field: f, money: !!f.money, num: f.type === 'money' || f.type === 'number' }
  })

export const rawValue = (col, r, d) => (col.get ? col.get(r, d) : r[col.k])
export const cellText = (col, r, d) => {
  const v = rawValue(col, r, d)
  if (col.money && col.field?.type !== 'number') return aed(v)
  if (col.field?.type === 'money') return aed(v)
  if (col.field?.type === 'number' && col.field.key === 'commission_pct') return v == null ? '—' : v + '%'
  if (v == null || v === '') return '—'
  return String(v)
}

// ── document-expiry alerts ───────────────────────────────────────────────────
export const expiryAlerts = (ent, rows) => {
  const fs = ent.fields.filter((f) => f.expiry)
  const out = []
  rows.forEach((r) => fs.forEach((f) => {
    const n = daysTo(r[f.key])
    if (n != null && n <= WARN_DAYS) out.push({ id: r.id, who: ent.label(r), doc: f.label.replace(' expiry', ''), days: n })
  }))
  return out.sort((a, b) => a.days - b.days)
}
