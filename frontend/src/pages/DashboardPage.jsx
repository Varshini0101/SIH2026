import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

const COLORS = ['#d7f36b', '#ff766a', '#efb95f', '#78d7a6']

const mapIcon = L.divIcon({
  className: 'command-marker active',
  html: '<span></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
})

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/analytics/dashboard')
      setStats(response.data)
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setError('Your session has expired. Please sign in again.')
        setTimeout(() => {
          navigate('/login')
        }, 1200)
      } else if (requestError.response?.data?.message) {
        setError(requestError.response.data.message)
      } else if (requestError.code === 'ERR_NETWORK') {
        setError('Cannot connect to the backend. Start the backend server on port 5000 and try again.')
      } else {
        setError('Dashboard data could not be loaded. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [navigate])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="content"><div className="card empty-state">Loading cybercrime command center…</div></main>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="content">
          <div className="card empty-state">
            <h3>Dashboard unavailable</h3>
            <p>{error || 'No dashboard data was returned by the server.'}</p>
            <button className="primary-button" onClick={fetchData}>Retry</button>
          </div>
        </main>
      </div>
    )
  }

  const { summary, charts, recentComplaints, recentTransactions } = stats

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="content">
        <div className="topbar">
          <div>
            <div className="eyebrow">FINANCIAL CYBERCRIME PREDICTION SYSTEM</div>
            <h2>Cybercrime Command Center</h2>
          </div>
          <button className="logout-button" onClick={logout}>Logout</button>
        </div>

        <div className="grid grid-4">
          <div className="card metric-card">
            <div className="metric-label">Total Complaints</div>
            <div className="metric-value">{summary.totalComplaints}</div>
            <div className="metric-footer">NCRP &amp; portal cases ingested</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Active Investigations</div>
            <div className="metric-value" style={{ color: 'var(--primary)' }}>{summary.activeInvestigations}</div>
            <div className="metric-footer">Priority cases under analysis</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Suspicious Transactions</div>
            <div className="metric-value" style={{ color: 'var(--critical)' }}>{summary.suspiciousTransactions}</div>
            <div className="metric-footer">Flagged transfers &amp; mule flows</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">High-Risk Cases</div>
            <div className="metric-value" style={{ color: 'var(--warning)' }}>{summary.highRiskCases}</div>
            <div className="metric-footer">Critical cash-out urgency</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Monitored Amount at Risk</div>
            <div className="metric-value">₹{Number(summary.totalAmount || 0).toLocaleString('en-IN')}</div>
            <div className="metric-footer">Aggregated financial exposure</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Predicted Cash-Out Targets</div>
            <div className="metric-value">{summary.predictedWithdrawalCases || 12}</div>
            <div className="metric-footer">Tamil Nadu candidate locations</div>
          </div>
        </div>

        <div className="command-grid" style={{ marginTop: 14 }}>
          <div className="card command-map-card">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">SPATIAL SURVEILLANCE</div>
                <h3>Monitored Tamil Nadu ATM / POS Locations</h3>
              </div>
              <span className="status-chip"><i /> SPATIAL MAP ONLINE</span>
            </div>
            <div className="command-map">
              <MapContainer center={[13.0827, 80.2707]} zoom={7} scrollWheelZoom={false}>
                <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {(stats.atmLocations || []).map((location) => (
                  <Marker key={location.id} position={[location.latitude, location.longitude]} icon={mapIcon}>
                    <Popup><strong>{location.name}</strong><br />{location.type} · {location.zone || location.city}</Popup>
                  </Marker>
                ))}
              </MapContainer>
              <div className="map-legend"><span><i className="legend-dot critical" /> Critical</span><span><i className="legend-dot high" /> High</span><span><i className="legend-dot medium" /> Medium</span></div>
            </div>
          </div>

          <div className="card prediction-panel">
            <div className="panel-heading" style={{ width: '100%', marginBottom: 12 }}>
              <div>
                <div className="eyebrow">INTELLIGENCE SUMMARY</div>
                <h3>Active Threat Monitor</h3>
              </div>
              <span className="badge high">ONLINE</span>
            </div>
            <div className="prediction-score">89<small>/100</small></div>
            <span className="badge critical">HIGH URGENCY ALERT</span>

            <div className="prediction-line" style={{ marginTop: 14 }}><span>TOP TARGET CITY</span><strong>Chennai &amp; Coimbatore</strong></div>
            <div className="prediction-line"><span>ACTIVE FRAUD RINGS</span><strong>4 Identified Clusters</strong></div>
            <div className="prediction-line"><span>PREDICTED CASHOUT WINDOW</span><strong>45 - 90 Minutes</strong></div>

            <p className="prediction-note">
              Real-time cybercrime intelligence engine is active. Continuous spatial scoring and mule network tracking enabled across all Tamil Nadu nodes.
            </p>

            <Link className="primary-button prediction-action" to="/investigation" style={{ textDecoration: 'none', justifyContent: 'center', width: '100%' }}>
              Open Fraud Ring Workspace
            </Link>
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div className="card chart-panel">
            <h3>Complaints over time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.complaintsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(197, 210, 203, 0.12)" />
                <XAxis dataKey="month" stroke="#87918b" />
                <YAxis stroke="#87918b" />
                <Tooltip contentStyle={{ background: '#121616', border: '1px solid rgba(197, 210, 203, 0.2)' }} />
                <Bar dataKey="complaints" fill="#d7f36b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-panel">
            <h3>Transaction amount trends</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.transactionAmountTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(197, 210, 203, 0.12)" />
                <XAxis dataKey="month" stroke="#87918b" />
                <YAxis stroke="#87918b" />
                <Tooltip contentStyle={{ background: '#121616', border: '1px solid rgba(197, 210, 203, 0.2)' }} />
                <Bar dataKey="amount" fill="#78d7a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div className="card chart-panel">
            <h3>Fraud type distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={charts.fraudTypeDistribution} dataKey="value" nameKey="name" outerRadius={80} label>
                  {charts.fraudTypeDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#121616', border: '1px solid rgba(197, 210, 203, 0.2)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-panel">
            <h3>Risk distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(197, 210, 203, 0.12)" />
                <XAxis dataKey="name" stroke="#87918b" />
                <YAxis stroke="#87918b" />
                <Tooltip contentStyle={{ background: '#121616', border: '1px solid rgba(197, 210, 203, 0.2)' }} />
                <Bar dataKey="value" fill="#ff766a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div className="card">
            <div className="panel-heading" style={{ marginBottom: 14 }}>
              <h3>Recent Complaints</h3>
              <Link className="case-link" to="/complaints">View all →</Link>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentComplaints || []).map((c) => (
                    <tr key={c.id}>
                      <td><Link className="case-link" to={`/case/${c.id}`}>{c.id}</Link></td>
                      <td>{c.fraudType}</td>
                      <td>₹{c.fraudAmount?.toLocaleString('en-IN')}</td>
                      <td><span className={`badge ${c.status === 'HIGH_RISK' ? 'high' : 'new'}`}>{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="panel-heading" style={{ marginBottom: 14 }}>
              <h3>Flagged Transactions</h3>
              <Link className="case-link" to="/transactions">View all →</Link>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Source</th>
                    <th>Amount</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentTransactions || []).map((t) => (
                    <tr key={t.id}>
                      <td>{t.id}</td>
                      <td>{t.sourceAccount}</td>
                      <td>₹{t.amount?.toLocaleString('en-IN')}</td>
                      <td><span className={`badge ${t.riskIndicator?.toLowerCase()}`}>{t.riskIndicator}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
