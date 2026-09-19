import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

export default function CasePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [complaint, setComplaint] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [prediction, setPrediction] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadCase = async () => {
      setIsLoading(true)
      setError('')

      try {
        let complaintRecord = {}
        let txRes = { data: [] }

        try {
          complaintRecord = (await api.get(`/complaints/${id}`)).data || {}
          txRes = await api.get('/transactions')
        } catch (complaintError) {
          if (complaintError.response?.status === 401) {
            navigate('/login')
            return
          }

          complaintRecord = {
            id,
            complaintId: id,
            fraudType: 'Dataset case',
            victimIdentifier: id,
            location: 'N/A',
            suspectedAccount: 'N/A',
            status: 'UNKNOWN',
            description: 'No complaint record exists for this dataset case. Prediction data is still available.',
            fraudAmount: 0
          }
        }

        const complaintId = complaintRecord.complaintId || complaintRecord.id || id
        const routeCaseId = typeof id === 'string' && /^CASE-/i.test(id.trim()) ? id.trim() : ''
        const backendCaseId = typeof complaintRecord.caseId === 'string' && /^CASE-/i.test(complaintRecord.caseId.trim()) ? complaintRecord.caseId.trim() : ''
        const fallbackCaseId = !backendCaseId && !routeCaseId ? normalizeCaseId(complaintId) : ''
        const caseCandidates = [...new Set([
          routeCaseId,
          backendCaseId,
          fallbackCaseId,
          normalizeCaseId(id),
          normalizeCaseId(complaintId),
          id,
          complaintId
        ].filter(Boolean))]

        let predictionResponse = null

        for (const caseId of caseCandidates) {
          try {
            const attempt = await api.get(`/prediction/${caseId}`)
            if (Array.isArray(attempt.data?.rankedCandidates) || typeof attempt.data?.totalCandidates === 'number') {
              predictionResponse = attempt
              break
            }
          } catch (innerError) {
            if (innerError.response?.status === 401) {
              navigate('/login')
              return
            }

            if (innerError.response?.status !== 404) {
              throw innerError
            }
          }
        }

        setComplaint(complaintRecord)
        setTransactions(Array.isArray(txRes.data) ? txRes.data.filter((txn) => txn.sourceAccount === complaintRecord.suspectedAccount || txn.location === complaintRecord.location) : [])
        const resolvedPrediction = predictionResponse?.data || {
          caseId: caseCandidates[0],
          rankedCandidates: [],
          totalCandidates: 0,
          timeToCashout: null,
          predictionSummary: null,
          message: 'No ranked ATMs available for this case.'
        }
        setPrediction(resolvedPrediction)
      } catch (error) {
        if (error.response?.status === 401) {
          navigate('/login')
          return
        }

        setError(error.response?.data?.message || 'Unable to load case prediction data.')
      } finally {
        setIsLoading(false)
      }
    }

    loadCase()
  }, [id, navigate])

  const normalizeCaseId = (value) => {
    if (!value || typeof value !== 'string') return ''

    const trimmed = value.trim()
    if (!trimmed) return ''
    if (/^CASE-/i.test(trimmed)) return trimmed

    if (/^CMP-/i.test(trimmed)) {
      const digits = trimmed.replace(/\D+/g, '')
      if (!digits) return trimmed
      return `CASE-${digits.slice(-5).padStart(5, '0')}`
    }

    return trimmed
  }

  const riskScore = useMemo(() => {
    if (!complaint) return 0
    const amount = Number(complaint.fraudAmount || 0)
    const base = Math.min(amount / 1500, 60)
    const statusBoost = complaint.status === 'HIGH_RISK' ? 20 : complaint.status === 'UNDER_INVESTIGATION' ? 12 : 5
    return Math.min(Math.round(base + statusBoost), 100)
  }, [complaint])

  const rankedCandidates = Array.isArray(prediction?.rankedCandidates) ? prediction.rankedCandidates : []
  const timeToCashout = prediction?.timeToCashout || null
  const predictionSummary = prediction?.predictionSummary || {
    cashOutRisk: 'UNKNOWN',
    predictedTimeWindow: 'Unavailable',
    confidence: 'UNKNOWN',
    topLocation: 'N/A',
    topLocationsCount: rankedCandidates.length
  }
  const hasRankingData = Array.isArray(prediction?.rankedCandidates) && prediction.rankedCandidates.length > 0
  const hasTimeData = !!prediction?.timeToCashout && (
    Number.isFinite(prediction.timeToCashout.estimatedMinutes)
    || Number.isFinite(prediction.timeToCashout.estimatedHours)
    || prediction.timeToCashout.timeWindow
    || prediction.timeToCashout.confidence
    || prediction.timeToCashout.source
  )
  const hasPredictionSummary = !!prediction?.predictionSummary && Object.keys(prediction.predictionSummary).length > 0

  if (isLoading && !complaint) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="content"><div className="card empty-state">Loading case…</div></main>
      </div>
    )
  }

  if (error && !complaint) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="content"><div className="card empty-state">{error}</div></main>
      </div>
    )
  }


  return (
    <div className="app-shell">
      <Sidebar />


      <main className="content">
        <div className="topbar">
          <h2>Investigation Case - {complaint.id}</h2>
          <button className="logout-button" onClick={() => { localStorage.clear(); navigate('/login') }}>Logout</button>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <h3>Complaint information</h3>
            <p><strong>Fraud type:</strong> {complaint.fraudType}</p>
            <p><strong>Victim ID:</strong> {complaint.victimIdentifier}</p>
            <p><strong>Location:</strong> {complaint.location}</p>
            <p><strong>Suspected account:</strong> {complaint.suspectedAccount}</p>
            <p><strong>Status:</strong> <span className={`badge ${complaint.status === 'HIGH_RISK' ? 'high' : complaint.status === 'UNDER_INVESTIGATION' ? 'investigation' : complaint.status === 'RESOLVED' ? 'resolved' : 'new'}`}>{complaint.status}</span></p>
            <p><strong>Amount:</strong> ₹{complaint.fraudAmount.toLocaleString('en-IN')}</p>
            <p><strong>Description:</strong> {complaint.description}</p>
          </div>

          <div className="card">
            <h3>Risk score</h3>
            <div className="metric-value">{riskScore}/100</div>
            <div className={`badge ${riskScore > 80 ? 'critical' : riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low'}`} style={{ marginTop: 12 }}>{riskScore > 80 ? 'CRITICAL' : riskScore > 60 ? 'HIGH' : riskScore > 30 ? 'MEDIUM' : 'LOW'}</div>
            <p style={{ marginTop: 22 }}>
              High risk because:<br />
              - ₹{complaint.fraudAmount.toLocaleString('en-IN')} transaction detected<br />
              - Multiple transfers within 24 hours<br />
              - Previous ATM withdrawals detected<br />
              - Recent activity near {complaint.location}
            </p>
          </div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <h3>Related transactions</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Amount</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>{txn.id}</td>
                    <td>{txn.type}</td>
                    <td>{txn.location}</td>
                    <td>₹{txn.amount.toLocaleString('en-IN')}</td>
                    <td><span className={`badge ${txn.riskIndicator.toLowerCase()}`}>{txn.riskIndicator}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {hasPredictionSummary && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3>Cash-Out Prediction Summary</h3>
            <div className="grid grid-2">
              <div>
                <p><strong>Risk:</strong> {predictionSummary.cashOutRisk || 'UNKNOWN'}</p>
                <p><strong>Predicted Time:</strong> {predictionSummary.predictedTimeWindow || 'Unavailable'}</p>
                <p><strong>Confidence:</strong> {predictionSummary.confidence || 'UNKNOWN'}</p>
              </div>
              <div>
                <p><strong>Most Likely Cash-out Location:</strong> {predictionSummary.topLocation || 'N/A'}</p>
                <p><strong>Ranked Locations:</strong> {predictionSummary.topLocationsCount ?? rankedCandidates.length}</p>
              </div>
            </div>
          </div>
        )}

        {hasTimeData && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3>Predicted cash-out time</h3>
            <div className="grid grid-2">
              <div>
                <p><strong>Time:</strong> {timeToCashout.estimatedMinutes != null ? `${timeToCashout.estimatedMinutes} minutes` : 'N/A'}</p>
                <p><strong>Hours:</strong> {timeToCashout.estimatedHours != null ? `${timeToCashout.estimatedHours} hours` : 'N/A'}</p>
              </div>
              <div>
                <p><strong>Time window:</strong> {timeToCashout.timeWindow || 'Not available'}</p>
                <p><strong>Confidence:</strong> {timeToCashout.confidence || 'Not available'}</p>
                <p><strong>Source:</strong> {timeToCashout.source || 'Not available'}</p>
              </div>
            </div>
          </div>
        )}

        {!hasTimeData && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3>Predicted cash-out time</h3>
            <p className="empty-state">Predicted cash-out time is not available for this case.</p>
          </div>
        )}

        <div className="card" style={{ marginTop: 20 }}>
          <h3>Case ID: {prediction?.caseId || id}</h3>
          <h3>Top 5 predicted ATM/POS locations</h3>
          {error ? <p className="empty-state">{error}</p> : hasRankingData ? (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>ATM/POS ID</th>
                    <th>Ranking score</th>
                    <th>Distance</th>
                    <th>Regional match</th>
                    <th>Time compatibility</th>
                    <th>Historical area score</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedCandidates.slice(0, 5).map((item) => (
                    <tr key={item.atmId}>
                      <td>{item.rank}</td>
                      <td>{item.atmId}</td>
                      <td>{Number(item.score).toFixed(6)}</td>
                      <td>{Number(item.featureScores?.distance ?? 0).toFixed(6)}</td>
                      <td>{Number(item.featureScores?.regionalMatch ?? 0).toFixed(6)}</td>
                      <td>{Number(item.featureScores?.timeCompatibility ?? 0).toFixed(6)}</td>
                      <td>{Number(item.featureScores?.historicalAreaScore ?? 0).toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-state">No ranked ATM/POS candidates available.</p>}
        </div>
      </main>
    </div>
  )
}
