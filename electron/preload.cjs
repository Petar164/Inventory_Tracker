const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  loadInventory:  ()           => ipcRenderer.invoke('load-inventory'),
  saveInventory:  (items)      => ipcRenderer.invoke('save-inventory', items),
  selectImages:   ()           => ipcRenderer.invoke('select-images'),
  deleteImage:    (filename)   => ipcRenderer.invoke('delete-image', filename),
  imagePath:      (filename)   => ipcRenderer.invoke('image-path', filename),
  exportCSV:      (csv)        => ipcRenderer.invoke('export-csv', csv),
})
