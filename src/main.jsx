import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PasswordGate from './components/PasswordGate.jsx'
import './styles/app.css'

const IS_TAURI = '__TAURI_INTERNALS__' in window

ReactDOM.createRoot(document.getElementById('root')).render(
  IS_TAURI
    ? <App />
    : <PasswordGate><App /></PasswordGate>
)
