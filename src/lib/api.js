import { supabase } from './supabase.js'

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

let _tauriCore = null
async function tauri() {
  if (!_tauriCore) _tauriCore = await import('@tauri-apps/api/core')
  return _tauriCore
}

const urlCache = new Map()

function pickFiles() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type     = 'file'
    input.accept   = 'image/jpeg,image/png,image/webp,image/heic,image/tiff'
    input.multiple = true
    input.style.display = 'none'
    document.body.appendChild(input)

    input.addEventListener('cancel', () => { input.remove(); resolve([]) })
    input.onchange = async () => {
      const files = Array.from(input.files || [])
      input.remove()
      const filenames = []
      for (const file of files) {
        const ext      = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('images').upload(filename, file)
        if (!error) filenames.push(filename)
      }
      resolve(filenames)
    }
    input.click()
  })
}

const api = {
  loadInventory: async () => {
    if (IS_TAURI) {
      const { invoke } = await tauri()
      return invoke('load_inventory')
    }
    const { data, error } = await supabase
      .from('inventory_store')
      .select('data')
      .eq('key', 'main')
      .single()
    if (error || !data) return []
    return data.data || []
  },

  saveInventory: async (items) => {
    if (IS_TAURI) {
      const { invoke } = await tauri()
      return invoke('save_inventory', { items })
    }
    await supabase
      .from('inventory_store')
      .upsert({ key: 'main', data: items, updated_at: new Date().toISOString() })
  },

  selectImages: async () => {
    if (IS_TAURI) {
      const { invoke } = await tauri()
      return invoke('select_images')
    }
    return pickFiles()
  },

  deleteImage: async (filename) => {
    urlCache.delete(filename)
    if (IS_TAURI) {
      const { invoke } = await tauri()
      return invoke('delete_image', { filename })
    }
    await supabase.storage.from('images').remove([filename])
  },

  imagePath: async (filename) => {
    if (urlCache.has(filename)) return urlCache.get(filename)

    if (IS_TAURI) {
      const { invoke, convertFileSrc } = await tauri()
      const path = await invoke('image_path', { filename })
      if (!path) return ''
      const url = convertFileSrc(path)
      urlCache.set(filename, url)
      return url
    }

    const { data } = supabase.storage.from('images').getPublicUrl(filename)
    urlCache.set(filename, data.publicUrl)
    return data.publicUrl
  },

  exportCSV: async (csv) => {
    if (IS_TAURI) {
      const { invoke } = await tauri()
      return invoke('export_csv', { csv })
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'inventory.csv' })
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}

export default api
