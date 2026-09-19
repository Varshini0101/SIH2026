import { demoAccounts, demoATMLocations } from '../data/demoData.js'

const PONR_TYPES = new Set(['ATM_CASH_OUT', 'CRYPTO_ONRAMP', 'FOREIGN_REMITTANCE', 'P2P_SETTLEMENT'])
const DEFAULT_FEE_RATE = 0.015

const minutesBetween = (first, second) => Math.max(0, (new Date(second) - new Date(first)) / 60000)
const round = (value) => Math.round(value * 100) / 100

const sampleGraph = () => {
  const nodes = [
    { id: 'victim-001', label: 'Victim pool', type: 'ACCOUNT', risk: 20, balance: 100000 },
    { id: 'mule-001', label: demoAccounts[0].accountNumber, type: 'MULE_WALLET', risk: 84, balance: 0 },
    { id: 'mule-002', label: demoAccounts[1].accountNumber, type: 'MULE_WALLET', risk: 72, balance: 0 },
    { id: 'mule-003', label: demoAccounts[3].accountNumber, type: 'MULE_WALLET', risk: 91, balance: 0 },
    { id: 'mule-004', label: demoAccounts[4].accountNumber, type: 'MULE_WALLET', risk: 88, balance: 0 },
    { id: 'atm-001', label: demoATMLocations[0].name, type: 'ATM', risk: 98, balance: 0, ponrType: 'ATM_CASH_OUT' },
    { id: 'crypto-001', label: 'Exchange deposit • 0x7AC', type: 'CRYPTO_ONRAMP', risk: 96, balance: 0, ponrType: 'CRYPTO_ONRAMP' },
    { id: 'remit-001', label: 'Foreign remittance • AE', type: 'FOREIGN_REMITTANCE', risk: 94, balance: 0, ponrType: 'FOREIGN_REMITTANCE' },
    { id: 'p2p-001', label: 'P2P settlement cluster', type: 'P2P_SETTLEMENT', risk: 90, balance: 0, ponrType: 'P2P_SETTLEMENT' }
  ]
  const edges = [
    { id: 'tx-001', source: 'victim-001', target: 'mule-001', amount: 100000, fee: 0, timestamp: '2026-09-09T12:00:00Z', channel: 'UPI' },
    { id: 'tx-002', source: 'mule-001', target: 'mule-002', amount: 48000, fee: 720, timestamp: '2026-09-09T12:06:00Z', channel: 'IMPS' },
    { id: 'tx-003', source: 'mule-001', target: 'mule-003', amount: 37000, fee: 555, timestamp: '2026-09-09T12:07:00Z', channel: 'IMPS' },
    { id: 'tx-004', source: 'mule-001', target: 'p2p-001', amount: 15000, fee: 225, timestamp: '2026-09-09T12:08:00Z', channel: 'P2P' },
    { id: 'tx-005', source: 'mule-002', target: 'atm-001', amount: 30000, fee: 450, timestamp: '2026-09-09T12:13:00Z', channel: 'ATM' },
    { id: 'tx-006', source: 'mule-002', target: 'crypto-001', amount: 16000, fee: 240, timestamp: '2026-09-09T12:14:00Z', channel: 'EXCHANGE' },
    { id: 'tx-007', source: 'mule-003', target: 'mule-004', amount: 33000, fee: 495, timestamp: '2026-09-09T12:15:00Z', channel: 'NEFT' },
    { id: 'tx-008', source: 'mule-004', target: 'remit-001', amount: 30000, fee: 450, timestamp: '2026-09-09T12:23:00Z', channel: 'REMITTANCE' },
    { id: 'tx-009', source: 'mule-003', target: 'p2p-001', amount: 3000, fee: 45, timestamp: '2026-09-09T12:19:00Z', channel: 'P2P' }
  ]
  return { nodes, edges }
}

export const buildMoneyTrailGraph = (graph = sampleGraph()) => {
  const nodes = graph.nodes.map((node) => ({
    ...node,
    incoming: graph.edges.filter((edge) => edge.target === node.id).length,
    outgoing: graph.edges.filter((edge) => edge.source === node.id).length
  }))
  const enrichedEdges = graph.edges.map((edge) => ({
    ...edge,
    netAmount: round(edge.amount - (edge.fee || edge.amount * DEFAULT_FEE_RATE)),
    ponr: PONR_TYPES.has(graph.nodes.find((node) => node.id === edge.target)?.type)
  }))
  return { nodes, edges: enrichedEdges }
}

export const traceMoneyTrail = (graph, sourceId, maxHops = 6) => {
  const queue = [{ id: sourceId, hop: 0 }]
  const visited = new Set([sourceId])
  const tracedEdges = []
  while (queue.length) {
    const current = queue.shift()
    if (current.hop >= maxHops) continue
    graph.edges.filter((edge) => edge.source === current.id).forEach((edge) => {
      tracedEdges.push({ ...edge, hop: current.hop + 1 })
      if (!visited.has(edge.target)) {
        visited.add(edge.target)
        queue.push({ id: edge.target, hop: current.hop + 1 })
      }
    })
  }
  const nodes = graph.nodes.filter((node) => visited.has(node.id)).map((node) => {
    const outgoing = tracedEdges.filter((edge) => edge.source === node.id)
    const outgoingTotal = outgoing.reduce((sum, edge) => sum + edge.amount, 0)
    const incoming = tracedEdges.filter((edge) => edge.target === node.id)
    const velocity = incoming.length && outgoing.length
      ? round(outgoing.reduce((sum, edge) => sum + edge.amount, 0) / Math.max(1, minutesBetween(incoming[0].timestamp, outgoing[0].timestamp)))
      : 0
    return {
      ...node,
      splitPercentages: Object.fromEntries(outgoing.map((edge) => [edge.target, round((edge.amount / outgoingTotal) * 100)])),
      aggregationPattern: incoming.length > 1 ? 'AGGREGATION' : outgoing.length > 1 ? 'SPLIT' : 'LINEAR',
      velocityPerMinute: velocity
    }
  })
  return { nodes, edges: tracedEdges, sourceId, maxHops }
}

export const detectPONR = (graph, now = new Date().toISOString()) => graph.edges
  .filter((edge) => edge.ponr)
  .map((edge) => {
    const target = graph.nodes.find((node) => node.id === edge.target)
    const ttlMinutes = round(minutesBetween(now, edge.timestamp))
    return {
      edgeId: edge.id,
      nodeId: target.id,
      type: target.ponrType,
      timestamp: edge.timestamp,
      ttlMinutes: Math.max(0, ttlMinutes),
      status: new Date(edge.timestamp) >= new Date(now) ? 'OPEN' : 'REACHED',
      riskScore: target.risk
    }
  })

export const estimateAmountAtRisk = (graph, sourceId, now = new Date().toISOString()) => {
  const balances = new Map([[sourceId, graph.nodes.find((node) => node.id === sourceId)?.balance || 0]])
  const orderedEdges = [...graph.edges].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  let recoverable = 0
  let ponrExposure = 0
  orderedEdges.forEach((edge) => {
    const netAmount = Math.min(edge.amount, balances.get(edge.source) ?? edge.amount) - (edge.fee || edge.amount * DEFAULT_FEE_RATE)
    if (netAmount <= 0) return
    balances.set(edge.target, (balances.get(edge.target) || 0) + netAmount)
    if (edge.ponr && new Date(edge.timestamp) <= new Date(now)) ponrExposure += netAmount
    else if (!edge.ponr && new Date(edge.timestamp) > new Date(now)) recoverable += netAmount
  })
  return { sourceId, recoverableAmount: round(Math.max(0, recoverable)), ponrExposure: round(ponrExposure), balances: Object.fromEntries(balances) }
}

export const replayIntervention = (graph, { freezeNodeId, freezeAt }) => {
  const blocked = new Set()
  const balances = new Map()
  let saved = 0
  const orderedEdges = [...graph.edges].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  orderedEdges.forEach((edge) => {
    if (new Date(edge.timestamp) >= new Date(freezeAt) && (edge.source === freezeNodeId || blocked.has(edge.source))) {
      blocked.add(edge.target)
      const preventedNet = round(edge.amount - (edge.fee || edge.amount * DEFAULT_FEE_RATE))
      if (edge.ponr) saved += preventedNet
      return
    }
    const net = round(edge.amount - (edge.fee || edge.amount * DEFAULT_FEE_RATE))
    balances.set(edge.target, (balances.get(edge.target) || 0) + net)
  })
  return { freezeNodeId, freezeAt, savedAmount: round(saved), preventedPONRExposure: round(saved), balances: Object.fromEntries(balances) }
}

export const getMoneyTrailDashboard = (caseId = 'CMP-1001') => {
  const graph = buildMoneyTrailGraph()
  const trace = traceMoneyTrail(graph, 'victim-001')
  const now = '2026-09-09T12:10:00Z'
  return {
    caseId,
    graph: trace,
    ponr: detectPONR(graph, now),
    amountAtRisk: estimateAmountAtRisk(graph, 'victim-001', now),
    source: 'DEMO GRAPH; replace with transaction stream by caseId'
  }
}
