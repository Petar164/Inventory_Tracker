import { CATEGORIES, STATUSES, STATUS_LABELS } from '../App.jsx'

const fmt = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 })

const STATUS_ORDER = ['available','listed','onHold','sold']

export default function Sidebar({ items, filter, setFilter, stats }) {
  const categoryCounts = CATEGORIES
    .map(c => ({ cat: c, count: items.filter(i => i.category === c).length }))
    .filter(x => x.count > 0)

  const pl = stats.unrealizedPL
  const plClass = pl > 0 ? 'profit' : pl < 0 ? 'loss' : ''

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-wordmark">
          <div className="wordmark-cross">† † †</div>
          <div className="wordmark-title">Archive</div>
          <div className="wordmark-rule" />
          <div className="wordmark-sub">Personal Inventory</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <SidebarItem
          label="All Pieces"
          count={stats.total}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />

        <div className="sidebar-section-label">Status</div>

        {STATUS_ORDER.map(s => (
          <SidebarItem
            key={s}
            label={STATUS_LABELS[s]}
            count={stats[s] ?? 0}
            active={filter === s}
            onClick={() => setFilter(s)}
            dot={STATUS_DOT_COLOR[s]}
          />
        ))}

        {categoryCounts.length > 0 && (
          <>
            <div className="sidebar-section-label">Category</div>
            {categoryCounts.map(({ cat, count }) => (
              <SidebarItem
                key={cat}
                label={cat}
                count={count}
                active={filter === cat}
                onClick={() => setFilter(cat)}
              />
            ))}
          </>
        )}

        <div className="sidebar-section-label">Overview</div>
        <SidebarItem
          label="Stats"
          count={null}
          active={filter === 'stats'}
          onClick={() => setFilter('stats')}
        />
      </nav>

      <div className="sidebar-financials">
        <div className="fin-section-head">
          <span className="fin-head-glyph">✦ Account ✦</span>
        </div>

        <div className="fin-row">
          <div className="fin-label">Amount Invested</div>
          <div className="fin-value invested">{fmt.format(stats.invested)}</div>
        </div>
        <div className="fin-row">
          <div className="fin-label">Total Worth</div>
          <div className="fin-value">{fmt.format(stats.worth)}</div>
        </div>
        <div className="fin-row">
          <div className="fin-label">Potential P / L</div>
          <div className={`fin-value ${plClass}`}>
            {pl >= 0 ? '+' : ''}{fmt.format(pl)}
          </div>
        </div>
      </div>
    </aside>
  )
}

function SidebarItem({ label, count, active, onClick, dot }) {
  return (
    <div className={`sidebar-item${active ? ' active' : ''}`} onClick={onClick}>
      <div style={{ display:'flex', alignItems:'center' }}>
        {dot && <div className="sidebar-dot" style={{ background: dot }} />}
        <span className="sidebar-item-label">{label}</span>
      </div>
      {count != null && <span className="sidebar-item-count">{count}</span>}
    </div>
  )
}

const STATUS_DOT_COLOR = {
  available: '#4aae76',
  listed:    '#4a7fd4',
  onHold:    '#cc8030',
  sold:      '#606060',
}
