import { useState } from 'react'
import { can, byId } from '../lib/config'
import { Icon, Pill } from './ui'

export default function FleetLink({ data, user, actions }) {
  const canEdit = can(user.role, 'fleet_links')
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const links = data.fleet_links
  const linkOf = (truckId) => links.find((l) => l.truck_id === truckId)

  // a driver / trailer can only be on one truck at a time
  const takenBy = (key, id, truckId) => links.some((l) => l[key] === id && l.truck_id !== truckId)

  const change = async (truck, key, value) => {
    setErr('')
    const cur = linkOf(truck.id)
    const next = { truck_id: truck.id, driver_id: cur?.driver_id || null, trailer_id: cur?.trailer_id || null, [key]: value || null }
    try {
      if (cur && !next.driver_id && !next.trailer_id) await actions.remove('fleet_links', cur.id)
      else await actions.save('fleet_links', cur ? { ...next, id: cur.id } : next)
    } catch (e) { setErr(e.message) }
  }

  const trucks = data.trucks.filter((t) => t.status !== 'Inactive' && (!q || (t.plate + t.make + t.model).toLowerCase().includes(q.toLowerCase())))
  const freeDrivers = data.drivers.filter((d) => d.status === 'Active' && !links.some((l) => l.driver_id === d.id)).length
  const freeTrailers = data.trailers.filter((t) => t.status === 'Active' && !links.some((l) => l.trailer_id === t.id)).length
  const full = links.filter((l) => l.driver_id && l.trailer_id).length

  return (
    <>
      <div className="page-head">
        <div><h1>Fleet Link</h1><p className="mut">Pair each truck with a driver and a trailer.</p></div>
      </div>
      <div className="stats flat">
        <div className="stat"><span>Trucks fully paired</span><b>{full} / {data.trucks.filter((t) => t.status !== 'Inactive').length}</b></div>
        <div className="stat"><span>Drivers without a truck</span><b>{freeDrivers}</b></div>
        <div className="stat"><span>Trailers unassigned</span><b>{freeTrailers}</b></div>
      </div>
      <div className="toolbar">
        <div className="search"><Icon name="Search" size={16} /><input aria-label="Search trucks" placeholder="Search trucks…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {!canEdit && <span className="mut small">Your role can view pairings but not change them.</span>}
      </div>
      {err && <div className="err">{err}</div>}
      <div className="board">
        {trucks.map((t) => {
          const l = linkOf(t.id)
          const drv = byId(data.drivers, l?.driver_id)
          return (
            <div className="pair" key={t.id}>
              <div className="pair-truck">
                <Icon name="Truck" size={20} />
                <div><b>{t.plate}</b><div className="mut small">{[t.make, t.model].filter(Boolean).join(' ')}</div></div>
                <Pill v={t.status} />
              </div>
              <div className="pair-sel">
                <label>Driver
                  <select disabled={!canEdit} value={l?.driver_id || ''} onChange={(e) => change(t, 'driver_id', e.target.value)}>
                    <option value="">Unassigned</option>
                    {data.drivers.filter((d) => d.status !== 'Inactive').map((d) => (
                      <option key={d.id} value={d.id} disabled={takenBy('driver_id', d.id, t.id)}>
                        {d.name}{takenBy('driver_id', d.id, t.id) ? ` (on ${byId(data.trucks, links.find((x) => x.driver_id === d.id)?.truck_id)?.plate})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label>Trailer
                  <select disabled={!canEdit} value={l?.trailer_id || ''} onChange={(e) => change(t, 'trailer_id', e.target.value)}>
                    <option value="">Unassigned</option>
                    {data.trailers.filter((x) => x.status !== 'Inactive').map((x) => (
                      <option key={x.id} value={x.id} disabled={takenBy('trailer_id', x.id, t.id)}>
                        {x.number} · {x.type}{takenBy('trailer_id', x.id, t.id) ? ` (on ${byId(data.trucks, links.find((y) => y.trailer_id === x.id)?.truck_id)?.plate})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {drv?.status === 'On leave' && <div className="note"><Icon name="TriangleAlert" size={14} /> {drv.name} is on leave</div>}
            </div>
          )
        })}
        {!trucks.length && <div className="empty">No trucks found.</div>}
      </div>
    </>
  )
}
