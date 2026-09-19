import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

const money = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`
const nodeColor = (node) => node.ponrType ? '#ff766a' : node.risk >= 85 ? '#d7f36b' : '#efb95f'

export default function MoneyTrailPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [freezeAt, setFreezeAt] = useState('2026-09-09T12:05:00Z')
  const [replay, setReplay] = useState(null)

  useEffect(() => {
    api.get('/money-trail/CMP-1001').then((response) => setData(response.data)).catch((error) => {
      if (error.response?.status === 401) navigate('/login')
    })
  }, [navigate])

  const { graphHeight, positions } = useMemo(() => {
    if (!data) return { graphHeight: 450, positions: {} }
    const byHop = {}
    data.graph.nodes.forEach((node) => {
      const hop = data.graph.edges.find((edge) => edge.target === node.id)?.hop || 0
      byHop[hop] = [...(byHop[hop] || []), node]
    })
    let maxY = 350
    const pos = Object.values(byHop).flatMap((nodes, column) => nodes.map((node, row) => {
      const y = 70 + row * 92
      if (y > maxY) maxY = y
      return { [node.id]: { x: 90 + column * 170, y } }
    })).reduce((all, item) => ({ ...all, ...item }), {})

    return { graphHeight: maxY + 80, positions: pos }
  }, [data])


  const runReplay = async () => {
    const response = await api.post('/money-trail/CMP-1001/replay', { freezeNodeId: 'mule-001', freezeAt })
    setReplay(response.data)
  }

  if (!data) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="content"><div className="card empty-state">Loading money trail…</div></main>
      </div>
    )
  }

  const { graph, ponr, amountAtRisk } = data
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="content">
        <div className="topbar"><div><div className="eyebrow">Module 4 / Case {data.caseId}</div><h2>Money Trail &amp; PONR</h2></div><button className="logout-button" onClick={() => { localStorage.clear(); navigate('/login') }}>Logout</button></div>
        <div className="grid grid-4">
          <div className="card metric-card"><div className="metric-label">Recoverable now</div><div className="metric-value">{money(amountAtRisk.recoverableAmount)}</div><div className="metric-footer">after fees and splits</div></div>
          <div className="card metric-card"><div className="metric-label">PONR exposure</div><div className="metric-value">{money(amountAtRisk.ponrExposure)}</div><div className="metric-footer">already irreversible</div></div>
          <div className="card metric-card"><div className="metric-label">Graph hops</div><div className="metric-value">{Math.max(...graph.edges.map((edge) => edge.hop))}</div><div className="metric-footer">{graph.nodes.length} nodes / {graph.edges.length} transfers</div></div>
          <div className="card metric-card"><div className="metric-label">Next PONR TTL</div><div className="metric-value">{ponr.find((item) => item.status === 'OPEN')?.ttlMinutes ?? 0}<small> min</small></div><div className="metric-footer">intervention window</div></div>
        </div>
        <div className="command-grid money-trail-layout">
          <section className="card"><div className="panel-heading"><h3>Directed fund-flow graph</h3><span className="status-chip"><i /> LIVE TRACE</span></div>
            <div className="trail-graph">
              <svg viewBox={`0 0 850 ${graphHeight}`} style={{ height: `${graphHeight}px`, minHeight: `${graphHeight}px` }} role="img" aria-label="Directed multi-hop money trail">

                <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#87918b" /></marker></defs>
                {graph.edges.map((edge) => {
                  const from = positions[edge.source]; const to = positions[edge.target]
                  if (!from || !to) return null
                  return <g key={edge.id}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={edge.ponr ? '#ff766a' : '#52605a'} strokeWidth={Math.max(1.5, Math.min(5, edge.amount / 12000))} markerEnd="url(#arrow)" /><text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} fill="#b5c0b9" fontSize="10">{money(edge.amount)}</text></g>
                })}
                {graph.nodes.map((node) => { const point = positions[node.id]; return point ? <g key={node.id}><circle cx={point.x} cy={point.y} r="23" fill="#121616" stroke={nodeColor(node)} strokeWidth="3" /><text x={point.x} y={point.y + 4} textAnchor="middle" fill={nodeColor(node)} fontSize="9">{node.type.replace('_', ' ')}</text><text x={point.x} y={point.y + 39} textAnchor="middle" fill="#eef2eb" fontSize="10">{node.label.slice(0, 20)}</text></g> : null })}
              </svg>
            </div>
            <div className="graph-legend"><span><i className="legend-dot high" /> high-risk node</span><span><i className="legend-dot critical" /> PONR / cash-out</span><span><i className="legend-dot medium" /> monitored</span></div>
          </section>
          <aside className="card ponr-panel"><h3>PONR queue</h3>{ponr.map((item) => <div className="prediction-line" key={item.edgeId}><span>{item.type.replaceAll('_', ' ')}</span><strong><span className={`badge ${item.status === 'OPEN' ? 'high' : 'critical'}`}>{item.status === 'OPEN' ? `${item.ttlMinutes} min` : 'REACHED'}</span></strong></div>)}<h3 className="replay-heading">Counterfactual replay</h3><label className="metric-label" htmlFor="freeze-at">Freeze mule-001 at</label><input id="freeze-at" className="input" type="datetime-local" value={freezeAt.slice(0, 16)} onChange={(event) => setFreezeAt(`${event.target.value}:00Z`)} /><button className="primary-button" onClick={runReplay}>Run intervention</button>{replay && <div className="replay-result"><strong>{money(replay.savedAmount)} saved</strong><span>{money(replay.preventedPONRExposure)} PONR exposure prevented</span></div>}</aside>
        </div>
      </main>
    </div>
  )
}
