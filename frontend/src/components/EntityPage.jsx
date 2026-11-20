import { useMemo, useState } from 'react'
import { ENTITIES, colsOf, cellText, expiryAlerts, can, ROLES, DEFAULT_ROLE } from '../lib/config'
import { exportCsv, exportPdf } from '../lib/export'
import { Icon, Pill, Expiry, Modal, FileField } from './ui'
import Detail from './Detail'

export default function EntityPage({ table, data, user, actions }) {
  const ent = ENTITIES[table]
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [extra, setExtra] = useState('')
  const [expOnly, setExpOnly] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [form, setForm] = useState(null) // {row}
  const [viewId, setViewId] = useState(null)
  const [del, setDel] = useState(null)

  const money = (ROLES[user?.role] || ROLES[DEFAULT_ROLE]).money
  const canEdit = can(user.role, table)
  const canDel = can(user.role, table, 'del')
  const cols = useMemo(() => colsOf(ent).filter((c) => money || !c.money), [ent, money])
  const hasExpiry = ent.fields.some((f) => f.expiry)
  const all = data[table]
  const alerts = hasExpiry ? expiryAlerts(ent, all) : []
  const alertIds = new Set(alerts.map((a) => a.id))

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter((r) =>
      (!status || r.status === status) &&
      (!extra || r[ent.extra.key] === extra) &&
      (!expOnly || alertIds.has(r.id)) &&
      (!s || cols.some((c) => cellText(c, r, data).toLowerCase().includes(s)))
    )
  }, [all, q, status, extra, expOnly, cols, data])

  const exportData = () => [cols.map((c) => c.label), rows.map((r) => cols.map((c) => cellText(c, r, data)))]
  const doCsv = () => exportCsv(table, ...exportData())
  const doPdf = () => exportPdf(table, ent.title, ...exportData())

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{ent.title}</h1>
          <p className="mut">{all.length} records{rows.length !== all.length && ` · ${rows.length} shown`}</p>
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={doCsv}><Icon name="FileSpreadsheet" size={16} /> Excel</button>
          <button className="btn ghost" onClick={doPdf}><Icon name="FileDown" size={16} /> PDF</button>
          {canEdit && <button className="btn primary" onClick={() => setForm({ row: null })}><Icon name="Plus" size={16} /> Add {ent.one.toLowerCase()}</button>}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="alert">
          <button onClick={() => setShowAlerts(!showAlerts)}>
            <Icon name="TriangleAlert" size={17} />
            <b>{alerts.filter((a) => a.days < 0).length} expired</b> and <b>{alerts.filter((a) => a.days >= 0).length} expiring within 45 days</b>
            <span className="mut">{showAlerts ? 'Hide' : 'Show'}</span>
          </button>
          {showAlerts && (
            <ul>
              {alerts.map((a, i) => (
                <li key={i}>
                  <span className={'dot ' + (a.days < 0 ? 'red' : 'amber')} />
                  <b>{a.who}</b> · {a.doc} {a.days < 0 ? `expired ${-a.days} days ago` : `expires in ${a.days} days`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="toolbar">
        <div className="search">
          <Icon name="Search" size={16} />
          <input aria-label="Search" placeholder={`Search ${ent.title.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {ent.statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
        {ent.extra && (
          <select aria-label={ent.extra.label} value={extra} onChange={(e) => setExtra(e.target.value)}>
            <option value="">{ent.extra.label}</option>
            {ent.extra.options.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        {hasExpiry && (
          <label className="check"><input type="checkbox" checked={expOnly} onChange={(e) => setExpOnly(e.target.checked)} /> Expiring / expired only</label>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map((c) => <th key={c.k} className={c.num ? 'num' : ''}>{c.label}</th>)}
              <th className="act" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {cols.map((c) => (
                  <td key={c.k} className={(c.num ? 'num ' : '') + (c.strong ? 'strong' : '')}>
                    {c.field?.expiry ? <Expiry date={r[c.k]} /> : c.k === 'status' ? <Pill v={r.status} /> : cellText(c, r, data)}
                  </td>
                ))}
                <td className="act">
                  <button className="icon-btn" title="View" aria-label="View" onClick={() => setViewId(r.id)}><Icon name="Eye" size={16} /></button>
                  {canEdit && <button className="icon-btn" title="Edit" aria-label="Edit" onClick={() => setForm({ row: r })}><Icon name="Pencil" size={16} /></button>}
                  {canDel && <button className="icon-btn danger" title="Delete" aria-label="Delete" onClick={() => setDel(r)}><Icon name="Trash2" size={16} /></button>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={cols.length + 1} className="empty">No {ent.title.toLowerCase()} match your filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {viewId && <Detail table={table} id={viewId} data={data} user={user} actions={actions} onClose={() => setViewId(null)} />}
      {form && <Form ent={ent} table={table} row={form.row} money={money} onClose={() => setForm(null)} onSave={actions.save} />}
      {del && (
        <Modal title={`Delete ${ent.one.toLowerCase()}?`} onClose={() => setDel(null)}>
          <div className="modal-body">
            <p><b>{ent.label(del)}</b> will be removed permanently.</p>
            <footer>
              <button className="btn ghost" onClick={() => setDel(null)}>Cancel</button>
              <button className="btn danger" onClick={async () => { await actions.remove(table, del.id); setDel(null) }}>Delete</button>
            </footer>
          </div>
        </Modal>
      )}
    </>
  )
}

function Form({ ent, table, row, money, onClose, onSave }) {
  const fields = ent.fields.filter((f) => money || !f.money)
  const [v, setV] = useState(() => row || { status: ent.statuses[0] })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }))

  const submit = async (e) => {
    e.preventDefault()
    const out = {}
    fields.forEach((f) => {
      let x = v[f.key]
      if (f.type === 'number' || f.type === 'money') x = x === '' || x == null ? null : Number(x)
      else if (f.type === 'date') x = x || null
      else if (f.type === 'photos') x = x || []
      out[f.key] = x === undefined ? null : x
    })
    if (row) out.id = row.id
    setBusy(true); setErr('')
    try { await onSave(table, out); onClose() } catch (x) { setErr(x.message); setBusy(false) }
  }

  return (
    <Modal title={`${row ? 'Edit' : 'Add'} ${ent.one.toLowerCase()}`} onClose={onClose} wide>
      <form className="modal-body" onSubmit={submit}>
        <div className="grid2">
          {fields.map((f) => (
            <div key={f.key} className={'field' + (['photos', 'file', 'image'].includes(f.type) ? ' full' : '')}>
              <label htmlFor={'f-' + f.key}>{f.label}{f.req && ' *'}</label>
              {f.type === 'select' ? (
                <select id={'f-' + f.key} required={!!f.req} value={v[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                  {!f.req && <option value="">—</option>}
                  {f.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : ['file', 'image', 'photos'].includes(f.type) ? (
                <FileField kind={f.type} value={v[f.key]} onChange={(x) => set(f.key, x)} />
              ) : (
                <input id={'f-' + f.key} required={!!f.req} step={f.step || (f.type === 'money' ? 'any' : undefined)}
                  type={f.type === 'money' ? 'number' : f.type || 'text'} value={v[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        {err && <div className="err">{err}</div>}
        <footer>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </footer>
      </form>
    </Modal>
  )
}
