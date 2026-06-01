import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync } from 'node:fs'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'

// createRequire bridges ESM -> Electron's CJS builtin
const require = createRequire(import.meta.url)
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')

const __dirname = nodePath.dirname(fileURLToPath(import.meta.url))
const isDev     = process.env.NODE_ENV === 'development'

// ── Paths ──────────────────────────────────────────────────────────────────
const userData  = app.getPath('userData')
const dataDir   = nodePath.join(userData, 'InventoryTracker')
const imagesDir = nodePath.join(dataDir, 'Images')
const dataFile  = nodePath.join(dataDir, 'inventory.json')

mkdirSync(dataDir,   { recursive: true })
mkdirSync(imagesDir, { recursive: true })

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#000000',
    webPreferences: {
      preload: nodePath.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(nodePath.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

// ── IPC: Inventory ─────────────────────────────────────────────────────────
ipcMain.handle('load-inventory', () => {
  try {
    if (!existsSync(dataFile)) return []
    return JSON.parse(readFileSync(dataFile, 'utf8'))
  } catch { return [] }
})

ipcMain.handle('save-inventory', (_, items) => {
  writeFileSync(dataFile, JSON.stringify(items, null, 2), 'utf8')
})

// ── IPC: Images ────────────────────────────────────────────────────────────
ipcMain.handle('select-images', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Photos',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg','jpeg','png','heic','webp','tiff'] }],
  })
  if (result.canceled) return []

  const saved = []
  for (const src of result.filePaths) {
    const ext      = nodePath.extname(src).toLowerCase() || '.jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    const dest     = nodePath.join(imagesDir, filename)
    copyFileSync(src, dest)
    saved.push(filename)
  }
  return saved
})

ipcMain.handle('delete-image', (_, filename) => {
  const p = nodePath.join(imagesDir, filename)
  if (existsSync(p)) unlinkSync(p)
})

ipcMain.handle('image-path', (_, filename) => {
  return `file://${nodePath.join(imagesDir, filename)}`
})

// ── IPC: CSV Export ─────────────────────────────────────────────────────────
ipcMain.handle('export-csv', async (_, csv) => {
  const result = await dialog.showSaveDialog({
    title: 'Export Inventory',
    defaultPath: 'inventory.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  })
  if (!result.canceled && result.filePath) {
    writeFileSync(result.filePath, csv, 'utf8')
    shell.showItemInFinder(result.filePath)
  }
})
