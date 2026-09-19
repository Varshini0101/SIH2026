import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

const money = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`
const severityFor = (score) => score >= 85 ? 'CRITICAL' : score >= 70 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW'
const riskBandWeight = { LOW: 20, MEDIUM: 45, HIGH: 70, CRITICAL: 90 }

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateTime = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const normalizeAlertType = (transactionType) => {
  switch (transactionType) {
    case 'ATM_WITHDRAWAL':
      return 'ATM Withdrawal Pattern'
    case 'UPI':
      return 'UPI Transfer Pattern'
    case 'IMPS':
      return 'IMPS Transfer Pattern'
    case 'NEFT':
      return 'NEFT Transfer Pattern'
    default:
      return 'Suspicious Transfer Pattern'
  }
}

const buildRecommendation = (alert, account, relatedTransactionCount) => {
  const supportingEvidence = [
    `Current risk score: ${alert.riskScore}/100`,
    `${relatedTransactionCount} related suspicious transaction(s) linked to ${alert.entity}`,
    `${account?.riskBand || 'MEDIUM'} account risk band in existing account metadata`
  ]

  let recommendedAction = 'Monitor Account'
  let confidenceScore = 74
  let reason = 'The account currently shows suspicious activity, but the evidence is not yet sufficient to classify the behaviour as confirmed fraud.'

  if (alert.severity === 'CRITICAL') {
    recommendedAction = alert.alertType.includes('ATM') ? 'Freeze Transaction' : 'Escalate to LEA'
    confidenceScore = alert.alertType.includes('ATM') ? 89 : 93
    reason = 'High-intensity transfer behaviour and elevated account risk indicate a suspected fraud pattern that requires urgent review and possible external escalation.'
  } else if (alert.severity === 'HIGH') {
    recommendedAction = alert.alertType.includes('ATM') ? 'Restrict Account' : relatedTransactionCount > 1 ? 'Investigate Connected Accounts' : 'Verify KYC'
    confidenceScore = relatedTransactionCount > 1 ? 86 : 82
    reason = 'The transaction profile is unusually risky, and the connected account history suggests a possible mule or account-takeover pattern that requires investigation.'
  } else if (alert.alertType.includes('UPI')) {
    recommendedAction = 'Verify KYC'
    confidenceScore = 78
    reason = 'UPI transaction activity and current risk posture suggest the account may need identity verification before further transactions are allowed.'
  } else if (alert.amount >= 75000) {
    recommendedAction = 'Escalate to Bank'
    confidenceScore = 80
    reason = 'The transaction amount is high enough to justify immediate bank-side validation and protective intervention.'
  }

  return {
    recommendedAction,
    confidenceScore,
    reason,
    supportingEvidence
  }
}

const buildTimeline = (alert) => {
  const base = alert.date ? new Date(alert.date) : new Date()
  const entries = [
    { action: 'Fraud activity detected', investigator: 'Risk Engine', status: 'Suspected Fraud', timestamp: new Date(base.getTime() + 1000 * 60 * 0).toISOString() },
    { action: 'Fraud ring identified', investigator: 'Module 6 Analysis', status: 'Requires Investigation', timestamp: new Date(base.getTime() + 1000 * 60 * 6).toISOString() },
    { action: 'Alert generated', investigator: 'Investigator', status: 'New', timestamp: new Date(base.getTime() + 1000 * 60 * 9).toISOString() },
    { action: 'Investigator reviewed', investigator: 'Investigator', status: 'Under Review', timestamp: new Date(base.getTime() + 1000 * 60 * 14).toISOString() },
    { action: 'Action recommended', investigator: 'Decision Support', status: 'Recommended', timestamp: new Date(base.getTime() + 1000 * 60 * 21).toISOString() },
    { action: 'Alert dispatched', investigator: 'Investigator', status: 'Dispatched', timestamp: new Date(base.getTime() + 1000 * 60 * 29).toISOString() },
    { action: 'Acknowledged', investigator: 'Bank / LEA / I4C', status: 'Acknowledged', timestamp: new Date(base.getTime() + 1000 * 60 * 35).toISOString() },
    { action: 'Investigation completed', investigator: 'Investigator', status: 'Resolved', timestamp: new Date(base.getTime() + 1000 * 60 * 52).toISOString() }
  ]

  return entries
}

export default function InvestigationPage() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedAlertId, setSelectedAlertId] = useState(null)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [alertTypeFilter, setAlertTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('')
  const [alertStatusMap, setAlertStatusMap] = useState({})
  const [dispatches, setDispatches] = useState([])
  const [dispatchForm, setDispatchForm] = useState({
    recipient: 'Bank',
    alertId: '',
    entity: '',
    fraudType: '',
    riskScore: '',
    severity: '',
    transactionSummary: '',
    fraudRingSummary: '',
    evidence: '',
    investigatorNotes: '',
    recommendedAction: ''
  })
  const [dispatchResult, setDispatchResult] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      try {
        const [transactionResponse, dashboardResponse, dispatchesResponse, alertStatusesResponse] = await Promise.all([
          api.get('/transactions', { params: { status: 'SUSPICIOUS', sort: 'amount-desc' } }),
          api.get('/analytics/dashboard'),
          api.get('/dispatches'),
          api.get('/dispatches/alerts/status')
        ])

        if (cancelled) return

        setTransactions(transactionResponse.data || [])
        setAccounts(dashboardResponse.data?.accounts || [])
        setDashboardData(dashboardResponse.data || null)
        setDispatches(dispatchesResponse.data || [])
        setAlertStatusMap(alertStatusesResponse.data || {})
      } catch (error) {
        if (error.response?.status === 401) {
          navigate('/login')
          return
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [navigate])

  const analysis = useMemo(() => {
    const suspiciousTransactions = [...(transactions || [])].sort((a, b) => b.amount - a.amount)

    if (!suspiciousTransactions.length) {
      return {
        suspiciousAccounts: [],
        suspiciousTransactions: [],
        connectedEntities: [],
        graphNodes: [],
        graphEdges: [],
        fraudRingRiskScore: 0,
        muleAccountScore: 0,
        totalAmount: 0,
        severity: 'LOW'
      }
    }

    const accountMap = new Map((accounts || []).map((account) => [account.accountNumber, account]))

    const accountSummary = new Map()

    suspiciousTransactions.forEach((transaction) => {
      const current = accountSummary.get(transaction.sourceAccount) || {
        accountNumber: transaction.sourceAccount,
        owner: accountMap.get(transaction.sourceAccount)?.owner || 'Unknown owner',
        riskBand: accountMap.get(transaction.sourceAccount)?.riskBand || 'MEDIUM',
        suspiciousCount: 0,
        totalAmount: 0,
        totalRisk: 0,
        linkedTransactions: []
      }

      current.suspiciousCount += 1
      current.totalAmount += Number(transaction.amount || 0)
      current.totalRisk += Number(transaction.riskScore || 0)
      current.linkedTransactions.push(transaction)
      accountSummary.set(transaction.sourceAccount, current)
    })

    const suspiciousAccounts = [...accountSummary.values()].map((entry) => {
      const account = accountMap.get(entry.accountNumber)
      const averageRisk = entry.totalRisk / entry.suspiciousCount
      const baseMuleScore = Math.min(100, Math.round((averageRisk * 0.75) + (entry.suspiciousCount * 6) + ((riskBandWeight[entry.riskBand] || 45) * 0.2)))

      return {
        ...entry,
        label: entry.accountNumber,
        account: account || null,
        averageRisk,
        muleScore: baseMuleScore,
        connectedEntities: new Set([entry.accountNumber])
      }
    })

    const suspiciousAccountsSorted = [...suspiciousAccounts].sort((a, b) => b.muleScore - a.muleScore)
    const topMuleScore = suspiciousAccountsSorted[0]?.muleScore || 0

    const beneficiaries = [...new Set(suspiciousTransactions.map((transaction) => transaction.destinationAccount))]
    const connectedEntities = [
      ...suspiciousAccountsSorted.map((account) => ({
        id: account.accountNumber,
        type: 'Account',
        label: account.accountNumber,
        score: account.muleScore,
        summary: `${account.suspiciousCount} suspicious transactions · ${money(account.totalAmount)}`
      })),
      ...beneficiaries.map((beneficiary) => ({
        id: `beneficiary-${beneficiary}`,
        type: 'Beneficiary',
        label: beneficiary,
        score: 74,
        summary: 'Beneficiary flow identified from suspicious transfers'
      })),
      ...suspiciousTransactions.map((transaction, index) => ({
        id: `upi-${index}`,
        type: 'UPI ID',
        label: `UPI-${transaction.destinationAccount.slice(-4)}`,
        score: Math.min(99, Number(transaction.riskScore || 0) + 4),
        summary: 'UPI footprint reconstructed from destination identifiers'
      })),
      ...suspiciousAccountsSorted.map((account, index) => ({
        id: `phone-${index}`,
        type: 'Phone number',
        label: `PHONE-${(account.owner || `ACC-${index + 1}`).slice(-4)}`,
        score: Math.min(94, account.muleScore - 10),
        summary: 'Derived investigation handle from account metadata'
      })),
      ...suspiciousAccountsSorted.map((account, index) => ({
        id: `device-${index}`,
        type: 'Device',
        label: `DEVICE-${index + 1}`,
        score: Math.min(91, account.muleScore - 16),
        summary: 'Device cluster inference derived from current account context'
      }))
    ]

    const graphNodes = [
      ...suspiciousAccountsSorted.map((account, index) => ({
        id: account.accountNumber,
        label: account.accountNumber,
        type: 'Account',
        score: account.muleScore,
        x: 120,
        y: 100 + index * 82
      })),
      ...suspiciousTransactions.map((transaction, index) => ({
        id: transaction.id,
        label: transaction.id,
        type: 'Transaction',
        score: transaction.riskScore,
        x: 365,
        y: 100 + index * 82
      })),
      ...beneficiaries.map((beneficiary, index) => ({
        id: `beneficiary-${beneficiary}`,
        label: beneficiary,
        type: 'Beneficiary',
        score: 74,
        x: 620,
        y: 100 + index * 82
      }))
    ]

    const graphEdges = suspiciousTransactions.flatMap((transaction) => [
      {
        id: `${transaction.id}-source`,
        source: transaction.sourceAccount,
        target: transaction.id,
        label: transaction.type,
        amount: transaction.amount
      },
      {
        id: `${transaction.id}-beneficiary`,
        source: transaction.id,
        target: `beneficiary-${transaction.destinationAccount}`,
        label: money(transaction.amount),
        amount: transaction.amount
      }
    ])

    const totalAmount = suspiciousTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
    const averageRisk = suspiciousTransactions.reduce((sum, transaction) => sum + Number(transaction.riskScore || 0), 0) / suspiciousTransactions.length
    const fraudRingRiskScore = Math.min(100, Math.round((averageRisk * 0.6) + (topMuleScore * 0.4)))

    const maxRowCount = Math.max(
      suspiciousAccountsSorted.length,
      suspiciousTransactions.length,
      beneficiaries.length,
      1
    )
    const graphHeight = Math.max(360, 60 + maxRowCount * 82 + 60)

    return {
      suspiciousAccounts: suspiciousAccountsSorted,
      suspiciousTransactions,
      connectedEntities,
      graphNodes,
      graphEdges,
      graphHeight,
      fraudRingRiskScore,
      muleAccountScore: topMuleScore,
      totalAmount,
      severity: severityFor(fraudRingRiskScore)
    }
  }, [accounts, transactions])


  const alerts = useMemo(() => {
    if (!analysis.suspiciousTransactions.length) return []

    return analysis.suspiciousTransactions.map((transaction, index) => {
      const account = accounts.find((item) => item.accountNumber === transaction.sourceAccount)
      const relatedTransactionCount = analysis.suspiciousTransactions.filter((item) => item.sourceAccount === transaction.sourceAccount).length
      const alertType = normalizeAlertType(transaction.type)
      const alertId = `AL-${String(index + 1).padStart(4, '0')}`
      const entity = transaction.sourceAccount
      const recommendation = buildRecommendation(
        {
          entity,
          amount: transaction.amount,
          severity: severityFor(transaction.riskScore),
          riskScore: transaction.riskScore,
          alertType,
          relatedFraudRing: `RING-${entity.slice(-4)}`
        },
        account,
        relatedTransactionCount
      )

      return {
        id: alertId,
        entity,
        alertType,
        fraudType: transaction.type,
        riskScore: Number(transaction.riskScore || 0),
        severity: severityFor(transaction.riskScore),
        amount: Number(transaction.amount || 0),
        date: transaction.timestamp,
        detectionReason: `${transaction.type} transfer from ${transaction.sourceAccount} to ${transaction.destinationAccount} in ${transaction.location}. Existing risk score ${transaction.riskScore}/100 and ${relatedTransactionCount} linked suspicious transaction(s) indicate a suspected mule or takeover pattern.`,
        relatedFraudRing: `RING-${entity.slice(-4)}`,
        status: 'NEW',
        transactionSummary: `${transaction.type} transfer of ${money(transaction.amount)} from ${transaction.sourceAccount} to ${transaction.destinationAccount} at ${transaction.location}.`,
        fraudRingSummary: `${entity} is linked to ${relatedTransactionCount} suspicious transaction(s) involving beneficiary ${transaction.destinationAccount} and associated account-level risk indicators.`,
        evidence: [
          `Transaction ${transaction.id} recorded at ${formatDateTime(transaction.timestamp)} in ${transaction.location}`,
          `Current risk indicator is ${transaction.riskIndicator} and score is ${transaction.riskScore}/100`,
          `Destination beneficiary ${transaction.destinationAccount} is already part of the suspicious ring cluster`,
          `Related account risk band is ${account?.riskBand || 'MEDIUM'} with ${relatedTransactionCount} linked suspicious activity events`
        ],
        recommendedAction: recommendation.recommendedAction,
        confidenceScore: recommendation.confidenceScore,
        reason: recommendation.reason,
        supportingEvidence: recommendation.supportingEvidence,
        investigatorNotes: 'Suspected misuse pattern identified. Requires human review before final disposition.'
      }
    })
  }, [accounts, analysis.suspiciousTransactions])

  const effectiveAlerts = useMemo(() => {
    return alerts.map((alert) => ({
      ...alert,
      status: alertStatusMap[alert.id] || alert.status
    }))
  }, [alerts, alertStatusMap])

  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return effectiveAlerts.filter((alert) => {
      const searchMatches =
        !query ||
        alert.id.toLowerCase().includes(query) ||
        alert.entity.toLowerCase().includes(query) ||
        alert.alertType.toLowerCase().includes(query) ||
        alert.detectionReason.toLowerCase().includes(query)

      const severityMatches = severityFilter === 'ALL' || alert.severity === severityFilter
      const typeMatches = alertTypeFilter === 'ALL' || alert.alertType === alertTypeFilter
      const statusMatches = statusFilter === 'ALL' || alert.status === statusFilter
      const dateMatches = !dateFilter || formatDate(alert.date) === formatDate(dateFilter)

      return searchMatches && severityMatches && typeMatches && statusMatches && dateMatches
    })
  }, [dateFilter, effectiveAlerts, search, severityFilter, alertTypeFilter, statusFilter])

  useEffect(() => {
    if (filteredAlerts.length === 0) {
      setSelectedAlertId(null)
      return
    }

    if (!selectedAlertId || !filteredAlerts.some((alert) => alert.id === selectedAlertId)) {
      setSelectedAlertId(filteredAlerts[0].id)
    }
  }, [filteredAlerts, selectedAlertId])

  const selectedAlert = filteredAlerts.find((alert) => alert.id === selectedAlertId) || filteredAlerts[0] || null

  const metrics = useMemo(() => {
    const totalAlerts = effectiveAlerts.length
    const criticalAlerts = effectiveAlerts.filter((alert) => alert.severity === 'CRITICAL').length
    const highRiskAlerts = effectiveAlerts.filter((alert) => alert.severity === 'HIGH').length
    const newAlerts = effectiveAlerts.filter((alert) => alert.status === 'NEW').length
    const resolvedAlerts = effectiveAlerts.filter((alert) => alert.status === 'RESOLVED').length

    return { totalAlerts, criticalAlerts, highRiskAlerts, newAlerts, resolvedAlerts }
  }, [effectiveAlerts])

  const alertTypes = [...new Set(effectiveAlerts.map((alert) => alert.alertType))]

  useEffect(() => {
    if (selectedAlert) {
      setDispatchForm((current) => ({
        ...current,
        alertId: selectedAlert.id,
        entity: selectedAlert.entity,
        fraudType: selectedAlert.alertType,
        riskScore: String(selectedAlert.riskScore),
        severity: selectedAlert.severity,
        transactionSummary: selectedAlert.transactionSummary,
        fraudRingSummary: selectedAlert.fraudRingSummary,
        evidence: selectedAlert.evidence.join('\n'),
        investigatorNotes: selectedAlert.investigatorNotes,
        recommendedAction: selectedAlert.recommendedAction
      }))
    }
  }, [selectedAlert])

  const prepareDispatch = (alert) => {
    setSelectedAlertId(alert.id)
    setDispatchResult(null)
    setDispatchForm({
      recipient: 'Bank',
      alertId: alert.id,
      entity: alert.entity,
      fraudType: alert.alertType,
      riskScore: String(alert.riskScore),
      severity: alert.severity,
      transactionSummary: alert.transactionSummary,
      fraudRingSummary: alert.fraudRingSummary,
      evidence: alert.evidence.join('\n'),
      investigatorNotes: alert.investigatorNotes,
      recommendedAction: alert.recommendedAction
    })
  }

  const handleDispatch = async (event) => {
    event.preventDefault()

    const referenceId = `DSP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`
    const dispatchRecord = {
      referenceId,
      alertId: dispatchForm.alertId,
      recipient: dispatchForm.recipient,
      entity: dispatchForm.entity,
      fraudType: dispatchForm.fraudType,
      riskScore: Number(dispatchForm.riskScore || 0),
      severity: dispatchForm.severity,
      transactionSummary: dispatchForm.transactionSummary,
      fraudRingSummary: dispatchForm.fraudRingSummary,
      evidence: dispatchForm.evidence,
      investigatorNotes: dispatchForm.investigatorNotes,
      recommendedAction: dispatchForm.recommendedAction,
      dispatchTime: new Date().toISOString(),
      status: 'Dispatched'
    }

    try {
      const response = await api.post('/dispatches', dispatchRecord)
      const savedRecord = response.data || dispatchRecord

      setDispatches((current) => [savedRecord, ...current])
      setAlertStatusMap((current) => ({
        ...current,
        [dispatchForm.alertId]: 'DISPATCHED'
      }))
      setDispatchResult(savedRecord)
    } catch (err) {
      console.error('Failed to persist alert dispatch:', err)
      setDispatches((current) => [dispatchRecord, ...current])
      setAlertStatusMap((current) => ({
        ...current,
        [dispatchForm.alertId]: 'DISPATCHED'
      }))
      setDispatchResult(dispatchRecord)
    }
  }


  const dispatchesForSelectedAlert = dispatches.filter((item) => item.alertId === selectedAlert?.id)

  const graphNodeMap = useMemo(() => new Map((analysis.graphNodes || []).map((node) => [node.id, node])), [analysis.graphNodes])

  const selectedEntity = useMemo(() => {
    if (!selectedNode) return null
    return analysis.connectedEntities.find((entity) => entity.id === selectedNode) || analysis.suspiciousAccounts.find((account) => account.accountNumber === selectedNode) || null
  }, [analysis.connectedEntities, analysis.suspiciousAccounts, selectedNode])

  useEffect(() => {
    if (analysis.graphNodes.length > 0 && !selectedNode) {
      setSelectedNode(analysis.graphNodes[0].id)
    }
  }, [analysis.graphNodes, selectedNode])

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="content"><div className="card empty-state">Loading investigation workspace…</div></main>
      </div>
    )
  }


  const connectedEntityCount = analysis.connectedEntities.length

  return (
    <div className="app-shell">
      <Sidebar />


      <main className="content">
        <div className="topbar">
          <div>
            <div className="eyebrow">Module 6 / Investigation, Alerts &amp; Fraud Rings</div>
            <h2>Fraud Ring Detection Workspace</h2>
          </div>
          <button className="logout-button" onClick={() => { localStorage.clear(); navigate('/login') }}>Logout</button>
        </div>

        <div className="grid grid-4">
          <div className="card metric-card">
            <div className="metric-label">Fraud ring risk score</div>
            <div className="metric-value">{analysis.fraudRingRiskScore}</div>
            <div className="metric-footer">Calculated from suspicious transaction overlap</div>
          </div>

          <div className="card metric-card">
            <div className="metric-label">Mule account score</div>
            <div className="metric-value">{analysis.muleAccountScore}</div>
            <div className="metric-footer">Highest-risk account in the ring</div>
          </div>

          <div className="card metric-card">
            <div className="metric-label">Suspicious transactions</div>
            <div className="metric-value">{analysis.suspiciousTransactions.length}</div>
            <div className="metric-footer">Transactions currently linked to the ring</div>
          </div>

          <div className="card metric-card">
            <div className="metric-label">Total amount involved</div>
            <div className="metric-value">{money(analysis.totalAmount)}</div>
            <div className="metric-footer">Aggregated exposure across suspicious transfers</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Section 1</div>
              <h3>Fraud Ring / Mule Network Detection</h3>
            </div>
            <span className={`badge ${analysis.severity.toLowerCase()}`}>{analysis.severity}</span>
          </div>

          <div className="command-grid" style={{ marginTop: 16 }}>
            <div className="card">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">NETWORK RELATIONSHIP GRAPH</div>
                  <h3>Suspicious account-to-beneficiary connections</h3>
                </div>
                <span className="status-chip"><i /> LIVE VIEW</span>
              </div>

              <div className="trail-graph" style={{ marginTop: 16 }}>
                <svg viewBox={`0 0 760 ${analysis.graphHeight || 450}`} style={{ height: `${analysis.graphHeight || 450}px`, minHeight: `${analysis.graphHeight || 450}px` }} role="img" aria-label="Fraud ring relationship graph">

                  <defs>
                    <marker id="investigation-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L7,3 z" fill="#87918b" />
                    </marker>
                  </defs>

                  {analysis.graphEdges.map((edge) => {
                    const from = graphNodeMap.get(edge.source)
                    const to = graphNodeMap.get(edge.target)

                    if (!from || !to) return null

                    return (
                      <g key={edge.id}>
                        <line
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          stroke={edge.label.includes('₹') ? '#d7f36b' : '#52605a'}
                          strokeWidth={edge.label.includes('₹') ? 2.5 : 1.5}
                          markerEnd="url(#investigation-arrow)"
                        />
                        <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6} fill="#b5c0b9" fontSize="10">
                          {edge.label}
                        </text>
                      </g>
                    )
                  })}

                  {analysis.graphNodes.map((node) => {
                    const isSelected = selectedNode === node.id
                    const fillColor = node.type === 'Account' ? '#d7f36b' : node.type === 'Transaction' ? '#ff766a' : '#efb95f'

                    return (
                      <g key={node.id} onClick={() => setSelectedNode(node.id)} style={{ cursor: 'pointer' }}>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isSelected ? 24 : 20}
                          fill="#121616"
                          stroke={fillColor}
                          strokeWidth={isSelected ? 4 : 2}
                        />
                        <text x={node.x} y={node.y + 4} textAnchor="middle" fill={fillColor} fontSize="9">
                          {node.type.slice(0, 1)}
                        </text>
                        <text x={node.x} y={node.y + 38} textAnchor="middle" fill="#eef2eb" fontSize="10">
                          {node.label.length > 14 ? `${node.label.slice(0, 12)}…` : node.label}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              <div className="graph-legend">
                <span><i className="legend-dot high" /> Account</span>
                <span><i className="legend-dot critical" /> Transaction</span>
                <span><i className="legend-dot medium" /> Beneficiary</span>
              </div>
            </div>

            <div className="card">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">CONNECTED ENTITIES</div>
                  <h3>Node inventory</h3>
                </div>
                <span className="status-chip">{connectedEntityCount} LINKS</span>
              </div>

              <div className="priority-list" style={{ marginTop: 16 }}>
                {analysis.connectedEntities.map((entity) => (
                  <button
                    key={entity.id}
                    className={`priority-row ${selectedNode === entity.id ? 'selected' : ''}`}
                    onClick={() => setSelectedNode(entity.id)}
                  >
                    <span className="priority-rank">{entity.type}</span>
                    <span className="priority-name">
                      <strong>{entity.label}</strong>
                      <small>{entity.summary}</small>
                    </span>
                    <span className="priority-score" style={{ color: entity.score >= 80 ? '#ff766a' : entity.score >= 60 ? '#d7f36b' : '#efb95f' }}>
                      {entity.score}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginTop: 18 }}>
            <div className="card">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">SELECTED ENTITY</div>
                  <h3>{selectedEntity?.label || 'No entity selected'}</h3>
                </div>
                <span className="badge medium">{selectedEntity?.type || 'inactive'}</span>
              </div>

              {selectedEntity ? (
                <>
                  <div className="grid grid-2 risk-stat-grid">
                    <div>
                      <span className="metric-label">Score</span>
                      <strong>{selectedEntity.score ?? 0}</strong>
                    </div>
                    <div>
                      <span className="metric-label">Severity</span>
                      <strong>{severityFor(selectedEntity.score ?? 0)}</strong>
                    </div>
                    <div>
                      <span className="metric-label">Type</span>
                      <strong>{selectedEntity.type}</strong>
                    </div>
                    <div>
                      <span className="metric-label">Linked pattern</span>
                      <strong>{selectedEntity.summary || 'Entity detected in suspicious cluster'}</strong>
                    </div>
                  </div>

                </>
              ) : (
                <div className="empty-state">Select a node to view relationship detail.</div>
              )}
            </div>

            <div className="card">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">INVESTIGATIVE CONTEXT</div>
                  <h3>Current ring interpretation</h3>
                </div>
              </div>

              <p className="prediction-note">
                The current synthetic dataset exposes account-level, beneficiary-level, and transaction-channel relationships. Phone and device identifiers are inferred from the existing account metadata so the investigation view can surface suspicious clusters without altering the original Modules 1–4 data model.
              </p>

              <div className="evidence-list">
                <div className="evidence-row">
                  <span className="badge high">Accounts</span>
                  <div>
                    <strong>{analysis.suspiciousAccounts.length} suspicious accounts</strong>
                    <small>Accounts with repeated suspicious transaction activity</small>
                  </div>
                </div>
                <div className="evidence-row">
                  <span className="badge critical">Beneficiaries</span>
                  <div>
                    <strong>{new Set(analysis.suspiciousTransactions.map((tx) => tx.destinationAccount)).size} unique beneficiaries</strong>
                    <small>Destination targets receiving funds from suspicious sources</small>
                  </div>
                </div>
                <div className="evidence-row">
                  <span className="badge medium">Transactions</span>
                  <div>
                    <strong>{analysis.suspiciousTransactions.length} suspicious transfers</strong>
                    <small>Current transactions included in the fraud ring analysis</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="panel-heading" style={{ marginBottom: 16 }}>
            <div>
              <div className="eyebrow">Section 2</div>
              <h3>Predictive Alert Generation</h3>
            </div>
          </div>

          <div className="grid grid-5">
            <div className="card metric-card">
              <div className="metric-label">Total Alerts</div>
              <div className="metric-value">{metrics.totalAlerts}</div>
              <div className="metric-footer">All generated alerts</div>
            </div>
            <div className="card metric-card">
              <div className="metric-label">Critical Alerts</div>
              <div className="metric-value">{metrics.criticalAlerts}</div>
              <div className="metric-footer">Requires urgent attention</div>
            </div>
            <div className="card metric-card">
              <div className="metric-label">High Risk Alerts</div>
              <div className="metric-value">{metrics.highRiskAlerts}</div>
              <div className="metric-footer">Priority investigation queue</div>
            </div>
            <div className="card metric-card">
              <div className="metric-label">New Alerts</div>
              <div className="metric-value">{metrics.newAlerts}</div>
              <div className="metric-footer">Awaiting review</div>
            </div>
            <div className="card metric-card">
              <div className="metric-label">Resolved Alerts</div>
              <div className="metric-value">{metrics.resolvedAlerts}</div>
              <div className="metric-footer">Closed after review</div>
            </div>
          </div>


          <div className="filter-row" style={{ marginTop: 18 }}>
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search alert, entity, or reason" />
            <select className="select" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
              <option value="ALL">All severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
            <select className="select" value={alertTypeFilter} onChange={(event) => setAlertTypeFilter(event.target.value)}>
              <option value="ALL">All alert types</option>
              {alertTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="NEW">NEW</option>
              <option value="DISPATCHED">DISPATCHED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
            <input className="input" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          </div>

          <div className="grid grid-2" style={{ marginTop: 18 }}>
            <div className="card">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">ALERT QUEUE</div>
                  <h3>Generated alerts</h3>
                </div>
                <span className="status-chip">{filteredAlerts.length} MATCHED</span>
              </div>

              <div className="alert-card-list">
                {filteredAlerts.length ? filteredAlerts.map((alert) => (
                  <button key={alert.id} className={`alert-card ${selectedAlert?.id === alert.id ? 'selected' : ''}`} onClick={() => setSelectedAlertId(alert.id)}>
                    <div className="alert-top-row">
                      <span className={`badge ${alert.severity.toLowerCase()}`}>{alert.severity}</span>
                      <span className="alert-id">{alert.id}</span>
                    </div>
                    <div className="alert-entity">{alert.entity}</div>
                    <div className="alert-meta-grid">
                      <div>
                        <small>Type</small>
                        <strong>{alert.alertType}</strong>
                      </div>
                      <div>
                        <small>Score</small>
                        <strong>{alert.riskScore}</strong>
                      </div>
                      <div>
                        <small>Amount</small>
                        <strong>{money(alert.amount)}</strong>
                      </div>
                      <div>
                        <small>Status</small>
                        <strong>{alert.status}</strong>
                      </div>
                    </div>
                    <div className="alert-footer-row">
                      <span>{formatDate(alert.date)}</span>
                      <span>{alert.relatedFraudRing}</span>
                    </div>
                  </button>
                )) : <div className="empty-state">No alerts match the current filters.</div>}
              </div>
            </div>

            <div className="card">
              {selectedAlert ? (
                <>
                  <div className="panel-heading">
                    <div>
                      <div className="eyebrow">SELECTED ALERT</div>
                      <h3>{selectedAlert.id}</h3>
                    </div>
                    <span className={`badge ${selectedAlert.severity.toLowerCase()}`}>{selectedAlert.severity}</span>
                  </div>

                  <div className="alert-detail-grid">
                    <div>
                      <span className="metric-label">Account / Entity</span>
                      <strong>{selectedAlert.entity}</strong>
                    </div>
                    <div>
                      <span className="metric-label">Alert Type</span>
                      <strong>{selectedAlert.alertType}</strong>
                    </div>
                    <div>
                      <span className="metric-label">Risk Score</span>
                      <strong>{selectedAlert.riskScore}</strong>
                    </div>
                    <div>
                      <span className="metric-label">Amount</span>
                      <strong>{money(selectedAlert.amount)}</strong>
                    </div>
                    <div>
                      <span className="metric-label">Related Fraud Ring</span>
                      <strong>{selectedAlert.relatedFraudRing}</strong>
                    </div>
                    <div>
                      <span className="metric-label">Status</span>
                      <strong>{selectedAlert.status}</strong>
                    </div>
                  </div>

                  <div className="detail-block">
                    <span className="metric-label">Detection Reason</span>
                    <p>{selectedAlert.detectionReason}</p>
                  </div>

                  <div className="detail-block">
                    <span className="metric-label">Recommended Action</span>
                    <div className="recommendation-box">
                      <div className="recommendation-header">
                        <strong>{selectedAlert.recommendedAction}</strong>
                        <span className="confidence-pill">Confidence {selectedAlert.confidenceScore}%</span>
                      </div>
                      <p>{selectedAlert.reason}</p>
                      <ul>
                        {selectedAlert.supportingEvidence.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className="inline-actions" style={{ marginTop: 16 }}>
                    <button className="primary-button" onClick={() => prepareDispatch(selectedAlert)}>Prepare Dispatch</button>
                  </div>
                </>
              ) : (
                <div className="empty-state">Select an alert to review its recommendation.</div>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="eyebrow">Section 3</div>
          <h3>Investigator Action Recommendation</h3>

          {selectedAlert ? (
            <div className="grid grid-2" style={{ marginTop: 18 }}>
              <div className="card">
                <div className="panel-heading">
                  <div>
                    <div className="eyebrow">RECOMMENDED ACTION</div>
                    <h3>{selectedAlert.recommendedAction}</h3>
                  </div>
                  <span className="confidence-pill">{selectedAlert.confidenceScore}% confidence</span>
                </div>
                <p className="prediction-note">{selectedAlert.reason}</p>
                <div className="evidence-list">
                  {selectedAlert.supportingEvidence.map((item, index) => (
                    <div className="evidence-row" key={`${selectedAlert.id}-${index}`}>
                      <span className="badge medium">Evidence</span>
                      <div>
                        <strong>{`Item ${index + 1}`}</strong>
                        <small>{item}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="panel-heading">
                  <div>
                    <div className="eyebrow">DECISION LANGUAGE</div>
                    <h3>Investigator guidance</h3>
                  </div>
                </div>
                <p className="prediction-note">
                  This recommendation is intentionally framed as a suspected fraud pattern and a required investigation. It does not classify the activity as confirmed fraud.
                </p>
                <div className="evidence-list">
                  <div className="evidence-row">
                    <span className="badge high">Status</span>
                    <div><strong>Suspected Fraud</strong><small>Current analysis indicates elevated risk but not confirmed misconduct.</small></div>
                  </div>
                  <div className="evidence-row">
                    <span className="badge critical">Action</span>
                    <div><strong>Requires Investigation</strong><small>Recommended next step is to validate the account and transaction chain.</small></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">No alert selected.</div>
          )}
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="eyebrow">Section 4</div>
          <h3>LEA / Bank / I4C Alert Dispatch</h3>

          <div className="grid grid-2" style={{ marginTop: 18 }}>
            <div className="card">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">DISPATCH FORM</div>
                  <h3>Create mock dispatch</h3>
                </div>
              </div>

              <form onSubmit={handleDispatch} className="dispatch-form-grid">
                <label className="label">
                  Recipient
                  <select className="select" value={dispatchForm.recipient} onChange={(event) => setDispatchForm((current) => ({ ...current, recipient: event.target.value }))}>
                    <option value="Bank">Bank</option>
                    <option value="LEA">LEA</option>
                    <option value="I4C">I4C</option>
                  </select>
                </label>

                <label className="label">
                  Alert ID
                  <input className="input" value={dispatchForm.alertId} readOnly />
                </label>

                <label className="label">
                  Account / Entity
                  <input className="input" value={dispatchForm.entity} readOnly />
                </label>

                <label className="label">
                  Fraud Type
                  <input className="input" value={dispatchForm.fraudType} readOnly />
                </label>

                <label className="label">
                  Risk Score
                  <input className="input" value={dispatchForm.riskScore} readOnly />
                </label>

                <label className="label">
                  Severity
                  <input className="input" value={dispatchForm.severity} readOnly />
                </label>

                <label className="label full-width">
                  Transaction Summary
                  <textarea className="textarea" value={dispatchForm.transactionSummary} onChange={(event) => setDispatchForm((current) => ({ ...current, transactionSummary: event.target.value }))} />
                </label>

                <label className="label full-width">
                  Fraud Ring Summary
                  <textarea className="textarea" value={dispatchForm.fraudRingSummary} onChange={(event) => setDispatchForm((current) => ({ ...current, fraudRingSummary: event.target.value }))} />
                </label>

                <label className="label full-width">
                  Evidence
                  <textarea className="textarea" value={dispatchForm.evidence} onChange={(event) => setDispatchForm((current) => ({ ...current, evidence: event.target.value }))} />
                </label>

                <label className="label full-width">
                  Investigator Notes
                  <textarea className="textarea" value={dispatchForm.investigatorNotes} onChange={(event) => setDispatchForm((current) => ({ ...current, investigatorNotes: event.target.value }))} />
                </label>

                <label className="label full-width">
                  Recommended Action
                  <input className="input" value={dispatchForm.recommendedAction} onChange={(event) => setDispatchForm((current) => ({ ...current, recommendedAction: event.target.value }))} />
                </label>

                <div className="inline-actions" style={{ gridColumn: '1 / -1' }}>
                  <button className="primary-button" type="submit">Dispatch Alert</button>
                </div>
              </form>
            </div>

            <div className="card">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">DISPATCH STATUS</div>
                  <h3>Mock dispatch result</h3>
                </div>
              </div>

              {dispatchResult ? (
                <div className="dispatch-status-box">
                  <div className="dispatch-status-item">
                    <span className="metric-label">Reference ID</span>
                    <strong>{dispatchResult.referenceId}</strong>
                  </div>
                  <div className="dispatch-status-item">
                    <span className="metric-label">Recipient</span>
                    <strong>{dispatchResult.recipient}</strong>
                  </div>
                  <div className="dispatch-status-item">
                    <span className="metric-label">Dispatch Time</span>
                    <strong>{formatDateTime(dispatchResult.dispatchTime)}</strong>
                  </div>
                  <div className="dispatch-status-item">
                    <span className="metric-label">Status</span>
                    <strong>{dispatchResult.status}</strong>
                  </div>
                </div>
              ) : (
                <div className="empty-state">Dispatch an alert to view the mock recipient response.</div>
              )}

              {dispatchesForSelectedAlert.length > 0 && (
                <div className="dispatch-history" style={{ marginTop: 16 }}>
                  <div className="eyebrow">HISTORY</div>
                  {dispatchesForSelectedAlert.map((record) => (
                    <div className="evidence-row" key={record.referenceId}>
                      <span className="badge medium">{record.status}</span>
                      <div>
                        <strong>{record.recipient}</strong>
                        <small>{record.referenceId} · {formatDateTime(record.dispatchTime)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="eyebrow">Investigation Timeline</div>
          <h3>Alert progression</h3>

          {selectedAlert ? (
            <div className="timeline-wrapper">
              <div className="timeline-steps">
                {buildTimeline(selectedAlert).map((event, index) => (
                  <div key={`${selectedAlert.id}-${index}`} className="timeline-step">
                    <span className="timeline-index">{index + 1}</span>
                    <div className="timeline-body">
                      <strong>{event.action}</strong>
                      <small>{event.investigator}</small>
                      <small>{formatDateTime(event.timestamp)}</small>
                      <span className="badge small-status">{event.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">Select an alert to view the investigation timeline.</div>
          )}
        </div>
      </main>

    </div>
  )
}
