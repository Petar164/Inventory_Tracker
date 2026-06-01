import { useState, useRef, useEffect } from 'react'
import ProductCard from './ProductCard.jsx'
import StatsPanel from './StatsPanel.jsx'
import { SORT_OPTIONS, STATUS_LABELS } from '../App.jsx'

export default function ProductGrid({
  items, filter, search, setSearch, sort, setSort,
  stats, onAdd, onDetail, onExport, onImport
}) {
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (!sortRef.current?.contains(e.target)) setSortOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filterLabel = filter === 'all' ? 'All Pieces'
    : filter === 'stats' ? 'Stats'
    : STATUS_LABELS[filter] ?? filter

  const sortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label ?? sort

  if (filter === 'stats') {
    return (
      <div className="main">
        <TopBar
          filterLabel="Stats"
          search={search}
          setSearch={setSearch}
          count={null}
          sortLabel={sortLabel}
          sortOpen={sortOpen}
          setSortOpen={setSortOpen}
          sortRef={sortRef}
          sort={sort}
          setSort={setSort}
          onAdd={onAdd}
          onExport={onExport}
          onImport={onImport}
        />
        <StatsPanel stats={stats} items={items} />
      </div>
    )
  }

  return (
    <>
      <TopBar
        filterLabel={filterLabel}
        search={search}
        setSearch={setSearch}
        count={items.length}
        sortLabel={sortLabel}
        sortOpen={sortOpen}
        setSortOpen={setSortOpen}
        sortRef={sortRef}
        sort={sort}
        setSort={setSort}
        onAdd={onAdd}
        onExport={onExport}
        onImport={onImport}
      />

      <div className="grid-scroll">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-glyph">✦</div>
            <div className="empty-state-rule" />
            <div className="empty-state-text">
              {search ? `No results for "${search}"` : 'No pieces yet'}
            </div>
          </div>
        ) : (
          <div className="grid">
            {items.map(item => (
              <ProductCard key={item.id} item={item} onClick={() => onDetail(item)} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function TopBar({ filterLabel, search, setSearch, count, sortLabel, sortOpen, setSortOpen, sortRef, sort, setSort, onAdd, onExport, onImport }) {
  const importRef = useRef(null)

  return (
    <div className="topbar">
      <span className="topbar-title">{filterLabel}</span>
      <div className="topbar-divider" />

      <div className="search-wrap">
        <span className="search-icon">⌕</span>
        <input
          className="search-input"
          type="text"
          placeholder="Search brand, era, collection…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="topbar-right">
        {count != null && (
          <span className="count-badge">{count} {count === 1 ? 'piece' : 'pieces'}</span>
        )}

        <div className="sort-dropdown-wrap" ref={sortRef}>
          <button className="sort-btn" onClick={() => setSortOpen(o => !o)}>
            ↕ {sortLabel}
          </button>
          {sortOpen && (
            <div className="sort-dropdown">
              {SORT_OPTIONS.map(o => (
                <div
                  key={o.key}
                  className={`sort-option${sort === o.key ? ' active' : ''}`}
                  onClick={() => { setSort(o.key); setSortOpen(false) }}
                >
                  {o.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          ref={importRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) { onImport(e.target.files[0]); e.target.value = '' } }}
        />
        <button className="export-btn" onClick={() => importRef.current.click()}>↓ Import</button>
        <button className="export-btn" onClick={onExport}>↑ Export</button>
        <button className="add-btn" onClick={onAdd}>+ New Item</button>
      </div>
    </div>
  )
}
