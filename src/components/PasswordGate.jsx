import { useState } from 'react'

const KEY = 'archive_auth'
const PASS = 'fashionvoid67'

export default function PasswordGate({ children }) {
  const [authed, setAuthed]   = useState(() => sessionStorage.getItem(KEY) === '1')
  const [value, setValue]     = useState('')
  const [shaking, setShaking] = useState(false)

  const attempt = () => {
    if (value === PASS) {
      sessionStorage.setItem(KEY, '1')
      setAuthed(true)
    } else {
      setValue('')
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') attempt()
  }

  if (authed) return children

  return (
    <div className="gate-overlay">
      <div className="gate-box">
        <div className="gate-wordmark">Archive</div>
        <div className="gate-rule" />
        <div className="gate-sub">Personal Inventory</div>
        <div className={`gate-input-wrap${shaking ? ' gate-shake' : ''}`}>
          <input
            className="gate-input"
            type="password"
            placeholder="Enter password"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
          />
          <button className="gate-btn" onClick={attempt}>→</button>
        </div>
      </div>
    </div>
  )
}
