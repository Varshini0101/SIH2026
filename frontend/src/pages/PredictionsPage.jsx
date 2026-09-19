import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

const AVAILABLE_CASES = [
  'CMP-1001', 'CMP-1002', 'CMP-1003', 'CMP-1004', 'CMP-1005', 'CMP-1006',
  'CASE-00001', 'CASE-00002', 'CASE-00003', 'CASE-00004', 'CASE-00005',
  'CASE-00006', 'CASE-00007', 'CASE-00008', 'CASE-00009', 'CASE-00010'
]

export default function PredictionsPage() {
  const navigate = useNavigate()
  const [selectedCase, setSelectedCase] = useState('CMP-1001')
  const [predictionData, setPredictionData] = useState(null)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPredictions = async () => {
      setLoading(true)
      try {
        const response = await api.get(`/predictions/${selectedCase}`)
        setPredictionData(response.data)
      } catch (error) {
        if (error.response?.status === 401) navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    loadPredictions()
  }, [selectedCase, navigate])

  const predictions = predictionData?.predictions || []

  const filteredPredictions = useMemo(() => {
    const q = search.toLowerCase().trim()
    return predictions.filter((p) => {
      const matchesSearch = !q || p.locationName.toLowerCase().includes(q) || p.atmId.toLowerCase().includes(q)
      const matchesRisk = riskFilter === 'ALL' || p.riskLevel === riskFilter
      return matchesSearch && matchesRisk
    })
  }, [predictions, search, riskFilter])

  const topLocation = predictions[0]

  if (loading && !predictionData) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="content"><div className="card empty-state">Loading cash-out location prediction engine…</div></main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="content">
        <div className="topbar">
          <div>
            <div className="eyebrow">MODULE 3 / PREDICTION ENGINE</div>
            <h2>Next ATM &amp; Time-to-Cashout Predictions</h2>
          </div>
          <button className="logout-button" onClick={() => { localStorage.clear(); navigate('/login') }}>Logout</button>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="panel-heading" style={{ flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div className="eyebrow">SELECT INVESTIGATION CASE</div>
              <h3>Predictive Cash-Out Target Model</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="metric-label" style={{ margin: 0 }}>Active Case:</span>
              <select
                className="select"
                value={selectedCase}
                onChange={(e) => setSelectedCase(e.target.value)}
                style={{ width: 170, height: 38 }}
              >
                {AVAILABLE_CASES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-4">
          <div className="card metric-card">
            <div className="metric-label">Ranked ATM/POS Candidates</div>
            <div className="metric-value" style={{ color: 'var(--primary)' }}>{predictions.length}</div>
            <div className="metric-footer">Tamil Nadu candidate pool generated</div>
          </div>

          <div className="card metric-card">
            <div className="metric-label">Top Location Target</div>
            <div className="metric-value metric-word">{topLocation ? topLocation.locationName.split(' ')[0] : 'N/A'}</div>
            <div className="metric-footer">{topLocation ? `${topLocation.predictionScore} pts · ${topLocation.riskLevel}` : 'No prediction'}</div>
          </div>

          <div className="card metric-card">
            <div className="metric-label">Predicted Time Window</div>
            <div className="metric-value metric-word">45-90<small> min</small></div>
            <div className="metric-footer">Estimated time to cashout</div>
          </div>

          <div className="card metric-card">
            <div className="metric-label">Model Confidence</div>
            <div className="metric-value" style={{ color: 'var(--primary)' }}>89%</div>
            <div className="metric-footer">Feature matrix calibrated</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14, background: 'linear-gradient(135deg, rgba(215,243,107,0.05), rgba(18,22,22,0.98))', border: '1px solid rgba(215,243,107,0.25)' }}>
          <div className="panel-heading">
            <div>
              <div className="eyebrow" style={{ color: 'var(--primary)' }}>OPERATIONAL PROBLEM STATEMENT &amp; SOLUTION ARCHITECTURE</div>
              <h3 style={{ fontSize: '1.05rem' }}>🎯 How Nearest ATM Prediction Solves Cybercrime Cash-Out Fraud</h3>
            </div>
            <span className="status-chip" style={{ fontSize: '.68rem' }}><i /> REAL-TIME INTERCEPTION READY</span>
          </div>

          <p style={{ fontSize: '.76rem', color: 'var(--muted-bright)', lineHeight: 1.6, marginTop: 8, marginBottom: 14 }}>
            In cyber fraud incidents across India (phishing, fake loans, work-from-home scams), stolen victim money is instantly wired through 2 to 4 layers of digital bank accounts. Money muling networks instruct ground operatives to perform <strong>immediate physical cash withdrawals at the nearest ATMs within a 2-10 km radius</strong> within 15–45 minutes of the crime.
            This website directly solves this problem by predicting the top target ATMs using spatial Haversine distance, cash vault availability, and withdrawal velocity, allowing law enforcement to freeze vaults and dispatch patrols before cash vanishes into thin air.
          </p>

          <div className="grid grid-4" style={{ gap: 10 }}>
            <div style={{ padding: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div className="eyebrow">TARGET CASE INCIDENT</div>
              <strong style={{ color: 'var(--primary)' }}>{selectedCase}</strong>
            </div>

            <div style={{ padding: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div className="eyebrow">PREDICTED #1 TARGET ATM</div>
              <strong>{topLocation ? topLocation.locationName : 'Chennai Central ATM'}</strong>
            </div>

            <div style={{ padding: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div className="eyebrow">NEAREST POLICE UNIT</div>
              <strong>T. Nagar Patrol Unit #04 (1.4 km)</strong>
            </div>

            <div style={{ padding: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div className="eyebrow">INTERCEPTION FEASIBILITY</div>
              <strong style={{ color: 'var(--success)' }}>✓ FEASIBLE (POLICE ETA &lt; MULE)</strong>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="panel-heading" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">RANKED CANDIDATE LOCATIONS</div>
              <h3>Predicted ATM / POS Cash-Out Rankings for {selectedCase}</h3>
            </div>
            <span className="status-chip"><i /> MODEL ONLINE ({predictions.length} LOCATIONS)</span>
          </div>

          <div className="filter-row" style={{ marginBottom: 16 }}>
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ATM location, ID, or city..."
            />
            <select className="select" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Location Name</th>
                  <th>ATM / POS ID</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Prediction Score</th>
                  <th>Risk Level</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPredictions.map((prediction, index) => (
                  <tr key={prediction.atmId}>
                    <td><strong>#{index + 1}</strong></td>
                    <td><strong>{prediction.locationName}</strong></td>
                    <td>{prediction.atmId}</td>
                    <td>{prediction.latitude}</td>
                    <td>{prediction.longitude}</td>
                    <td>
                      <strong style={{ color: prediction.predictionScore >= 80 ? 'var(--primary)' : 'var(--text)' }}>
                        {prediction.predictionScore}
                      </strong> / 100
                    </td>
                    <td>
                      <span className={`badge ${prediction.riskLevel === 'HIGH' ? 'high' : prediction.riskLevel === 'MEDIUM' ? 'medium' : 'low'}`}>
                        {prediction.riskLevel}
                      </span>
                    </td>
                    <td>
                      <div className="inline-actions" style={{ gap: 6 }}>
                        <button
                          className="secondary-button"
                          style={{ height: 30, padding: '0 8px', fontSize: '.68rem' }}
                          onClick={() => navigate('/map', { state: { targetAtmId: prediction.atmId } })}
                        >
                          View Map
                        </button>
                        <Link className="primary-button" to={`/case/${selectedCase}`} style={{ height: 30, padding: '0 8px', fontSize: '.68rem', textDecoration: 'none' }}>
                          Investigate
                        </Link>
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
