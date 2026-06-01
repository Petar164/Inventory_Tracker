import { useState, useEffect } from 'react'
import { CATEGORIES, CONDITIONS, STATUSES, STATUS_LABELS } from '../App.jsx'
import api from '../lib/api.js'

const MEAS_FIELDS = [
  ['pitToPit','P2P'],        ['shoulders','Shoulders'],
  ['sleeveLength','Sleeve'], ['bodyLength','Length'],
  ['hemWidth','Hem Width'],  ['neck','Neck'],
  ['chest','Chest'],         ['waist','Waist'],
  ['hips','Hips'],           ['frontRise','Front Rise'],
  ['backRise','Back Rise'],  ['inseam','Inseam'],
  ['thigh','Thigh'],         ['knee','Knee'],
  ['legOpening','Leg Open'], ['outseam','Outseam'],
]

export default function ItemDetail({ item, onClose, onDelete, onUpdate }) {
  const [draft, setDraft]     = useState(item)
  const [imgSrcs, setImgSrcs] = useState([])
  const [imgIdx,  setImgIdx]  = useState(0)

  useEffect(() => {
    setDraft(item)
    setImgIdx(0)
    if (!item.imageFileNames?.length) { setImgSrcs([]); return }
    Promise.all(item.imageFileNames.map(f => api.imagePath(f))).then(setImgSrcs)
  }, [item.id])

  const commit = (changes) => {
    const next = { ...draft, ...changes }
    setDraft(next)
    onUpdate(next)
  }

  const commitMeas = (field, val) => {
    const next = { ...draft, measurements: { ...draft.measurements, [field]: val } }
    setDraft(next)
    onUpdate(next)
  }

  const addPhotos = async () => {
    const filenames = await api.selectImages()
    if (!filenames.length) return
    const newFileNames = [...(draft.imageFileNames || []), ...filenames]
    const newSrcs = await Promise.all(filenames.map(f => api.imagePath(f)))
    setImgSrcs(s => [...s, ...newSrcs])
    commit({ imageFileNames: newFileNames })
  }

  const removePhoto = async (idx) => {
    const filename = draft.imageFileNames[idx]
    await api.deleteImage(filename)
    const newFileNames = draft.imageFileNames.filter((_, i) => i !== idx)
    setImgSrcs(s => s.filter((_, i) => i !== idx))
    setImgIdx(i => Math.min(i, Math.max(0, newFileNames.length - 1)))
    commit({ imageFileNames: newFileNames })
  }

  const pot = (+draft.askingPrice || 0) - (+draft.purchasePrice || 0)
  const profit = draft.salePrice != null ? (+draft.salePrice || 0) - (+draft.purchasePrice || 0) : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={e => e.stopPropagation()}>

        {/* ── Image column ── */}
        <div className="detail-image-col">
          <div className="detail-main-image">
            {imgSrcs.length > 0
              ? <img src={imgSrcs[imgIdx]} alt="" />
              : <div className="detail-no-photo" onClick={addPhotos}>
                  <div className="detail-no-photo-icon">+</div>
                  <div className="detail-no-photo-label">Add Photos</div>
                </div>
            }
          </div>
          <div className="detail-thumb-strip">
            {imgSrcs.map((src, i) => (
              <div key={i} className="detail-thumb-wrap">
                <img src={src} className={`detail-thumb${imgIdx === i ? ' active' : ''}`} onClick={() => setImgIdx(i)} alt="" />
                <button className="detail-thumb-remove" onClick={() => removePhoto(i)}>✕</button>
              </div>
            ))}
            <button className="detail-add-photo-btn" onClick={addPhotos}>+</button>
          </div>
        </div>

        {/* ── Info column ── */}
        <div className="detail-info-col">
          <div className="detail-toolbar">
            <button className="detail-close-btn" onClick={onClose}>✕ Close</button>
            <div style={{ fontSize: 9, fontFamily: 'var(--serif)', letterSpacing: '0.3em', color: 'var(--text-4)', textTransform: 'uppercase' }}>
              Click any field to edit
            </div>
            <button className="detail-del-btn" onClick={() => onDelete(draft.id)}>Delete</button>
          </div>

          <div className="detail-body">

            {/* ── Header ── */}
            <div>
              <input
                className="di-brand"
                value={draft.brand}
                onChange={e => commit({ brand: e.target.value })}
                placeholder="Brand"
              />
              <input
                className="di-name"
                value={draft.name}
                onChange={e => commit({ name: e.target.value })}
                placeholder="Item name"
              />
              <input
                className="di-designer"
                value={draft.designer}
                onChange={e => commit({ designer: e.target.value })}
                placeholder="Designer"
              />

              {/* Status */}
              <div className="di-status-row">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    className={`di-status-btn di-status-${s}${draft.status === s ? ' active' : ''}`}
                    onClick={() => commit({ status: s })}
                  >
                    <span className="di-status-dot" />{STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Identity ── */}
            <div className="detail-section">
              <SL>Identity</SL>
              <div className="di-grid">
                <Row label="Category">
                  <select className="di-select" value={draft.category} onChange={e => commit({ category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Row>
                <Row label="Era"><DI value={draft.era} onChange={v => commit({ era: v })} placeholder="e.g. SS 2002" /></Row>
                <Row label="Collection"><DI value={draft.collection} onChange={v => commit({ collection: v })} placeholder="—" /></Row>
                <Row label="Colorway"><DI value={draft.colorway} onChange={v => commit({ colorway: v })} placeholder="—" /></Row>
                <Row label="Materials"><DI value={draft.materials} onChange={v => commit({ materials: v })} placeholder="—" /></Row>
                <Row label="Country"><DI value={draft.countryOfOrigin} onChange={v => commit({ countryOfOrigin: v })} placeholder="—" /></Row>
                <Row label="Tagged Size"><DI value={draft.taggedSize} onChange={v => commit({ taggedSize: v })} placeholder="—" /></Row>
              </div>
            </div>

            {/* ── Pricing ── */}
            <div className="detail-section">
              <SL>Pricing</SL>
              <div className="price-grid">
                <div className="price-cell">
                  <div className="price-cell-label">Paid</div>
                  <DI value={draft.purchasePrice} onChange={v => commit({ purchasePrice: v })} type="number" className="price-cell-val" style={{ color: 'var(--text-2)' }} />
                </div>
                <div className="price-cell">
                  <div className="price-cell-label">Asking</div>
                  <DI value={draft.askingPrice} onChange={v => commit({ askingPrice: v })} type="number" className="price-cell-val" style={{ color: 'var(--text)' }} />
                </div>
                <div className="price-cell">
                  {draft.status === 'sold' ? (
                    <>
                      <div className="price-cell-label">Sold For</div>
                      <DI value={draft.salePrice ?? ''} onChange={v => commit({ salePrice: v })} type="number" className="price-cell-val" style={{ color: profit >= 0 ? 'var(--profit)' : 'var(--loss)' }} />
                      {profit != null && <div className="price-cell-sub">{(profit >= 0 ? '+' : '') + '$' + Math.abs(profit).toLocaleString()} {profit >= 0 ? 'profit' : 'loss'}</div>}
                    </>
                  ) : (
                    <>
                      <div className="price-cell-label">Potential</div>
                      <div className="price-cell-val" style={{ color: pot >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                        {(pot >= 0 ? '+' : '') + '$' + Math.abs(pot).toLocaleString()}
                      </div>
                      <div className="price-cell-sub">if sold at asking</div>
                    </>
                  )}
                </div>
              </div>
              <div className="di-grid" style={{ marginTop: 10 }}>
                <Row label="Purchase Date"><DI value={draft.purchaseDate || ''} onChange={v => commit({ purchaseDate: v })} type="date" /></Row>
                <Row label="Source"><DI value={draft.purchaseSource} onChange={v => commit({ purchaseSource: v })} placeholder="—" /></Row>
              </div>
            </div>

            {/* ── Condition ── */}
            <div className="detail-section">
              <SL>Condition</SL>
              <div className="di-grid">
                <Row label="Grade">
                  <select className="di-select" value={draft.condition} onChange={e => commit({ condition: e.target.value })}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Row>
              </div>
              <textarea
                className="di-textarea"
                value={draft.conditionNotes}
                onChange={e => commit({ conditionNotes: e.target.value })}
                placeholder="Condition notes — flaws, fading, repairs…"
                rows={2}
              />
            </div>

            {/* ── Measurements ── */}
            <div className="detail-section">
              <SL>
                Measurements
                <button
                  className="di-unit-toggle"
                  onClick={() => commitMeas('unit', draft.measurements?.unit === 'cm' ? 'in' : 'cm')}
                >
                  {draft.measurements?.unit || 'in'}
                </button>
              </SL>
              <div className="meas-grid">
                {MEAS_FIELDS.map(([field, label]) => (
                  <div key={field} className="meas-cell">
                    <div className="meas-cell-label">{label}</div>
                    <input
                      className="meas-cell-val di-meas-input"
                      value={draft.measurements?.[field] || ''}
                      onChange={e => commitMeas(field, e.target.value)}
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>
              <textarea
                className="di-textarea"
                style={{ marginTop: 6 }}
                value={draft.measurements?.notes || ''}
                onChange={e => commitMeas('notes', e.target.value)}
                placeholder="Measurement notes…"
                rows={1}
              />
            </div>

            {/* ── Listing ── */}
            <div className="detail-section">
              <SL>Listing</SL>
              <div className="di-grid">
                <Row label="Platforms"><DI value={draft.listedPlatforms} onChange={v => commit({ listedPlatforms: v })} placeholder="Grailed, Depop…" /></Row>
                <Row label="Listed Date"><DI value={draft.listedDate || ''} onChange={v => commit({ listedDate: v })} type="date" /></Row>
              </div>
            </div>

            {/* ── Sale ── */}
            {draft.status === 'sold' && (
              <div className="detail-section">
                <SL>Sale</SL>
                <div className="di-grid">
                  <Row label="Sale Date"><DI value={draft.saleDate || ''} onChange={v => commit({ saleDate: v })} type="date" /></Row>
                  <Row label="Platform"><DI value={draft.salePlatform} onChange={v => commit({ salePlatform: v })} placeholder="—" /></Row>
                </div>
              </div>
            )}

            {/* ── Notes ── */}
            <div className="detail-section">
              <SL>Notes</SL>
              <textarea
                className="di-textarea"
                value={draft.notes}
                onChange={e => commit({ notes: e.target.value })}
                placeholder="Anything worth noting…"
                rows={3}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SL({ children }) {
  return <div className="detail-section-label" style={{ display:'flex', alignItems:'center', gap:8 }}>{children}</div>
}

function Row({ label, children }) {
  return (
    <div className="di-row">
      <div className="di-label">{label}</div>
      {children}
    </div>
  )
}

function DI({ value, onChange, placeholder, type = 'text', className, style }) {
  return (
    <input
      className={`di-input${className ? ' ' + className : ''}`}
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={style}
    />
  )
}
