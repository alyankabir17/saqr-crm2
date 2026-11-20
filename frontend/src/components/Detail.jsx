import { useState } from 'react'
import { ENTITIES, colsOf, cellText, can, canView, ROLES, DEFAULT_ROLE, aed, byId, today } from '../lib/config'
import { Icon, Pill, Expiry, FileLink, FileField, Thumbs } from './ui'

const COST_TABS = [['diesel', 'Diesel'], ['maintenance', 'Maintenance'], ['fine', 'Fines'], ['advance', 'Advances']]

export default function Detail({ table, id, data, user, actions, onClose }) {
  const ent = ENTITIES[table]
  const row = byId(data[table], id)
  const roleCfg = ROLES[user?.role] || ROLES[DEFAULT_ROLE]
  const money = roleCfg.money
  const canEdit = can(user.role, table)
  const isTruck = table === 'trucks'
  const [tab, setTab] = useState('overview')
  if (!row) return null

  const sum = (kind) => data.truck_costs.filter((c) => c.truck_id === id && c.kind === kind).reduce((a, c) => a + (c.amount || 0), 0)
  const trips = ent.fk ? data.trips.filter((t) => t[ent.fk] === id) : []
  const tabs = isTruck ? [['overview', 'Overview'], ['documents', 'Documents'], ...COST_TABS, ['trips', 'Trips']] : null

  const fields = ent.fields.filter((f) => (money || !f.money) && !['photos', 'image', 'file'].includes(f.type) && f.key !== 'status')
  const computed = colsOf(ent).filter((c) => {
    if (c.field) return false
    if (!money && c.money) return false
    if (c.k === 'drv' && !canView(user.role, 'drivers')) return false
    if (c.k === 'truck' && !canView(user.role, 'trucks')) return false
    if (c.k === 'trailer' && !canView(user.role, 'trailers')) return false
    return true
  })
  const files = ent.fields.filter((f) => f.type === 'file')
  const images = ent.fields.filter((f) => f.type === 'image')

  return (
    <div className="overlay drawer-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer">
        <header>
          <div>
            <div className="mut small">{ent.one}</div>
            <h2>{ent.label(row)} <Pill v={row.status} /></h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" /></button>
        </header>

        {isTruck && (
          <div className="stats">
            {money && <Stat label="Purchase price" v={aed(row.purchase_price)} />}
            <Stat label="Diesel" v={aed(sum('diesel'))} />
            <Stat label="Maintenance" v={aed(sum('maintenance'))} />
            <Stat label="Fines" v={aed(sum('fine'))} />
            <Stat label="Advances" v={aed(sum('advance'))} />
            <Stat label="Trips" v={trips.filter((t) => t.status !== 'Cancelled').length} />
          </div>
        )}

        {tabs && (
          <nav className="tabs">
            {tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
          </nav>
        )}

        <div className="drawer-body">
          {(!isTruck || tab === 'overview') && (
            <>
              {images.map((f) => row[f.key]?.url && <Thumbs key={f.key} items={[row[f.key]]} />)}
              <dl>
                {fields.map((f) => (
                  <div key={f.key}>
                    <dt>{f.label.replace(/ \(.*\)/, '')}</dt>
                    <dd>{f.expiry ? <Expiry date={row[f.key]} /> : f.type === 'money' ? aed(row[f.key]) : row[f.key] ?? '—'}{f.key === 'commission_pct' && row[f.key] != null ? '%' : ''}</dd>
                  </div>
                ))}
                {computed.map((c) => <div key={c.k}><dt>{c.label}</dt><dd>{cellText(c, row, data)}</dd></div>)}
                {!isTruck && files.map((f) => <div key={f.key}><dt>{f.label}</dt><dd><FileLink f={row[f.key]} /></dd></div>)}
              </dl>
              {isTruck && (
                <>
                  <h4>Photos</h4>
                  <FileField kind="photos" value={row.photos} disabled={!canEdit} onChange={(x) => actions.save(table, { id, photos: x })} />
                </>
              )}
            </>
          )}

          {isTruck && tab === 'documents' && (
            <div className="docs">
              {[['mulkiya', 'Mulkiya (registration)'], ['insurance', 'Insurance']].map(([k, label]) => (
                <div className="doc" key={k}>
                  <div><b>{label}</b><div className="mut small">Expiry</div><Expiry date={row[k + '_expiry']} /></div>
                  <FileField kind="file" value={row[k + '_file']} disabled={!canEdit} onChange={(x) => actions.save(table, { id, [k + '_file']: x })} />
                </div>
              ))}
              {canEdit && <p className="mut small">Change expiry dates with Edit on the list.</p>}
            </div>
          )}

          {isTruck && COST_TABS.some(([k]) => k === tab) && (
            <CostTab kind={tab} truckId={id} data={data} canEdit={can(user.role, 'truck_costs') && user.role !== 'Finance'} actions={actions} label={COST_TABS.find(([k]) => k === tab)[1]} />
          )}

          {(trips.length > 0 || (isTruck && tab === 'trips')) && (!isTruck || tab === 'trips') && (
            <>
              {!isTruck && <h4>Recent trips</h4>}
              <table className="mini">
                <thead><tr><th>Date</th><th>Route</th><th>Client</th>{money && <th className="num">Rate</th>}<th>Status</th></tr></thead>
                <tbody>
                  {trips.slice(0, isTruck ? 50 : 8).map((t) => (
                    <tr key={t.id}>
                      <td>{t.date}</td><td>{t.route}</td><td>{byId(data.clients, t.client_id)?.name}</td>
                      {money && <td className="num">{aed(t.rate)}</td>}<td><Pill v={t.status} /></td>
                    </tr>
                  ))}
                  {!trips.length && <tr><td colSpan="5" className="empty">No trips yet.</td></tr>}
                </tbody>
              </table>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

const Stat = ({ label, v }) => <div className="stat"><span>{label}</span><b>{v}</b></div>

function CostTab({ kind, truckId, data, canEdit, actions, label }) {
  const rows = data.truck_costs.filter((c) => c.truck_id === truckId && c.kind === kind).sort((a, b) => b.date.localeCompare(a.date))
  const [f, setF] = useState({ date: today(), amount: '', note: '' })
  const add = async (e) => {
    e.preventDefault()
    await actions.save('truck_costs', { truck_id: truckId, kind, date: f.date, amount: Number(f.amount), note: f.note })
    setF({ date: today(), amount: '', note: '' })
  }
  return (
    <>
      {canEdit && (
        <form className="costform" onSubmit={add}>
          <input aria-label="Date" type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <input aria-label="Amount" type="number" step="any" required placeholder="Amount (AED)" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <input aria-label="Note" placeholder="Note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <button className="btn primary sm"><Icon name="Plus" size={14} /> Add</button>
        </form>
      )}
      <table className="mini">
        <thead><tr><th>Date</th><th>Note</th><th className="num">Amount</th><th /></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.date}</td><td>{c.note || '—'}</td><td className="num">{aed(c.amount)}</td>
              <td className="act">{canEdit && <button className="icon-btn danger" aria-label="Delete" onClick={() => actions.remove('truck_costs', c.id)}><Icon name="Trash2" size={15} /></button>}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="4" className="empty">No {label.toLowerCase()} recorded.</td></tr>}
        </tbody>
        {rows.length > 0 && <tfoot><tr><td colSpan="2">Total</td><td className="num">{aed(rows.reduce((a, c) => a + c.amount, 0))}</td><td /></tr></tfoot>}
      </table>
    </>
  )
}
