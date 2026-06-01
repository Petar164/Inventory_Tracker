import { CATEGORIES } from '../App.jsx'

const fmt    = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 })
const fmtDec = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:0 })
const fmtP   = (n) => (n >= 0 ? '+' : '') + fmt.format(n)
const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
const pct    = (n) => n.toFixed(1) + '%'

export default function StatsPanel({ stats, items }) {
  const soldItems   = items.filter(i => i.status === 'sold')
  const activeItems = items.filter(i => i.status !== 'sold')

  // Sell-through & ROI
  const sellThroughRate = items.length > 0 ? (soldItems.length / items.length * 100) : 0
  const realizedROI     = stats.costSold > 0 ? ((stats.revenue - stats.costSold) / stats.costSold * 100) : 0
  const activeCost      = activeItems.reduce((s,i) => s + (+i.purchasePrice||0), 0)
  const unrealizedROI   = activeCost > 0 ? (stats.unrealizedPL / activeCost * 100) : 0
  const avgProfitPerSale = soldItems.length > 0 ? stats.realizedPL / soldItems.length : 0

  // Avg days to sell
  const daysArr = soldItems
    .filter(i => i.purchaseDate && i.saleDate)
    .map(i => Math.round((new Date(i.saleDate) - new Date(i.purchaseDate)) / 86400000))
  const avgDaysToSell = daysArr.length > 0
    ? Math.round(daysArr.reduce((s,d) => s+d, 0) / daysArr.length)
    : null

  // Averages
  const avgPurchasePrice = items.length > 0 ? stats.invested / items.length : 0
  const avgAskingPrice   = activeItems.length > 0 ? stats.worth / activeItems.length : 0
  const avgSalePrice     = soldItems.length > 0 ? stats.revenue / soldItems.length : 0
  const avgMarkup        = stats.costSold > 0 ? ((stats.revenue - stats.costSold) / stats.costSold * 100) : 0

  // Avg hold time for active inventory
  const now = Date.now()
  const holdDays = activeItems
    .filter(i => i.dateAdded)
    .map(i => Math.floor((now - new Date(i.dateAdded)) / 86400000))
  const avgHoldDays = holdDays.length > 0
    ? Math.round(holdDays.reduce((s,d) => s+d, 0) / holdDays.length)
    : null

  // By brand
  const brandMap = {}
  items.forEach(i => {
    const b = i.brand || 'Unknown'
    if (!brandMap[b]) brandMap[b] = { count: 0, value: 0 }
    brandMap[b].count++
    brandMap[b].value += i.status === 'sold' ? (+i.salePrice||0) : (+i.askingPrice||0)
  })
  const brandRows = Object.entries(brandMap)
    .map(([brand, d]) => ({ brand, ...d }))
    .sort((a,b) => b.count - a.count)
    .slice(0, 10)
  const maxBrandCount = brandRows[0]?.count || 1

  // Sales by platform
  const platformMap = {}
  soldItems.forEach(i => {
    const p = i.salePlatform?.trim() || 'Other'
    if (!platformMap[p]) platformMap[p] = { count: 0, revenue: 0 }
    platformMap[p].count++
    platformMap[p].revenue += (+i.salePrice||0)
  })
  const platformRows = Object.entries(platformMap)
    .map(([platform, d]) => ({ platform, ...d }))
    .sort((a,b) => b.revenue - a.revenue)
  const maxPlatformRevenue = platformRows[0]?.revenue || 1

  // Sourcing breakdown
  const sourceMap = {}
  items.forEach(i => {
    const s = i.purchaseSource?.trim() || 'Unknown'
    if (!sourceMap[s]) sourceMap[s] = { count: 0, spend: 0 }
    sourceMap[s].count++
    sourceMap[s].spend += (+i.purchasePrice||0)
  })
  const sourceRows = Object.entries(sourceMap)
    .map(([source, d]) => ({ source, ...d }))
    .sort((a,b) => b.spend - a.spend)
    .slice(0, 8)
  const maxSourceSpend = sourceRows[0]?.spend || 1

  // By category
  const catCounts = CATEGORIES
    .map(c => ({ cat:c, count: items.filter(i=>i.category===c).length }))
    .filter(x => x.count > 0)
    .sort((a,b) => b.count - a.count)
  const maxCat = catCounts[0]?.count || 1

  // Inventory age (active only)
  const ageBuckets = [
    { label: '< 30 days',   count: 0, color: '' },
    { label: '30–90 days',  count: 0, color: '' },
    { label: '90–180 days', count: 0, color: 'bar-fill-orange' },
    { label: '180d+',       count: 0, color: 'bar-fill-red' },
  ]
  activeItems.forEach(i => {
    const days = Math.floor((now - new Date(i.dateAdded)) / 86400000)
    if (days < 30)       ageBuckets[0].count++
    else if (days < 90)  ageBuckets[1].count++
    else if (days < 180) ageBuckets[2].count++
    else                 ageBuckets[3].count++
  })
  const maxAge = Math.max(...ageBuckets.map(b => b.count), 1)

  // Era breakdown
  const eraMap = {}
  items.forEach(i => {
    const e = i.era?.trim() || 'Unknown'
    if (!eraMap[e]) eraMap[e] = 0
    eraMap[e]++
  })
  const eraRows = Object.entries(eraMap)
    .map(([era, count]) => ({ era, count }))
    .sort((a,b) => b.count - a.count)
    .slice(0, 8)
  const maxEra = eraRows[0]?.count || 1

  // Condition breakdown
  const condMap = {}
  items.forEach(i => {
    const c = i.condition || 'Unknown'
    if (!condMap[c]) condMap[c] = 0
    condMap[c]++
  })
  const condRows = Object.entries(condMap)
    .map(([cond, count]) => ({ cond, count }))
    .sort((a,b) => b.count - a.count)
  const maxCond = condRows[0]?.count || 1

  return (
    <div className="stats-scroll">
      <div className="stats-title">† Overview</div>

      {/* Inventory counts */}
      <div className="stats-grid">
        <StatCard label="Total Pieces"   value={stats.total} />
        <StatCard label="Available"      value={stats.available} />
        <StatCard label="Listed"         value={stats.listed} />
        <StatCard label="On Hold"        value={stats.onHold} />
        <StatCard label="Sold"           value={stats.sold} />
        <StatCard label="Sell-Through"   value={pct(sellThroughRate)}
          positive={sellThroughRate >= 50} negative={sellThroughRate < 25 && items.length > 0} />
      </div>

      {/* Financials */}
      <div className="stats-section-label">Financials</div>
      <div className="stats-grid">
        <StatCard label="Total Invested"   value={fmt.format(stats.invested)}       money />
        <StatCard label="Portfolio Worth"  value={fmt.format(stats.worth)}          money />
        <StatCard label="Unrealized P / L" value={fmtP(stats.unrealizedPL)}        money positive={stats.unrealizedPL>=0} negative={stats.unrealizedPL<0} />
        <StatCard label="Unrealized ROI"   value={fmtPct(unrealizedROI)}            positive={unrealizedROI>=0} negative={unrealizedROI<0} />
        <StatCard label="Total Revenue"    value={fmt.format(stats.revenue)}        money />
        <StatCard label="Cost of Sold"     value={fmt.format(stats.costSold)}       money />
        <StatCard label="Realized P / L"   value={fmtP(stats.realizedPL)}          money positive={stats.realizedPL>=0} negative={stats.realizedPL<0} />
        <StatCard label="Realized ROI"     value={fmtPct(realizedROI)}              positive={realizedROI>=0} negative={realizedROI<0} />
      </div>

      {/* Performance */}
      <div className="stats-section-label">Performance</div>
      <div className="stats-grid">
        <StatCard label="Avg Purchase Price" value={fmt.format(avgPurchasePrice)}    money />
        <StatCard label="Avg Asking Price"   value={fmt.format(avgAskingPrice)}      money />
        <StatCard label="Avg Sale Price"     value={soldItems.length ? fmt.format(avgSalePrice) : '—'}   money={!!soldItems.length} />
        <StatCard label="Avg Profit / Sale"  value={soldItems.length ? fmtP(avgProfitPerSale) : '—'}
          money={!!soldItems.length} positive={avgProfitPerSale>0} negative={avgProfitPerSale<0} />
        <StatCard label="Avg Markup"         value={soldItems.length ? fmtPct(avgMarkup) : '—'}
          positive={avgMarkup>0} negative={avgMarkup<0} />
        <StatCard label="Avg Days to Sell"   value={avgDaysToSell != null ? `${avgDaysToSell}d` : '—'} />
        <StatCard label="Avg Hold Time"      value={avgHoldDays != null ? `${avgHoldDays}d` : '—'} />
        <StatCard label="Active Pieces"      value={activeItems.length} />
      </div>

      {/* By Brand */}
      {brandRows.length > 0 && (
        <>
          <div className="stats-section-label" style={{marginTop:28}}>By Brand</div>
          {brandRows.map(({ brand, count, value }) => (
            <div key={brand} className="bar-row">
              <div className="bar-label">{brand}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width:`${(count/maxBrandCount)*100}%` }} />
              </div>
              <div className="bar-count">{count}</div>
              <div className="bar-value">{fmt.format(value)}</div>
            </div>
          ))}
        </>
      )}

      {/* Sales by Platform */}
      {platformRows.length > 0 && (
        <>
          <div className="stats-section-label" style={{marginTop:28}}>Sales by Platform</div>
          {platformRows.map(({ platform, count, revenue }) => (
            <div key={platform} className="bar-row">
              <div className="bar-label">{platform}</div>
              <div className="bar-track">
                <div className="bar-fill bar-fill-green" style={{ width:`${(revenue/maxPlatformRevenue)*100}%` }} />
              </div>
              <div className="bar-count">{count}</div>
              <div className="bar-value">{fmt.format(revenue)}</div>
            </div>
          ))}
        </>
      )}

      {/* Sourcing */}
      {sourceRows.length > 0 && (
        <>
          <div className="stats-section-label" style={{marginTop:28}}>Sourcing</div>
          {sourceRows.map(({ source, count, spend }) => (
            <div key={source} className="bar-row">
              <div className="bar-label">{source}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width:`${(spend/maxSourceSpend)*100}%` }} />
              </div>
              <div className="bar-count">{count}</div>
              <div className="bar-value">{fmt.format(spend)}</div>
            </div>
          ))}
        </>
      )}

      {/* By Category */}
      {catCounts.length > 0 && (
        <>
          <div className="stats-section-label" style={{marginTop:28}}>By Category</div>
          {catCounts.map(({ cat, count }) => (
            <div key={cat} className="bar-row">
              <div className="bar-label">{cat}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width:`${(count/maxCat)*100}%` }} />
              </div>
              <div className="bar-count">{count}</div>
            </div>
          ))}
        </>
      )}

      {/* By Era */}
      {eraRows.length > 0 && (
        <>
          <div className="stats-section-label" style={{marginTop:28}}>By Era</div>
          {eraRows.map(({ era, count }) => (
            <div key={era} className="bar-row">
              <div className="bar-label">{era}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width:`${(count/maxEra)*100}%` }} />
              </div>
              <div className="bar-count">{count}</div>
            </div>
          ))}
        </>
      )}

      {/* By Condition */}
      {condRows.length > 0 && (
        <>
          <div className="stats-section-label" style={{marginTop:28}}>By Condition</div>
          {condRows.map(({ cond, count }) => (
            <div key={cond} className="bar-row">
              <div className="bar-label">{cond}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width:`${(count/maxCond)*100}%` }} />
              </div>
              <div className="bar-count">{count}</div>
            </div>
          ))}
        </>
      )}

      {/* Inventory Age */}
      {activeItems.length > 0 && (
        <>
          <div className="stats-section-label" style={{marginTop:28}}>Inventory Age</div>
          {ageBuckets.map(({ label, count, color }) => (
            <div key={label} className="bar-row">
              <div className="bar-label">{label}</div>
              <div className="bar-track">
                <div className={`bar-fill${color ? ' '+color : ''}`} style={{ width:`${(count/maxAge)*100}%` }} />
              </div>
              <div className="bar-count">{count}</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, money, positive, negative }) {
  const cls = `stat-card-value${money?' money':''}${positive?' positive':''}${negative?' negative':''}`
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className={cls}>{value}</div>
    </div>
  )
}
