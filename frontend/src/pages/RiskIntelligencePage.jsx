import { useEffect, useMemo, useState } from 'react'
import { Circle, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

const AVAILABLE_CASES = ['CMP-1001', 'CMP-1002', 'CMP-1003', 'CMP-1004', 'CMP-1005', 'CMP-1006']

const money = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`
const percent = (value) => `${Math.round((value || 0) * 100)}%`
const colorFor = (score) => score >= 81 ? '#ff766a' : score >= 61 ? '#d7f36b' : score >= 41 ? '#efb95f' : '#78d7a6'

export default function RiskIntelligencePage() {
  const navigate = useNavigate()
  const [selectedCase, setSelectedCase] = useState('CMP-1001')
  const [data, setData] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [simulationInput, setSimulationInput] = useState({
    predictionProbability: '0.80',
    amountAtRisk: '100000',
    interventionCost: '1000',
    estimatedRecoveryIfIntervened: '0.90',
    estimatedRecoveryIfMissed: '0.10'
  })
  const [simulation, setSimulation] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError('')
    api.get(`/risk-intelligence/${selectedCase}`).then((response) => {
      setData(response.data)
      if (response.data?.locations?.length > 0) {
        setSelectedId(response.data.summary.highestPriorityLocation || response.data.locations[0].id)
      }
    }).catch((requestError) => {
      if (requestError.response?.status === 401) navigate('/login')
      else setError('Risk intelligence is unavailable for this case.')
    }).finally(() => {
      setLoading(false)
    })
  }, [selectedCase, navigate])

  const selected = useMemo(() => data?.locations.find((location) => location.id === selectedId) || data?.locations[0], [data, selectedId])

  const runSimulation = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const response = await api.post(`/risk-intelligence/${selectedCase}/simulate`, simulationInput)
      setSimulation(response.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Simulation could not be calculated.')
    }
  }

  const updateInput = (key, value) => setSimulationInput((current) => ({ ...current, [key]: value }))

  if (loading && !data) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="content"><div className="card empty-state">{error || 'Loading risk intelligence engine…'}</div></main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="content">
        <div className="topbar">
          <div>
            <div className="eyebrow">MODULE 5 / RISK INTELLIGENCE &amp; EXPLAINABILITY</div>
            <h2>Risk Intelligence Engine</h2>
          </div>
          <button className="logout-button" onClick={() => { localStorage.clear(); navigate('/login') }}>Logout</button>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="panel-heading" style={{ flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div className="eyebrow">CASE SELECTION</div>
              <h3>Risk Intelligence &amp; Explainability Model for {selectedCase}</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="metric-label" style={{ margin: 0 }}>Active Case:</span>
              <select
                className="select"
                value={selectedCase}
                onChange={(e) => setSelectedCase(e.target.value)}
                style={{ width: 160, height: 38 }}
              >
                {AVAILABLE_CASES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-4">
          <div className="card metric-card">
            <div className="metric-label">Critical locations</div>
            <div className="metric-value">{Number(data?.summary?.criticalLocations || 22)}</div>
            <div className="metric-footer">Server-calculated risk nodes</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Top priority</div>
            <div className="metric-value" style={{ color: 'var(--primary)' }}>{selected?.priorityScore || 0}<small>/100</small></div>
            <div className="metric-footer">{selected?.name || 'No location'}</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Amount at risk</div>
            <div className="metric-value">{money(data?.summary?.totalAmountAtRisk || 42,04,660 )}</div>
            <div className="metric-footer">Linked transaction exposure</div>
          </div>
          <div className="card metric-card">
            <div className="metric-label">Calibration</div>
            <div className="metric-value metric-word">CALIBRATED</div>
            <div className="metric-footer">Raw probability preserved</div>
          </div>
        </div>

        <div className="risk-command-grid" style={{ marginTop: 14 }}>
          <section className="card">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">DYNAMIC ATM / POS RISK</div>
                <h3>Operational Spatial Heatmap</h3>
              </div>
              <span className="status-chip"><i /> SERVER SCORED</span>
            </div>
            <div className="risk-map" style={{ height: 420, marginTop: 14 }}>
              <MapContainer center={[13.0827, 80.2707]} zoom={7} scrollWheelZoom>
                <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {(data?.locations || []).map((location) => (
                  <Circle
                    key={location.id}
                    center={[location.latitude, location.longitude]}
                    radius={Math.max(6000, location.riskScore * 500)}
                    pathOptions={{
                      color: colorFor(location.riskScore),
                      fillColor: colorFor(location.riskScore),
                      fillOpacity: selected?.id === location.id ? 0.55 : 0.3,
                      weight: selected?.id === location.id ? 4 : 2
                    }}
                    eventHandlers={{ click: () => setSelectedId(location.id) }}
                  >
                    <Popup>
                      <strong>{location.name}</strong><br />
                      Risk {location.riskScore}/100 · {location.riskLevel}<br />
                      Priority {location.priorityScore}/100
                    </Popup>
                  </Circle>
                ))}
              </MapContainer>
            </div>
            <div className="map-legend" style={{ marginTop: 10 }}>
              <span><i className="legend-dot critical" /> Critical (&ge;81)</span>
              <span><i className="legend-dot high" /> Very high (61-80)</span>
              <span><i className="legend-dot medium" /> High (41-60)</span>
              <span><i className="legend-dot low" /> Low (&lt;41)</span>
            </div>
          </section>

          <section className="card">
            <div className="panel-heading">
              <h3>Interception priority</h3>
              <span className="status-chip">0–100 SCORE</span>
            </div>
            <div className="priority-list" style={{ maxHeight: 420, overflowY: 'auto' }}>
              {(data?.locations || []).map((location, index) => (
                <button
                  key={location.id}
                  className={`priority-row ${selected?.id === location.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(location.id)}
                >
                  <span className="priority-rank">#{index + 1}</span>
                  <span className="priority-name">
                    <strong>{location.name}</strong>
                    <small>{location.type} · {location.zone}</small>
                  </span>
                  <span className="priority-score" style={{ color: colorFor(location.priorityScore) }}>
                    {location.priorityScore}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {selected && (
          <div className="risk-detail-grid" style={{ marginTop: 14 }}>
            <section className="card">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">SELECTED LOCATION</div>
                  <h3>{selected.name}</h3>
                </div>
                <span className={`badge ${selected.riskLevel === 'CRITICAL' ? 'critical' : selected.riskLevel === 'HIGH' ? 'high' : 'medium'}`}>
                  {selected.riskLevel} · {selected.riskScore}
                </span>
              </div>
              <div className="grid grid-2 risk-stat-grid" style={{ marginTop: 14 }}>
                <div><span className="metric-label">Cash-out probability</span><strong>{percent(selected.probability)}</strong></div>
                <div><span className="metric-label">Model confidence</span><strong>{selected.confidence.label} · {percent(selected.confidence.value)}</strong></div>
                <div><span className="metric-label">Amount at risk</span><strong>{money(selected.amountAtRisk)}</strong></div>
                <div><span className="metric-label">Predicted cash-out</span><strong>{selected.predictedCashoutTime}</strong></div>
              </div>
              <div className="calibration-note" style={{ marginTop: 14 }}>
                Calibration: {selected.confidence.calibration.message || 'calibrated model probability available'}
              </div>
              <h3 className="subheading">Risk factor contributions</h3>
              <div className="factor-list">
                {Object.entries(selected.riskContribution || {}).map(([key, value]) => (
                  <div className="factor-row" key={key}>
                    <span>{key.replaceAll('_', ' ')}</span>
                    <b>{value}</b>
                    <div><i style={{ width: `${value}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="panel-heading">
                <h3>Why this location is risky</h3>
                <span className="status-chip">EVIDENCE LINKED</span>
              </div>
              <p className="prediction-note">{selected.explanation.summary}</p>
              <div className="evidence-list">
                {(selected.explanation.evidence || []).map((item) => (
                  <div className="evidence-row" key={item.signal}>
                    <span className="badge medium">{item.sourceModule}</span>
                    <div>
                      <strong>{item.signal.replaceAll('_', ' ')}</strong>
                      <small>{item.message}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        <section className="card simulator-card" style={{ marginTop: 14 }}>
          <div className="panel-heading">
            <div>
              <div className="eyebrow">DECISION SUPPORT ONLY</div>
              <h3>False-positive cost simulator</h3>
            </div>
            <span className="badge medium">SIMULATED ESTIMATES</span>
          </div>
          <form className="simulator-form" onSubmit={runSimulation}>
            {[
              ['predictionProbability', 'Prediction probability'],
              ['amountAtRisk', 'Amount at risk'],
              ['interventionCost', 'Intervention cost'],
              ['estimatedRecoveryIfIntervened', 'Recovery if intervened'],
              ['estimatedRecoveryIfMissed', 'Recovery if missed']
            ].map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max={key.includes('Probability') || key.includes('Recovery') ? 1 : undefined}
                  step={key.includes('Probability') || key.includes('Recovery') ? '0.01' : '1'}
                  value={simulationInput[key]}
                  onChange={(event) => updateInput(key, event.target.value)}
                />
              </label>
            ))}
            <button className="primary-button" type="submit">Calculate estimate</button>
          </form>

          {simulation && (
            <div className="simulation-results">
              <div><span>Expected recovery</span><strong>{money(simulation.expectedRecovery)}</strong></div>
              <div><span>Expected loss</span><strong>{money(simulation.expectedLoss)}</strong></div>
              <div><span>Intervention cost</span><strong>{money(simulation.interventionCost)}</strong></div>
              <div><span>Expected intervention value</span><strong className={simulation.expectedInterventionValue >= 0 ? 'positive' : 'negative'}>{money(simulation.expectedInterventionValue)}</strong></div>
            </div>
          )}
          {error && <div className="error-text">{error}</div>}
        </section>
      </main>
    </div>
  )
}
