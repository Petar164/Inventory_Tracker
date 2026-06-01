import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ProductGrid from './components/ProductGrid.jsx'
import ItemDetail from './components/ItemDetail.jsx'
import AddEditForm from './components/AddEditForm.jsx'
import api from './lib/api.js'

export const CATEGORIES = [
  'Jacket','Coat','Blazer','Vest','Shirt','T-Shirt','Sweater','Knitwear',
  'Pants','Jeans','Shorts','Dress','Skirt','Footwear','Bag','Accessories','Other',
]

export const CONDITIONS = ['Deadstock / NWT','Mint','Excellent','Very Good','Good','Fair','Poor']
export const STATUSES   = ['available','listed','onHold','sold']
export const STATUS_LABELS = { available:'Available', listed:'Listed', onHold:'On Hold', sold:'Sold' }

export const SORT_OPTIONS = [
  { key:'newest',  label:'Newest First' },
  { key:'oldest',  label:'Oldest First' },
  { key:'brandAZ', label:'Brand A–Z' },
  { key:'askHigh', label:'Asking ↓' },
  { key:'askLow',  label:'Asking ↑' },
  { key:'costHigh',label:'Cost ↓' },
  { key:'costLow', label:'Cost ↑' },
]

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now()
}

export function blankItem() {
  return {
    id: makeId(),
    brand:'', name:'', designer:'', category:'Other',
    era:'', collection:'', colorway:'', materials:'', countryOfOrigin:'',
    condition:'Good', conditionNotes:'',
    taggedSize:'',
    measurements:{
      unit:'in', pitToPit:'', shoulders:'', sleeveLength:'',
      bodyLength:'', hemWidth:'', neck:'', chest:'',
      waist:'', hips:'', frontRise:'', backRise:'',
      inseam:'', thigh:'', knee:'', legOpening:'', outseam:'',
      notes:'',
    },
    purchasePrice:0, purchaseDate: new Date().toISOString().slice(0,10),
    purchaseSource:'', askingPrice:0,
    status:'available', listedPlatforms:'', listedDate:'',
    salePrice:null, saleDate:'', salePlatform:'',
    notes:'', imageFileNames:[], dateAdded: new Date().toISOString(),
  }
}

function sortItems(items, sort) {
  const arr = [...items]
  switch (sort) {
    case 'newest':   return arr.sort((a,b) => b.dateAdded.localeCompare(a.dateAdded))
    case 'oldest':   return arr.sort((a,b) => a.dateAdded.localeCompare(b.dateAdded))
    case 'brandAZ':  return arr.sort((a,b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()))
    case 'askHigh':  return arr.sort((a,b) => b.askingPrice - a.askingPrice)
    case 'askLow':   return arr.sort((a,b) => a.askingPrice - b.askingPrice)
    case 'costHigh': return arr.sort((a,b) => b.purchasePrice - a.purchasePrice)
    case 'costLow':  return arr.sort((a,b) => a.purchasePrice - b.purchasePrice)
    default: return arr
  }
}

export default function App() {
  const [items,    setItems]    = useState([])
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [sort,     setSort]     = useState('newest')
  const [detail,   setDetail]   = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [showAdd,  setShowAdd]  = useState(false)
  const [confirm,  setConfirm]  = useState(null) // { message, onConfirm }

  // Load on mount
  useEffect(() => {
    api.loadInventory().then(data => setItems(data || []))
  }, [])

  // Save whenever items change
  const save = useCallback((newItems) => {
    setItems(newItems)
    api.saveInventory(newItems)
  }, [])

  const addItem = (item) => save([item, ...items])

  const updateItem = (item) => save(items.map(i => i.id === item.id ? item : i))

  const deleteItem = (id) => {
    const item = items.find(i => i.id === id)
    if (item) item.imageFileNames.forEach(f => api.deleteImage(f))
    save(items.filter(i => i.id !== id))
    setDetail(null)
  }

  const confirmDelete = (id) => {
    const item = items.find(i => i.id === id)
    setConfirm({
      message: `Delete "${item?.brand || item?.name || 'this item'}" from your inventory?`,
      onConfirm: () => { deleteItem(id); setConfirm(null) },
    })
  }

  // Filtered + sorted items for grid
  const filtered = (() => {
    let list = items
    if (filter !== 'all' && filter !== 'stats') {
      if (STATUSES.includes(filter)) {
        list = list.filter(i => i.status === filter)
      } else {
        list = list.filter(i => i.category === filter)
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        [i.brand, i.name, i.designer, i.era, i.collection, i.colorway,
         i.taggedSize, i.materials, i.notes].some(f => f?.toLowerCase().includes(q))
      )
    }
    return sortItems(list, sort)
  })()

  // Stats
  const stats = {
    total:     items.length,
    available: items.filter(i=>i.status==='available').length,
    listed:    items.filter(i=>i.status==='listed').length,
    onHold:    items.filter(i=>i.status==='onHold').length,
    sold:      items.filter(i=>i.status==='sold').length,
    invested:  items.reduce((s,i)=>s+(+i.purchasePrice||0),0),
    worth:     items.filter(i=>i.status!=='sold').reduce((s,i)=>s+(+i.askingPrice||0),0),
    revenue:   items.filter(i=>i.status==='sold').reduce((s,i)=>s+(+i.salePrice||0),0),
    costSold:  items.filter(i=>i.status==='sold').reduce((s,i)=>s+(+i.purchasePrice||0),0),
  }
  stats.realizedPL    = stats.revenue - stats.costSold
  stats.unrealizedPL  = stats.worth - items.filter(i=>i.status!=='sold').reduce((s,i)=>s+(+i.purchasePrice||0),0)

  const importCSV = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
      const parse = (row) => {
        const vals = []
        let cur = '', inQ = false
        for (let i = 0; i < row.length; i++) {
          const c = row[i]
          if (c === '"' && !inQ) { inQ = true; continue }
          if (c === '"' && inQ && row[i+1] === '"') { cur += '"'; i++; continue }
          if (c === '"' && inQ) { inQ = false; continue }
          if (c === ',' && !inQ) { vals.push(cur); cur = ''; continue }
          cur += c
        }
        vals.push(cur)
        return vals
      }
      const statusReverse = { 'Available':'available','Listed':'listed','On Hold':'onHold','Sold':'sold' }
      const imported = lines.slice(1).map(row => {
        const v = parse(row)
        const get = (col) => v[headers.indexOf(col)] ?? ''
        return {
          id: makeId(),
          brand:           get('Brand'),
          designer:        get('Designer'),
          name:            get('Name'),
          category:        get('Category') || 'Other',
          era:             get('Era'),
          collection:      get('Collection'),
          colorway:        get('Colorway'),
          materials:       get('Materials'),
          countryOfOrigin: get('Country'),
          condition:       get('Condition') || 'Good',
          conditionNotes:  '',
          taggedSize:      get('Tagged Size'),
          measurements:    { unit:'in', pitToPit:'', shoulders:'', sleeveLength:'', bodyLength:'', hemWidth:'', neck:'', chest:'', waist:'', hips:'', frontRise:'', backRise:'', inseam:'', thigh:'', knee:'', legOpening:'', outseam:'', notes:'' },
          purchasePrice:   +get('Purchase Price') || 0,
          purchaseDate:    get('Purchase Date') || new Date().toISOString().slice(0,10),
          purchaseSource:  get('Source'),
          askingPrice:     +get('Asking Price') || 0,
          status:          statusReverse[get('Status')] || 'available',
          listedPlatforms: get('Platforms'),
          listedDate:      '',
          salePrice:       get('Sale Price') !== '' ? +get('Sale Price') : null,
          saleDate:        get('Sale Date') || '',
          salePlatform:    get('Sale Platform'),
          notes:           get('Notes'),
          imageFileNames:  [],
          dateAdded:       get('Date Added') ? new Date(get('Date Added')).toISOString() : new Date().toISOString(),
        }
      }).filter(i => i.brand || i.name)
      save([...imported, ...items])
    }
    reader.readAsText(file)
  }

  const exportCSV = () => {
    const headers = ['Brand','Designer','Name','Category','Era','Collection','Colorway','Materials','Country','Condition','Tagged Size','Purchase Price','Purchase Date','Source','Asking Price','Status','Platforms','Sale Price','Sale Date','Sale Platform','Notes','Date Added']
    const rows = items.map(i => [
      i.brand,i.designer,i.name,i.category,i.era,i.collection,
      i.colorway,i.materials,i.countryOfOrigin,i.condition,i.taggedSize,
      i.purchasePrice,i.purchaseDate,i.purchaseSource,i.askingPrice,
      STATUS_LABELS[i.status]||i.status,i.listedPlatforms,
      i.salePrice??'',i.saleDate||'',i.salePlatform,
      (i.notes||'').replace(/\n/g,' '),i.dateAdded.slice(0,10),
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))
    api.exportCSV([headers.join(','), ...rows].join('\n'))
  }

  return (
    <div className="layout">
      <Sidebar
        items={items}
        filter={filter}
        setFilter={setFilter}
        stats={stats}
      />

      <div className="main">
        <ProductGrid
          items={filtered}
          allItems={items}
          filter={filter}
          search={search}
          setSearch={setSearch}
          sort={sort}
          setSort={setSort}
          stats={stats}
          onAdd={() => setShowAdd(true)}
          onDetail={setDetail}
          onExport={exportCSV}
          onImport={importCSV}
        />
      </div>

      {detail && (
        <ItemDetail
          item={detail}
          onClose={() => setDetail(null)}
          onDelete={(id) => confirmDelete(id)}
          onUpdate={(item) => { updateItem(item); setDetail(item) }}
        />
      )}

      {(showAdd || editItem) && (
        <AddEditForm
          item={editItem}
          onSave={(item) => {
            if (editItem) updateItem(item)
            else addItem(item)
            setEditItem(null)
            setShowAdd(false)
          }}
          onCancel={() => { setEditItem(null); setShowAdd(false) }}
        />
      )}

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-title">Confirm Delete</div>
            <div className="confirm-text">{confirm.message}</div>
            <div className="confirm-btns">
              <button className="confirm-cancel" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="confirm-delete" onClick={confirm.onConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
