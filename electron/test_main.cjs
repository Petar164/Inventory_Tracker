// Try different ways to access electron
const ways = ['electron', '@electron/main', 'electron/main']
for (const mod of ways) {
  try {
    const e = require(mod)
    console.log(mod, ':', typeof e, typeof e === 'object' ? Object.keys(e||{}).slice(0,5).join(',') : String(e).slice(0,60))
  } catch(ex) { console.log(mod, 'ERROR:', ex.message.slice(0,80)) }
}
// Check process bindings
console.log('process._linkedBinding exists:', typeof process._linkedBinding)
try {
  const e = process._linkedBinding?.('electron_browser_app')
  console.log('electron_browser_app:', typeof e)
} catch(ex) { console.log('binding error:', ex.message.slice(0,60)) }
process.exit(0)
