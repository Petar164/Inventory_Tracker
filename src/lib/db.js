const DB_NAME = 'ArchiveInventory'
const DB_VERSION = 1

let _db = null

function openDB() {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('inventory')) db.createObjectStore('inventory')
      if (!db.objectStoreNames.contains('images'))    db.createObjectStore('images')
    }
    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db) }
    req.onerror    = (e) => reject(e.target.error)
  })
}

function tx(store, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction(store, mode)
    const req = fn(t.objectStore(store))
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = (e) => reject(e.target.error)
  }))
}

export const loadInventory    = () => tx('inventory', 'readonly',  s => s.get('data')).then(r => r || [])
export const saveInventory    = (items) => tx('inventory', 'readwrite', s => s.put(items, 'data'))
export const storeImage       = (blob, filename) => tx('images', 'readwrite', s => s.put(blob, filename))
export const getImageBlob     = (filename) => tx('images', 'readonly',  s => s.get(filename))
export const deleteImageFromDB = (filename) => tx('images', 'readwrite', s => s.delete(filename))
