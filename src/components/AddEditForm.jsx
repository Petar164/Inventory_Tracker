import { useState, useEffect, useRef, useCallback } from 'react'
import { blankItem, CATEGORIES, CONDITIONS, STATUSES, STATUS_LABELS } from '../App.jsx'
import api from '../lib/api.js'

const MEAS_FIELDS = [
  ['pitToPit','Pit to Pit'],    ['shoulders','Shoulders'],
  ['sleeveLength','Sleeve Len'],['bodyLength','Body Length'],
  ['hemWidth','Hem Width'],     ['neck','Neck'],
  ['chest','Chest'],            ['waist','Waist'],
  ['hips','Hips'],              ['frontRise','Front Rise'],
  ['backRise','Back Rise'],     ['inseam','Inseam'],
  ['thigh','Thigh'],            ['knee','Knee'],
  ['legOpening','Leg Opening'], ['outseam','Outseam'],
]

export default function AddEditForm({ item: editItem, onSave, onCancel }) {
  const [data, setData]         = useState(() => editItem ? { ...editItem, measurements: { ...editItem.measurements } } : blankItem())
  const [imgSrcs, setImgSrcs]   = useState({})
  const [newFiles, setNewFiles] = useState([])
  const [activeSection, setActiveSection] = useState('photos')

  const contentRef  = useRef(null)
  const sectionRefs = useRef({})
  const isEdit = !!editItem

  const sections = [
    { id: 'photos',       label: 'Photos' },
    { id: 'identity',     label: 'Identity' },
    { id: 'condition',    label: 'Condition' },
    { id: 'measurements', label: 'Measurements' },
    { id: 'pricing',      label: 'Pricing' },
    { id: 'status',       label: 'Status' },
    ...(data.status === 'sold' ? [{ id: 'sale', label: 'Sale' }] : []),
    { id: 'notes',        label: 'Notes' },
  ]

  useEffect(() => {
    const names = data.imageFileNames || []
    if (!names.length) return
    Promise.all(names.map(f => api.imagePath(f).then(src => [f, src])))
      .then(pairs => setImgSrcs(Object.fromEntries(pairs)))
  }, [])

  const set     = (field, val) => setData(d => ({ ...d, [field]: val }))
  const setMeas = (field, val) => setData(d => ({ ...d, measurements: { ...d.measurements, [field]: val } }))

  const scrollToSection = useCallback((id) => {
    setActiveSection(id)
    const el  = sectionRefs.current[id]
    const box = contentRef.current
    if (el && box) box.scrollTo({ top: el.offsetTop - 6, behavior: 'smooth' })
  }, [])

  const handleContentScroll = () => {
    const box = contentRef.current
    if (!box) return
    const scrollTop = box.scrollTop
    let best = sections[0].id, bestDist = Infinity
    sections.forEach(({ id }) => {
      const el = sectionRefs.current[id]
      if (!el) return
      const dist = Math.abs(el.offsetTop - scrollTop - 24)
      if (dist < bestDist) { bestDist = dist; best = id }
    })
    setActiveSection(best)
  }

  const handleKeyDown = (e) => {
    if (e.target.tagName === 'TEXTAREA') return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const idx = sections.findIndex(s => s.id === activeSection)
      if (idx < sections.length - 1) scrollToSection(sections[idx + 1].id)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = sections.findIndex(s => s.id === activeSection)
      if (idx > 0) scrollToSection(sections[idx - 1].id)
    }
  }

  const addPhotos = async () => {
    const filenames = await api.selectImages()
    if (!filenames.length) return
    const newSrcs = {}
    for (const f of filenames) newSrcs[f] = await api.imagePath(f)
    setImgSrcs(s => ({ ...s, ...newSrcs }))
    setNewFiles(f => [...f, ...filenames])
    setData(d => ({ ...d, imageFileNames: [...(d.imageFileNames || []), ...filenames] }))
  }

  const removePhoto = (filename) => {
    api.deleteImage(filename)
    setImgSrcs(s => { const n = { ...s }; delete n[filename]; return n })
    setNewFiles(f => f.filter(x => x !== filename))
    setData(d => ({ ...d, imageFileNames: d.imageFileNames.filter(f => f !== filename) }))
  }

  const handleCancel = () => {
    if (!isEdit) newFiles.forEach(f => api.deleteImage(f))
    onCancel()
  }

  const handleSave = () => {
    const item = {
      ...data,
      purchasePrice: parseFloat(data.purchasePrice) || 0,
      askingPrice:   parseFloat(data.askingPrice)   || 0,
      salePrice:     data.status === 'sold' ? (parseFloat(data.salePrice) || 0) : null,
      listedDate:    data.listedDate  || null,
      saleDate:      data.status === 'sold' ? data.saleDate      : null,
      salePlatform:  data.status === 'sold' ? data.salePlatform  : '',
    }
    if (!isEdit) item.dateAdded = new Date().toISOString()
    onSave(item)
  }

  const canSave = data.brand.trim() || data.name.trim()

  const sec = (id, el) => { sectionRefs.current[id] = el }

  return (
    <div className="modal-overlay form-overlay" onClick={handleCancel}>
      <div className="form-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>

        <div className="form-header">
          <button className="form-cancel-btn" onClick={handleCancel}>Cancel</button>
          <div className="form-title">{isEdit ? '† Edit Item' : '† New Item'}</div>
          <button className="form-save-btn" onClick={handleSave} disabled={!canSave}>
            {isEdit ? 'Save' : 'Add'}
          </button>
        </div>

        <div className="form-body">

          {/* ── Section navigator ── */}
          <nav className="form-nav">
            {sections.map((s, i) => (
              <button
                key={s.id}
                className={`form-nav-item${activeSection === s.id ? ' active' : ''}`}
                onClick={() => scrollToSection(s.id)}
              >
                <span className="form-nav-num">{String(i + 1).padStart(2, '0')}</span>
                {s.label}
              </button>
            ))}
            <div style={{ marginTop: 'auto', padding: '16px 16px 4px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--serif)', fontSize:'7px', letterSpacing:'0.3em', color:'var(--text-4)', textTransform:'uppercase' }}>
                ↑↓ to navigate
              </div>
            </div>
          </nav>

          {/* ── Scrollable content ── */}
          <div className="form-scroll" ref={contentRef} onScroll={handleContentScroll}>

            {/* Photos */}
            <div ref={el => sec('photos', el)}>
              <FormSection title="Photos">
                <div className="image-strip">
                  {(data.imageFileNames || []).map((f, i) => (
                    <div key={f} className={`image-thumb-wrap${i === 0 ? ' cover' : ''}`}>
                      <img src={imgSrcs[f]} alt="" />
                      {i === 0 && <div className="cover-label">COVER</div>}
                      <button className="thumb-remove" onClick={() => removePhoto(f)}>✕</button>
                    </div>
                  ))}
                  <button className="add-photo-btn" onClick={addPhotos}>
                    <span className="add-photo-icon">+</span>Add
                  </button>
                </div>
              </FormSection>
            </div>

            {/* Identity */}
            <div ref={el => sec('identity', el)}>
              <FormSection title="Identity">
                <Row label="Brand">
                  <Input value={data.brand} onChange={v => set('brand', v)} placeholder="e.g. Helmut Lang" />
                </Row>
                <Row label="Item Name">
                  <Input value={data.name} onChange={v => set('name', v)} placeholder="e.g. Astro Biker Jacket" />
                </Row>
                <Row label="Designer">
                  <Input value={data.designer} onChange={v => set('designer', v)} placeholder="If different from brand" />
                </Row>
                <Row label="Category">
                  <div className="category-pills">
                    {CATEGORIES.map(c => (
                      <button key={c} className={`cat-pill${data.category === c ? ' active' : ''}`} onClick={() => set('category', c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </Row>
                <Row label="Era">
                  <Input value={data.era} onChange={v => set('era', v)} placeholder="SS2003 · FW1999 · 1990s" />
                </Row>
                <Row label="Collection">
                  <Input value={data.collection} onChange={v => set('collection', v)} placeholder="Season / runway name" />
                </Row>
                <Row label="Colorway">
                  <Input value={data.colorway} onChange={v => set('colorway', v)} />
                </Row>
                <Row label="Materials">
                  <Input value={data.materials} onChange={v => set('materials', v)} placeholder="e.g. 100% Virgin Wool" />
                </Row>
                <Row label="Country">
                  <Input value={data.countryOfOrigin} onChange={v => set('countryOfOrigin', v)} />
                </Row>
              </FormSection>
            </div>

            {/* Condition */}
            <div ref={el => sec('condition', el)}>
              <FormSection title="Condition">
                <Row label="Grade">
                  <Select value={data.condition} onChange={v => set('condition', v)} options={CONDITIONS.map(c => ({ value: c, label: c }))} />
                </Row>
                <Row label="Notes">
                  <textarea className="form-control textarea" value={data.conditionNotes} onChange={e => set('conditionNotes', e.target.value)} placeholder="Flaws, fading, repairs…" />
                </Row>
              </FormSection>
            </div>

            {/* Measurements */}
            <div ref={el => sec('measurements', el)}>
              <FormSection title="Size & Measurements">
                <Row label="Tagged Size">
                  <Input value={data.taggedSize} onChange={v => set('taggedSize', v)} placeholder="M · 48 · One Size" />
                </Row>
                <Row label="Unit" style={{ marginBottom: 12 }}>
                  <div className="form-seg">
                    {['in', 'cm'].map(u => (
                      <button key={u} className={`form-seg-btn${data.measurements.unit === u ? ' active' : ''}`} onClick={() => setMeas('unit', u)}>{u}</button>
                    ))}
                  </div>
                </Row>
                <div className="meas-2col">
                  {MEAS_FIELDS.map(([field, label]) => (
                    <div key={field} className="meas-2col-cell">
                      <span className="meas-2col-label">{label}</span>
                      <input className="form-control" value={data.measurements[field] || ''} onChange={e => setMeas(field, e.target.value)} placeholder="—" />
                      <span className="meas-2col-unit">{data.measurements.unit}</span>
                    </div>
                  ))}
                </div>
                <Row label="Notes">
                  <Input value={data.measurements.notes} onChange={v => setMeas('notes', v)} placeholder="Additional notes…" />
                </Row>
              </FormSection>
            </div>

            {/* Pricing */}
            <div ref={el => sec('pricing', el)}>
              <FormSection title="Pricing">
                <Row label="Price Paid">
                  <PriceInput value={data.purchasePrice} onChange={v => set('purchasePrice', v)} />
                </Row>
                <Row label="Purchase Date">
                  <Input value={data.purchaseDate} onChange={v => set('purchaseDate', v)} type="date" />
                </Row>
                <Row label="Source">
                  <Input value={data.purchaseSource} onChange={v => set('purchaseSource', v)} placeholder="Store, auction, seller…" />
                </Row>
                <Row label="Asking Price">
                  <PriceInput value={data.askingPrice} onChange={v => set('askingPrice', v)} />
                </Row>
              </FormSection>
            </div>

            {/* Status */}
            <div ref={el => sec('status', el)}>
              <FormSection title="Status & Listing">
                <div className="status-picker">
                  {STATUSES.map(s => (
                    <button key={s} className={`status-pick-btn status-pick-${s}${data.status === s ? ' active' : ''}`} onClick={() => set('status', s)}>
                      <span className="status-pick-dot" />
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
                <Row label="Platforms">
                  <Input value={data.listedPlatforms} onChange={v => set('listedPlatforms', v)} placeholder="Grailed, Depop, eBay…" />
                </Row>
                <Row label="Listed Date">
                  <Input value={data.listedDate || ''} onChange={v => set('listedDate', v)} type="date" />
                </Row>
              </FormSection>
            </div>

            {/* Sale (conditional) */}
            {data.status === 'sold' && (
              <div ref={el => sec('sale', el)}>
                <FormSection title="Sale">
                  <Row label="Sale Price">
                    <PriceInput value={data.salePrice ?? ''} onChange={v => set('salePrice', v)} />
                  </Row>
                  <Row label="Sale Date">
                    <Input value={data.saleDate || ''} onChange={v => set('saleDate', v)} type="date" />
                  </Row>
                  <Row label="Sold On">
                    <Input value={data.salePlatform} onChange={v => set('salePlatform', v)} placeholder="Grailed, Depop…" />
                  </Row>
                </FormSection>
              </div>
            )}

            {/* Notes */}
            <div ref={el => sec('notes', el)}>
              <FormSection title="Notes">
                <textarea className="form-control textarea" value={data.notes} onChange={e => set('notes', e.target.value)} placeholder="Anything else worth noting…" rows={4} />
              </FormSection>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function FormSection({ title, children }) {
  return (
    <div className="form-section">
      <div className="form-section-title">{title}</div>
      {children}
    </div>
  )
}

function Row({ label, children, style }) {
  return (
    <div className="form-row" style={style}>
      <div className="form-label">{label}</div>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      className="form-control"
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

function Select({ value, onChange, options }) {
  return (
    <select className="form-control form-select" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function PriceInput({ value, onChange }) {
  return (
    <div className="price-input-wrap">
      <span className="price-prefix">$</span>
      <input
        className="form-control"
        type="number"
        min="0"
        step="1"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
      />
    </div>
  )
}
