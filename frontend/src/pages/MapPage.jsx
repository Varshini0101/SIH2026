import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import L from 'leaflet'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

const createCustomIcon = (riskScore, isActive) => {
  const color = riskScore >= 80 ? '#ff766a' : riskScore >= 60 ? '#efb95f' : '#d7f36b'

  return L.divIcon({
    className: `command-marker ${isActive ? 'active' : ''}`,
    html: `<span style="background: ${color}; box-shadow: 0 0 14px ${color};"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  })
}

function MapFlyToController({ targetLocation }) {
  const map = useMap()
  useEffect(() => {
    if (targetLocation && targetLocation.latitude && targetLocation.longitude) {
      map.flyTo([targetLocation.latitude, targetLocation.longitude], 13, { animate: true, duration: 1.2 })
    }
  }, [map, targetLocation])
  return null
}

export default function MapPage() {
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const [locations, setLocations] = useState([])
  const [transactions, setTransactions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [zoneFilter, setZoneFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [dispatchMsg, setDispatchMsg] = useState('')
  const [showHeatmap, setShowHeatmap] = useState(true)

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const [atmRes, txnRes] = await Promise.all([
          api.get('/atm-locations'),
          api.get('/transactions')
        ])
        const atmData = atmRes.data || []
        setLocations(atmData)
        setTransactions(txnRes.data || [])

        const targetId = routeLocation.state?.targetAtmId
        if (targetId && atmData.some(l => l.id === targetId || l.locationId === targetId)) {
          setSelectedId(targetId)
        } else if (atmData.length > 0) {
          setSelectedId(atmData[0].id || atmData[0].locationId)
        }
      } catch (error) {
        if (error.response?.status === 401) navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    loadMapData()
  }, [navigate, routeLocation.state])

  const enrichedLocations = useMemo(() => {
    return locations.map((loc) => {
      const id = loc.id || loc.locationId
      const linkedTxns = transactions.filter(t => t.atmLocationId === id || t.location === loc.zone || t.location === loc.city)
      const suspiciousTxns = linkedTxns.filter(t => t.status === 'SUSPICIOUS')
      const totalVolume = linkedTxns.reduce((sum, t) => sum + (t.amount || 0), 0)
      const avgRiskScore = suspiciousTxns.length > 0
        ? Math.round(suspiciousTxns.reduce((sum, t) => sum + (t.riskScore || 70), 0) / suspiciousTxns.length)
        : (loc.status === 'ACTIVE' ? 68 : 30)

      return {
        ...loc,
        id,
        linkedTxnsCount: linkedTxns.length,
        suspiciousTxnsCount: suspiciousTxns.length,
        totalVolume,
        riskScore: avgRiskScore,
        riskLevel: avgRiskScore >= 80 ? 'CRITICAL' : avgRiskScore >= 60 ? 'HIGH' : avgRiskScore >= 40 ? 'MEDIUM' : 'LOW'
      }
    })
  }, [locations, transactions])

  const filteredLocations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return enrichedLocations.filter((loc) => {
      const matchesZone = zoneFilter === 'ALL' || loc.zone === zoneFilter || loc.city === zoneFilter
      const matchesType = typeFilter === 'ALL' || loc.type === typeFilter
      const matchesSearch = !q || loc.name.toLowerCase().includes(q) || loc.id.toLowerCase().includes(q) || (loc.zone || '').toLowerCase().includes(q)
      return matchesZone && matchesType && matchesSearch
    })
  }, [enrichedLocations, zoneFilter, typeFilter, searchQuery])

  const selectedLocation = useMemo(() => {
    return enrichedLocations.find(l => l.id === selectedId) || enrichedLocations[0]
  }, [enrichedLocations, selectedId])

  const zones = useMemo(() => ['ALL', ...new Set(locations.map(l => l.zone || l.city).filter(Boolean))], [locations])
  const types = useMemo(() => ['ALL', ...new Set(locations.map(l => l.type).filter(Boolean))], [locations])

  const stats = useMemo(() => {
    const totalNodes = enrichedLocations.length
    const criticalNodes = enrichedLocations.filter(l => l.riskLevel === 'CRITICAL' || l.riskLevel === 'HIGH').length
    const totalVolume = enrichedLocations.reduce((sum, l) => sum + l.totalVolume, 0)
    const activeSurveillance = enrichedLocations.filter(l => l.suspiciousTxnsCount > 0 || l.riskScore >= 60).length

    return { totalNodes, criticalNodes, totalVolume, activeSurveillance }
  }, [enrichedLocations])

  const handleDispatchAlert = async () => {
    if (!selectedLocation) return
    try {
      const refId = `DSP-${Date.now()}`
      await api.post('/dispatches', {
        referenceId: refId,
        alertId: `AL-${selectedLocation.id}`,
        recipient: 'LEA',
        entity: selectedLocation.name,
        fraudType: 'ATM WITHDRAWAL RISK',
        riskScore: selectedLocation.riskScore,
        severity: selectedLocation.riskLevel,
        transactionSummary: `Suspicious activity flagged at ${selectedLocation.name} (${selectedLocation.zone})`,
        recommendedAction: 'Dispatch LEA Patrol to ATM Terminal'
      })
      setDispatchMsg(`LEA Alert dispatched successfully! (Ref: ${refId})`)
      setTimeout(() => setDispatchMsg(''), 4000)
    } catch (err) {
      console.error(err)
      setDispatchMsg('Failed to dispatch alert')
    }
  }

  const handleToggleTerminal = () => {
    if (!selectedLocation) return
    setLocations(prev => prev.map(l => (l.id === selectedLocation.id || l.locationId === selectedLocation.id) ? { ...l, status: l.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE' } : l))
    setDispatchMsg(`Terminal status updated to ${selectedLocation.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE'}`)
    setTimeout(() => setDispatchMsg(''), 3000)
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="content"><div className="card empty-state">Loading spatial intelligence engine…</div></main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="content">
        <div className="topbar">
          <div>
            <div className="eyebrow">MODULE 3 / SPATIAL ANALYSIS</div>
            <h2>Map Intelligence &amp; Spatial Risk Center</h2>
          </div>
          <button className="logout-button" onClick={() => { localStorage.clear(); navigate('/login') }}>Logout</button>
        </div>

        <div className="grid grid-4">
          <div className="card metric-card">
            <div className="metric-label">Monitored Locations</div>
            <div className="metric-value">{stats.totalNodes}</div>
            <div className="metric-footer">Tamil Nadu ATM &amp; POS terminals registered</div>
          </div>

          <div className="card metric-card">
            <div className="metric-label">High Risk Hotspots</div>
            <div className="metric-value" style={{ color: 'var(--critical)' }}>{stats.criticalNodes}</div>
            <div className="metric-footer">Elevated cash-out probability</div>
          </div>

          <div className="card metric-card">
            <div className="metric-label">Active Surveillance</div>
            <div className="metric-value">{stats.activeSurveillance}</div>
            <div className="metric-footer">Terminals with flagged activity</div>
          </div>

          <div className="card metric-card">
            <div className="metric-label">Monitored Exposure</div>
            <div className="metric-value">₹{Math.round(stats.totalVolume).toLocaleString('en-IN')}</div>
            <div className="metric-footer">Total financial transaction volume</div>
          </div>
        </div>

        <div className="risk-command-grid" style={{ marginTop: 14 }}>
          <section className="card" style={{ paddingBottom: 14 }}>
            <div className="panel-heading">
              <div>
                <div className="eyebrow">SPATIAL SURVEILLANCE MAP</div>
                <h3>ATM &amp; POS Location Intelligence</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className={showHeatmap ? 'primary-button' : 'secondary-button'}
                  style={{ height: 28, fontSize: '.64rem', padding: '0 10px' }}
                  onClick={() => setShowHeatmap(!showHeatmap)}
                >
                  {showHeatmap ? 'Heatmap: ON' : 'Heatmap: OFF'}
                </button>
                <span className="status-chip"><i /> SPATIAL ENGINE ACTIVE</span>
              </div>
            </div>

            <div className="filter-row" style={{ marginTop: 14 }}>
              <input
                className="input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search terminal name, ID, or city..."
              />
              <select className="select" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
                <option value="ALL">All Cities/Zones</option>
                {zones.filter(z => z !== 'ALL').map(z => <option key={z} value={z}>{z}</option>)}
              </select>
              <select className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="ALL">All Terminal Types</option>
                {types.filter(t => t !== 'ALL').map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="risk-map" style={{ height: 440, marginTop: 14 }}>
              <MapContainer center={[13.0827, 80.2707]} zoom={8} scrollWheelZoom={true}>
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapFlyToController targetLocation={selectedLocation} />

                {showHeatmap && filteredLocations.map((loc) => {
                  const heatColor = loc.riskScore >= 80 ? '#ff766a' : loc.riskScore >= 60 ? '#efb95f' : '#d7f36b'
                  return (
                    <CircleMarker
                      key={`heat-${loc.id}`}
                      center={[loc.latitude, loc.longitude]}
                      radius={loc.riskScore >= 80 ? 28 : loc.riskScore >= 60 ? 20 : 14}
                      pathOptions={{
                        fillColor: heatColor,
                        fillOpacity: loc.riskScore >= 80 ? 0.38 : 0.22,
                        stroke: false
                      }}
                    />
                  )
                })}

                {filteredLocations.map((loc) => (
                  <Marker
                    key={loc.id}
                    position={[loc.latitude, loc.longitude]}
                    icon={createCustomIcon(loc.riskScore, selectedLocation?.id === loc.id)}
                    eventHandlers={{
                      click: () => {
                        setSelectedId(loc.id)
                      }
                    }}
                  >
                    <Popup>
                      <strong>{loc.name}</strong><br />
                      {loc.type} · {loc.zone || loc.city}<br />
                      <span className={`badge ${loc.riskLevel.toLowerCase()}`} style={{ marginTop: 4, marginBottom: 6 }}>
                        Risk {loc.riskScore}/100 ({loc.riskLevel})
                      </span><br />
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="map-legend" style={{ marginTop: 10 }}>
              <span><i className="legend-dot critical" /> Critical Heatspot (≥80)</span>
              <span><i className="legend-dot high" /> High Risk (60-79)</span>
              <span><i className="legend-dot medium" /> Standard Monitored (&lt;60)</span>
            </div>
          </section>

          <aside id="location-inspector" className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="panel-heading">
              <div>
                <div className="eyebrow">LOCATION INSPECTOR</div>
                <h3>{selectedLocation ? selectedLocation.name : 'Terminal Details'}</h3>
              </div>
              {selectedLocation && (
                <span className={`badge ${selectedLocation.riskLevel.toLowerCase()}`}>
                  {selectedLocation.riskLevel}
                </span>
              )}
            </div>

            {dispatchMsg && (
              <div className="replay-result" style={{ margin: 0, padding: 10 }}>
                <strong>{dispatchMsg}</strong>
              </div>
            )}

            {selectedLocation ? (
              <>
                <div className="grid grid-2 risk-stat-grid" style={{ marginTop: 0 }}>
                  <div>
                    <span className="metric-label">Terminal ID</span>
                    <strong>{selectedLocation.id}</strong>
                  </div>
                  <div>
                    <span className="metric-label">Type &amp; Zone</span>
                    <strong>{selectedLocation.type} · {selectedLocation.zone || selectedLocation.city}</strong>
                  </div>
                  <div>
                    <span className="metric-label">Risk Score</span>
                    <strong style={{ color: selectedLocation.riskScore >= 80 ? 'var(--critical)' : 'var(--primary)' }}>
                      {selectedLocation.riskScore}/100
                    </strong>
                  </div>
                  <div>
                    <span className="metric-label">Flagged Activity</span>
                    <strong>{selectedLocation.suspiciousTxnsCount} transaction(s)</strong>
                  </div>
                </div>

                <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'rgba(215,243,107,0.02)' }}>
                  <div className="eyebrow">COORDINATES &amp; EXPOSURE</div>
                  <div className="prediction-line">
                    <span>LAT / LNG</span>
                    <strong>{selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}</strong>
                  </div>
                  <div className="prediction-line"><span>MONITORED VOL.</span><strong>₹{Math.round(selectedLocation.totalVolume).toLocaleString('en-IN')}</strong></div>
                  <div className="prediction-line"><span>STATUS</span><strong>{selectedLocation.status}</strong></div>
                </div>

                <p className="prediction-note" style={{ margin: 0 }}>
                  Spatial intelligence detects suspicious cash-out clusters around this terminal in {selectedLocation.zone || selectedLocation.city}. Rapid withdrawal patterns elevate regional priority.
                </p>

                <div className="inline-actions" style={{ marginTop: 4, gap: 8 }}>
                  <button className="primary-button" onClick={handleDispatchAlert} style={{ flex: 1, fontSize: '.7rem' }}>
                    Dispatch LEA Alert
                  </button>
                  <button className="danger-button" onClick={handleToggleTerminal} style={{ flex: 1, fontSize: '.7rem' }}>
                    {selectedLocation.status === 'INACTIVE' ? 'Activate Terminal' : 'Freeze Terminal'}
                  </button>
                </div>

                <Link className="secondary-button" to="/predictions" style={{ display: 'inline-flex', textDecoration: 'none', justifyContent: 'center' }}>
                  View Predictions &amp; ATM Ranking
                </Link>
              </>
            ) : (
              <div className="empty-state">Select a location marker on the map to inspect details.</div>
            )}
          </aside>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="panel-heading" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">TERMINAL RISK RANKING</div>
              <h3>Monitored ATM &amp; POS Terminals Overview ({filteredLocations.length})</h3>
            </div>
            <span className="status-chip">{filteredLocations.length} TERMINALS MATCHED</span>
          </div>

          <div className="table-wrapper" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Terminal ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Zone / City</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Flagged Txns</th>
                  <th>Total Volume</th>
                  <th>Risk Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((loc) => (
                  <tr key={loc.id} style={{ background: selectedLocation?.id === loc.id ? 'rgba(215,243,107,0.06)' : undefined }}>
                    <td><strong>{loc.id}</strong></td>
                    <td>{loc.name}</td>
                    <td>{loc.type}</td>
                    <td>{loc.zone || loc.city}</td>
                    <td>{loc.latitude}</td>
                    <td>{loc.longitude}</td>
                    <td>{loc.suspiciousTxnsCount}</td>
                    <td>₹{Math.round(loc.totalVolume).toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge ${loc.riskLevel.toLowerCase()}`}>
                        {loc.riskScore}/100 ({loc.riskLevel})
                      </span>
                    </td>
                    <td>
                      <div className="inline-actions" style={{ gap: 4 }}>
                        <button
                          className="secondary-button"
                          style={{ height: 28, padding: '0 8px', fontSize: '.68rem' }}
                          onClick={() => setSelectedId(loc.id)}
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

    </div>
  )
}
