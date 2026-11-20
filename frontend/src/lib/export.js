import { today } from './config'

// In the hosted preview, direct downloads are blocked, so use the viewer's save hook when it exists.
async function save(filename, blob) {
  try {
    const dl = await window.claude?.use?.('downloads')
    if (dl) return await dl.save({ filename, data: blob })
  } catch (e) {
    if (e?.code === 'declined') return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

// head: string[]; rows: string[][]
export function exportCsv(name, head, rows) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = '﻿' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n')
  return save(`${name}-${today()}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
}

export async function exportPdf(name, title, head, rows) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  doc.setFontSize(15)
  doc.text(`SAQR Transport — ${title}`, 40, 42)
  doc.setFontSize(9)
  doc.setTextColor(110)
  doc.text(`${today()} · ${rows.length} records`, 40, 58)
  autoTable(doc, {
    head: [head], body: rows, startY: 72, theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 5 }, headStyles: { fillColor: [29, 63, 158] }, margin: { left: 40, right: 40 },
  })
  return save(`${name}-${today()}.pdf`, new Blob([doc.output('arraybuffer')], { type: 'application/pdf' }))
}
