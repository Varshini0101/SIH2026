import { getDashboardData } from './databaseService.js'
import { getMoneyTrailDashboard } from './moneyTrailService.js'
import { generatePredictionForCase, generateAtmRankingForCase } from './predictionService.js'

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(Number.isFinite(Number(value)) ? Number(value) : min, min), max)
const round = (value, digits = 2) => Number(Number(value || 0).toFixed(digits))
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
const weights = {
  fraudProbability: 0.25,
  cashoutProbability: 0.20,
  amountAtRisk: 0.15,
  timeUrgency: 0.15,
  locationProbability: 0.10,
  ponrProximity: 0.10,
  confidence: 0.05
}

export const classifyRisk = (score) => {
  const normalized = Math.round(clamp(score, 0, 100))
  if (normalized <= 20) return 'LOW'
  if (normalized <= 40) return 'MODERATE'
  if (normalized <= 60) return 'HIGH'
  if (normalized <= 80) return 'VERY HIGH'
  return 'CRITICAL'
}

const confidenceValue = (value) => {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'high') return 0.9
  if (normalized === 'medium') return 0.7
  if (normalized === 'low') return 0.45
  return 0.35
}

export const calibrateProbability = (rawProbability, calibration = null) => {
  const raw = clamp(rawProbability)
  if (!calibration || calibration.status !== 'available') {
    return {
      rawProbability: round(raw, 4),
      calibratedProbability: round(raw, 4),
      status: 'unavailable',
      method: null,
      message: 'Calibration unavailable: no model probability/calibration artifact is stored.'
    }
  }
  if (calibration.method === 'platt') {
    const calibrated = 1 / (1 + Math.exp(-(calibration.intercept + calibration.slope * raw)))
    return { rawProbability: round(raw, 4), calibratedProbability: round(calibrated, 4), status: 'available', method: 'platt' }
  }
  return { rawProbability: round(raw, 4), calibratedProbability: round(raw, 4), status: 'unavailable', method: null, message: 'Unsupported calibration method.' }
}

export const calculatePriority = (factors) => {
  const normalized = {
    fraudRisk: clamp(factors.fraudProbability),
    cashoutProbability: clamp(factors.cashoutProbability),
    amountAtRisk: clamp(factors.amountAtRisk),
    timeUrgency: clamp(factors.timeUrgency),
    locationRisk: clamp(factors.locationProbability),
    ponrProximity: clamp(factors.ponrProximity),
    confidence: clamp(factors.confidence)
  }
  const factorContributions = {
    fraud_risk: round(normalized.fraudRisk * 25),
    cashout_probability: round(normalized.cashoutProbability * 20),
    amount_at_risk: round(normalized.amountAtRisk * 15),
    time_urgency: round(normalized.timeUrgency * 15),
    location_risk: round(normalized.locationRisk * 10),
    ponr_proximity: round(normalized.ponrProximity * 10),
    confidence: round(normalized.confidence * 5)
  }
  const score = Math.min(100, Math.round(Object.values(factorContributions).reduce((sum, value) => sum + value, 0)))
  return { priorityScore: score, priorityLevel: classifyRisk(score), factorContributions, normalizedFactors: normalized }
}

export const calculateLocationRisk = (input) => {
  const factors = {
    fraudProbability: clamp(input.fraudProbability),
    cashoutProbability: clamp(input.cashoutProbability),
    amountAtRisk: clamp(input.amountAtRisk),
    timeUrgency: clamp(input.timeUrgency),
    locationProbability: clamp(input.locationProbability),
    ponrProximity: clamp(input.ponrProximity),
    confidence: clamp(input.confidence)
  }
  const contribution = {
    fraud_probability: round(factors.fraudProbability * 25),
    cashout_probability: round(factors.cashoutProbability * 20),
    amount_at_risk: round(factors.amountAtRisk * 15),
    time_urgency: round(factors.timeUrgency * 15),
    location_probability: round(factors.locationProbability * 10),
    ponr_proximity: round(factors.ponrProximity * 10),
    confidence: round(factors.confidence * 5)
  }
  const score = Math.min(100, Math.round(Object.values(contribution).reduce((sum, value) => sum + value, 0)))
  return { score, level: classifyRisk(score), contribution, factors }
}

export const explainAssessment = ({ location, evidence }) => {
  const items = [
    evidence.fraudProbability > 0 ? { sourceModule: 'Module 1', signal: 'fraud_probability', value: evidence.fraudProbability, message: `Fraud probability is ${Math.round(evidence.fraudProbability * 100)}%.` } : null,
    evidence.cashoutProbability > 0 ? { sourceModule: 'Module 3', signal: 'cashout_probability', value: evidence.cashoutProbability, message: `Cash-out candidate probability is ${Math.round(evidence.cashoutProbability * 100)}%.` } : null,
    evidence.amountAtRisk > 0 ? { sourceModule: 'Module 4', signal: 'amount_at_risk', value: evidence.amountAtRisk, message: `₹${Math.round(evidence.amountAtRisk).toLocaleString('en-IN')} is associated with this location or downstream branch.` } : null,
    evidence.caseAmountAtRisk > 0 ? { sourceModule: 'Module 4', signal: 'case_amount_at_risk', value: evidence.caseAmountAtRisk, message: `The traced case has ₹${Math.round(evidence.caseAmountAtRisk).toLocaleString('en-IN')} remaining recoverable across digital branches.` } : null,
    evidence.hopCount > 0 ? { sourceModule: 'Module 4', signal: 'transaction_hops', value: evidence.hopCount, message: `${evidence.hopCount} graph hop(s) connect the source activity to the monitored branch.` } : null,
    evidence.ponrTtlMinutes !== null ? { sourceModule: 'Module 4', signal: 'ponr_proximity', value: evidence.ponrTtlMinutes, message: evidence.ponrTtlMinutes <= 0 ? 'A PONR event has been reached.' : `The nearest PONR window is ${evidence.ponrTtlMinutes} minute(s) away.` } : null,
    evidence.velocity > 0 ? { sourceModule: 'Module 4', signal: 'transaction_velocity', value: evidence.velocity, message: `Observed flow velocity is ₹${Math.round(evidence.velocity).toLocaleString('en-IN')} per minute.` } : null,
    evidence.timeToCashoutMinutes !== null ? { sourceModule: 'Module 1/3', signal: 'time_to_cashout', value: evidence.timeToCashoutMinutes, message: `Predicted cash-out window is ${evidence.timeToCashoutMinutes} minute(s).` } : null
  ].filter(Boolean)
  return {
    locationId: location.id,
    summary: items.length ? `${location.name} is prioritized because ${items.slice(0, 3).map((item) => item.message.toLowerCase()).join(' ')}`
      : 'No upstream evidence is available for this location.',
    evidence: items
  }
}

export const simulateFalsePositiveCost = (input) => {
  const probability = clamp(input.predictionProbability)
  const amountAtRisk = Math.max(0, number(input.amountAtRisk))
  const interventionCost = Math.max(0, number(input.interventionCost))
  const recoveryIfIntervened = clamp(input.estimatedRecoveryIfIntervened)
  const recoveryIfMissed = clamp(input.estimatedRecoveryIfMissed)
  const expectedRecovery = amountAtRisk * ((probability * recoveryIfIntervened) + ((1 - probability) * recoveryIfMissed))
  const expectedLoss = amountAtRisk - expectedRecovery
  const expectedInterventionValue = (amountAtRisk * probability * (recoveryIfIntervened - recoveryIfMissed)) - interventionCost
  return {
    simulationLabel: 'SIMULATED ESTIMATES',
    expectedRecovery: round(expectedRecovery),
    expectedLoss: round(Math.max(0, expectedLoss)),
    interventionCost: round(interventionCost),
    expectedInterventionValue: round(expectedInterventionValue),
    assumptions: { probability, amountAtRisk, recoveryIfIntervened, recoveryIfMissed }
  }
}

const ponrForLocation = (moneyTrail, locationId) => {
  const matching = moneyTrail.ponr.filter((item) => item.nodeId === locationId || (locationId === 'atm-001' && item.type === 'ATM_CASH_OUT'))
  return matching.sort((a, b) => a.ttlMinutes - b.ttlMinutes)[0] || null
}

const buildUpstreamAdapter = async (caseId) => {
  const dashboard = await getDashboardData()
  const prediction = generatePredictionForCase(caseId)
  const caseAliases = { 'CMP-1001': 'CASE-00001', 'CMP-1002': 'CASE-00002', 'CMP-1003': 'CASE-00003', 'CMP-1004': 'CASE-00004', 'CMP-1005': 'CASE-00005', 'CMP-1006': 'CASE-00006' }
  const csvCaseId = caseAliases[caseId] || caseId
  const ranking = generateAtmRankingForCase(csvCaseId)
  const moneyTrail = getMoneyTrailDashboard(caseId)
  const candidates = prediction.predictions?.length ? prediction.predictions : ranking.rankedCandidates.map((candidate) => {
    const location = dashboard.atmLocations.find((item) => item.id === candidate.atmId)
    return { atmId: candidate.atmId, locationName: location?.name || candidate.atmId, latitude: location?.latitude, longitude: location?.longitude, predictionScore: candidate.score * 100 }
  })
  return { dashboard, prediction, ranking, moneyTrail, candidates }
}

export const getRiskIntelligence = async (caseId = 'CMP-1001') => {
  const upstream = await buildUpstreamAdapter(caseId)
  const transactions = upstream.dashboard.recentTransactions || []
  const totalAmount = transactions.reduce((sum, transaction) => sum + number(transaction.amount), 0)
  const maxLocationAmount = Math.max(...upstream.dashboard.atmLocations.map((location) => transactions.filter((transaction) => transaction.atmLocationId === location.id).reduce((sum, transaction) => sum + number(transaction.amount), 0)), 1)
  const time = upstream.ranking.timeToCashout
  const confidence = confidenceValue(time?.confidence)
  const timeMinutes = Number.isFinite(Number(time?.estimatedMinutes)) ? Number(time.estimatedMinutes) : null
  const module4AmountAtRisk = number(upstream.moneyTrail.amountAtRisk?.recoverableAmount)
  const locations = upstream.dashboard.atmLocations.map((location) => {
    const relatedTransactions = transactions.filter((transaction) => transaction.atmLocationId === location.id)
    const candidate = upstream.candidates.find((item) => item.atmId === location.id)
    const amount = relatedTransactions.reduce((sum, transaction) => sum + number(transaction.amount), 0)
    const fraudProbability = relatedTransactions.length ? Math.max(...relatedTransactions.map((transaction) => clamp(number(transaction.riskScore) / 100))) : 0
    const cashoutProbability = clamp(number(candidate?.predictionScore) / 100)
    const ponr = ponrForLocation(upstream.moneyTrail, location.id)
    const urgency = timeMinutes === null ? 0 : clamp(1 - (timeMinutes / 720))
    const risk = calculateLocationRisk({
      fraudProbability,
      cashoutProbability,
      amountAtRisk: clamp(amount / maxLocationAmount),
      timeUrgency: urgency,
      locationProbability: cashoutProbability,
      ponrProximity: ponr ? clamp(1 - (ponr.ttlMinutes / 720)) : 0,
      confidence
    })
    const priority = calculatePriority({
      fraudProbability,
      cashoutProbability,
      amountAtRisk: clamp(amount / Math.max(totalAmount, 1)),
      timeUrgency: urgency,
      locationProbability: cashoutProbability,
      ponrProximity: ponr ? clamp(1 - (ponr.ttlMinutes / 720)) : 0,
      confidence
    })
    const evidence = {
      fraudProbability,
      cashoutProbability,
      amountAtRisk: amount,
      hopCount: upstream.moneyTrail.graph.nodes.find((node) => node.id === 'victim-001')?.outgoing || 0,
      ponrTtlMinutes: ponr?.ttlMinutes ?? null,
      velocity: upstream.moneyTrail.graph.nodes.find((node) => node.id === 'mule-001')?.velocityPerMinute || 0,
      timeToCashoutMinutes: timeMinutes,
      caseAmountAtRisk: module4AmountAtRisk
    }
    return {
      id: location.id,
      name: location.name,
      type: location.type,
      zone: location.zone,
      latitude: location.latitude,
      longitude: location.longitude,
      riskScore: risk.score,
      riskLevel: risk.level,
      priorityScore: priority.priorityScore,
      priorityLevel: priority.priorityLevel,
      probability: cashoutProbability,
      confidence: { value: confidence, label: time?.confidence || 'unavailable', calibration: calibrateProbability(cashoutProbability) },
      amountAtRisk: round(amount),
      predictedCashoutTime: time?.timeWindow || 'Unavailable',
      predictedCashoutMinutes: timeMinutes,
      riskContribution: risk.contribution,
      priorityContributions: priority.factorContributions,
      explanation: explainAssessment({ location, evidence }),
      upstream: { module1: 'transaction riskScore/status', module2: 'money trail graph/PONR/amount-at-risk', module3: 'candidate ranking/time-to-cashout' },
      module4AmountAtRisk: round(module4AmountAtRisk)
    }
  })
  return {
    caseId,
    generatedAt: new Date().toISOString(),
    calibration: { status: 'unavailable', reason: 'Validation labels exist, but no stored model probabilities or calibration artifact is available.' },
    locations: locations.sort((left, right) => right.priorityScore - left.priorityScore),
    summary: {
      highestPriorityLocation: locations.sort((left, right) => right.priorityScore - left.priorityScore)[0]?.id || null,
      criticalLocations: locations.filter((location) => location.riskLevel === 'CRITICAL').length,
      totalAmountAtRisk: round(locations.reduce((sum, location) => sum + location.amountAtRisk, 0))
    }
  }
}

export const validateSimulationInput = (body = {}) => {
  const required = ['predictionProbability', 'amountAtRisk', 'interventionCost', 'estimatedRecoveryIfIntervened', 'estimatedRecoveryIfMissed']
  const missing = required.filter((key) => body[key] === undefined || body[key] === null || body[key] === '')
  if (missing.length) return { valid: false, message: `Missing simulation fields: ${missing.join(', ')}` }
  const numericFields = required.map((key) => [key, Number(body[key])])
  if (numericFields.some(([, value]) => !Number.isFinite(value))) return { valid: false, message: 'Simulation fields must be finite numbers.' }
  if (numericFields.some(([key, value]) => (key.includes('Probability') || key.includes('Recovery')) && (value < 0 || value > 1))) return { valid: false, message: 'Probabilities and recovery rates must be between 0 and 1.' }
  if (Number(body.amountAtRisk) < 0 || Number(body.interventionCost) < 0) return { valid: false, message: 'Amount and intervention cost cannot be negative.' }
  return { valid: true }
}
