import { useRef, useState } from 'react'
import * as L from 'lucide-react'
import { db } from '../lib/db'
import { daysTo, WARN_DAYS } from '../lib/config'

export const Icon = ({ name, size = 17 }) => {
  const C = L[name] || L.Circle
  return <C size={size} strokeWidth={1.8} />
}

const PILL = { Active: 'green', Delivered: 'green', 'In transit': 'blue', Scheduled: 'blue', Maintenance: 'amber', 'On leave': 'amber', Inactive: 'grey', Cancelled: 'grey' }
export const Pill = ({ v }) => (v ? <span className={'pill ' + (PILL[v] || 'grey')}>{v}</span> : <span className="mut">—</span>)

export function Expiry({ date }) {
  if (!date) return <span className="mut">—</span>
  const n = daysTo(date)
  const cls = n < 0 ? 'red' : n <= WARN_DAYS ? 'amber' : ''
  return (
    <span className="exp">
      <span>{date}</span>
      {cls && <em className={'pill ' + cls}>{n < 0 ? `Expired ${-n}d ago` : n === 0 ? 'Expires today' : `${n}d left`}</em>}
    </span>
  )
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-label={title}>
        <header>
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" /></button>
        </header>
        {children}
      </div>
    </div>
  )
}

export const FileLink = ({ f }) =>
  f?.url ? (
    <a className="link" href={f.url} download={f.name} target="_blank" rel="noreferrer">
      <Icon name="Paperclip" size={14} /> {f.name}
    </a>
  ) : (
    <span className="mut">—</span>
  )

export function Thumbs({ items, onRemove }) {
  const [big, setBig] = useState(null)
  return (
    <>
      <div className="thumbs">
        {items.map((p, i) => (
          <div className="thumb" key={i}>
            <img src={p.url} alt={p.name} onClick={() => setBig(p)} />
            {onRemove && <button type="button" aria-label="Remove" onClick={() => onRemove(i)}><Icon name="X" size={12} /></button>}
          </div>
        ))}
      </div>
      {big && (
        <div className="overlay lightbox" onClick={() => setBig(null)}>
          <img src={big.url} alt={big.name} />
        </div>
      )}
    </>
  )
}

// value: {name,url} | [{name,url}] ; kind: 'file' | 'image' | 'photos'
export function FileField({ value, onChange, kind = 'file', disabled }) {
  const ref = useRef()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const multi = kind === 'photos'
  const list = multi ? value || [] : value ? [value] : []
  const pick = async (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    if (!files.length) return
    setBusy(true); setErr('')
    try {
      const up = await Promise.all(files.map((f) => db.upload(f)))
      onChange(multi ? [...list, ...up] : up[0])
    } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  return (
    <div className="filefield">
      {kind !== 'file' && list.length > 0 && (
        <Thumbs items={list} onRemove={disabled ? null : (i) => onChange(multi ? list.filter((_, j) => j !== i) : null)} />
      )}
      {kind === 'file' && value && (
        <div className="filerow"><FileLink f={value} />{!disabled && <button type="button" className="icon-btn" aria-label="Remove file" onClick={() => onChange(null)}><Icon name="X" size={14} /></button>}</div>
      )}
      {!disabled && (
        <>
          <input ref={ref} type="file" hidden multiple={multi} accept={kind === 'file' ? 'image/*,application/pdf' : 'image/*'} onChange={pick} />
          <button type="button" className="btn ghost sm" disabled={busy} onClick={() => ref.current.click()}>
            <Icon name="Upload" size={14} /> {busy ? 'Uploading…' : multi ? 'Add photos' : value ? 'Replace' : kind === 'image' ? 'Upload photo' : 'Upload file'}
          </button>
        </>
      )}
      {err && <div className="err">{err}</div>}
    </div>
  )
}
