import { useState, useRef, useEffect } from 'react'
import { STATUS_LABELS } from '../App.jsx'
import api from '../lib/api.js'

const fmt = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 })

const STATUS_CLASS = {
  available: 'status-available',
  listed:    'status-listed',
  onHold:    'status-onHold',
  sold:      'status-sold',
}

export default function ProductCard({ item, onClick }) {
  const [imgSrc, setImgSrc]     = useState(null)
  const [hover, setHover]       = useState(false)
  const [tilt, setTilt]         = useState({ rx: 0, ry: 0, sx: 50, sy: 50 })
  const cardRef = useRef(null)
  const rafRef  = useRef(null)

  useEffect(() => {
    if (item.imageFileNames?.length) {
      api.imagePath(item.imageFileNames[0]).then(setImgSrc)
    }
  }, [item.imageFileNames?.[0]])

  const handleMouseMove = (e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const card = cardRef.current
      if (!card) return
      const r  = card.getBoundingClientRect()
      const dx = (e.clientX - r.left)  / r.width   // 0–1
      const dy = (e.clientY - r.top)   / r.height  // 0–1
      setTilt({ rx: (dy - 0.5) * -12, ry: (dx - 0.5) * 12, sx: dx * 100, sy: dy * 100 })
    })
  }

  const handleMouseEnter = () => setHover(true)
  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setHover(false)
    setTilt({ rx: 0, ry: 0, sx: 50, sy: 50 })
  }

  const potential = (+item.askingPrice || 0) - (+item.purchasePrice || 0)
  const hasPaid   = (+item.purchasePrice || 0) > 0
  const metaParts = [item.era, item.taggedSize ? `SZ ${item.taggedSize.toUpperCase()}` : null, item.colorway].filter(Boolean)

  return (
    <div
      ref={cardRef}
      className={`card${hover ? ' card-hover' : ''}`}
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${hover ? '16px' : '0px'})`,
        '--shine-x': `${tilt.sx}%`,
        '--shine-y': `${tilt.sy}%`,
      }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="card-image-wrap">
        {imgSrc
          ? <img src={imgSrc} alt="" className="card-image" />
          : <div className="card-image-placeholder"><span>✦</span></div>
        }
        <div className={`card-status-badge ${STATUS_CLASS[item.status] ?? ''}`}>
          {STATUS_LABELS[item.status] ?? item.status}
        </div>
      </div>

      <div className="card-body">
        <div className="card-brand">{item.brand || 'Unknown Brand'}</div>
        <div className="card-rule" />
        {item.name && <div className="card-name">{item.name}</div>}
        {metaParts.length > 0 && <div className="card-meta">{metaParts.join(' · ')}</div>}

        <div className="card-price-row">
          <div>
            <div className="card-asking">{fmt.format(+item.askingPrice || 0)}</div>
            {hasPaid && <div className="card-paid">PAID {fmt.format(+item.purchasePrice || 0)}</div>}
          </div>
          {item.status !== 'sold' && hasPaid && (
            <div className={`card-profit ${potential >= 0 ? 'pos' : 'neg'}`}>
              {potential >= 0 ? '+' : ''}{fmt.format(potential)}
            </div>
          )}
          {item.status === 'sold' && item.salePrice && (
            <div className="card-profit pos">SOLD {fmt.format(+item.salePrice)}</div>
          )}
        </div>
      </div>
    </div>
  )
}
