import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { calculateRiskScore, explainRisk, getRiskLevel } from './riskService.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const processedDirectory = path.join(root, 'data', 'processed')
const parseCsvLine = (line) => {
  const values = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      values.push(value)
      value = ''
    } else {
      value += character
    }
  }
  values.push(value)
  return values
}
const readCsv = (fileName) => {
  const filePath = path.join(processedDirectory, fileName)
  if (!fs.existsSync(filePath)) return []
  const lines = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).filter(Boolean)
  if (!lines.length) return []
  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, parseCsvLine(line)[index] ?? ''])))
}
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
const toNumberOrNull = (value) => value === '' || value === null || value === undefined ? null : number(value)
const state = {
  running: false,
  speed: 1,
  transactionIndex: 0,
  simulationTime: null,
  transactionsProcessed: 0,
  activeCases: {},
  eventHistory: [],
  alerts: [],
  activePrediction: null,
  loaded: false,
  transactions: [],
  cases: [],
  atms: [],
  candidates: []
}

const loadData = () => {
  if (state.loaded) return
  state.transactions = readCsv('ml_transactions.csv')
  state.cases = readCsv('ml_cases.csv')
  state.atms = readCsv('atm_locations.csv')
  state.candidates = readCsv('atm_ranking_candidates.csv')
  state.loaded = true
}

const getCase = (caseId) => state.cases.find((item) => item.case_id === caseId)
const getCaseState = (caseId) => state.activeCases[caseId] || { caseId, transactions: [], suspiciousCount: 0, riskScore: 0, riskLevel: 'LOW', predicted: false, amountAtRisk: 0 }
const pushEvent = (event) => {
  state.eventHistory = [event, ...state.eventHistory].slice(0, 32)
}
const pushAlert = (alert) => {
  state.alerts = [alert, ...state.alerts].slice(0, 12)
}
const formatEventTime = (timestamp) => timestamp ? new Date(timestamp).toISOString().slice(11, 19) : '--:--:--'
const choosePrediction = (caseId) => {
  const options = state.candidates.filter((candidate) => candidate.case_id === caseId)
  if (!options.length) return null
  const selected = [...options].sort((first, second) => {
    const firstScore = number(first.regional_match) * 0.4 + number(first.time_compatibility) * 0.35 + number(first.historical_area_score) * 0.25
    const secondScore = number(second.regional_match) * 0.4 + number(second.time_compatibility) * 0.35 + number(second.historical_area_score) * 0.25
    return secondScore - firstScore
  })[0]
  const atm = state.atms.find((item) => item.atm_id === selected.candidate_atm_id)
  return atm ? {
    caseId,
    atmId: atm.atm_id,
    locationName: atm.atm_name,
    city: atm.city,
    latitude: number(atm.latitude),
    longitude: number(atm.longitude),
    score: Math.round((number(selected.regional_match) * 40) + (number(selected.time_compatibility) * 35) + (number(selected.historical_area_score) * 25)),
    source: 'SIMULATION REPLAY'
  } : null
}

const processTransaction = (transaction) => {
  const caseState = getCaseState(transaction.case_id)
  caseState.transactions = [...caseState.transactions, transaction]
  caseState.suspiciousCount += number(transaction.fraud_label)
  caseState.amountAtRisk += transaction.fraud_label === '1' ? number(transaction.amount) : 0
  caseState.riskScore = calculateRiskScore({
    amount: caseState.amountAtRisk,
    frequency: caseState.transactions.length,
    suspiciousCount: caseState.suspiciousCount,
    withdrawalCount: 0
  })
  caseState.riskLevel = getRiskLevel(caseState.riskScore)
  state.activeCases[transaction.case_id] = caseState

  const event = {
    id: `${transaction.transaction_id}-${state.transactionsProcessed}`,
    type: 'TRANSACTION',
    time: formatEventTime(transaction.timestamp),
    transactionId: transaction.transaction_id,
    caseId: transaction.case_id,
    transactionType: transaction.transaction_type,
    amount: number(transaction.amount),
    riskLevel: caseState.riskLevel,
    label: transaction.fraud_label === '1' ? 'SUSPICIOUS TRANSACTION' : 'TRANSACTION RECEIVED'
  }
  pushEvent(event)
  if (transaction.fraud_label === '1') {
    pushAlert({ id: event.id, type: 'HIGH-RISK TRANSACTION', caseId: transaction.case_id, transactionId: transaction.transaction_id, time: event.time, message: `${transaction.transaction_type} activity flagged` })
  }

  if (caseState.suspiciousCount >= 1 && !caseState.predicted) {
    caseState.predicted = true
    const prediction = choosePrediction(transaction.case_id)
    state.activePrediction = prediction
    const explanation = explainRisk({ amount: caseState.amountAtRisk, frequency: caseState.transactions.length, suspiciousCount: caseState.suspiciousCount, withdrawalCount: 0 }).summary
    pushEvent({ id: `${event.id}-risk`, type: 'RISK_UPDATE', time: event.time, caseId: transaction.case_id, riskLevel: caseState.riskLevel, label: 'RISK ESCALATED', explanation })
    pushAlert({ id: `${event.id}-prediction`, type: 'PREDICTION', caseId: transaction.case_id, time: event.time, message: prediction ? `Candidate prioritized: ${prediction.locationName}` : 'Candidate location unavailable' })
    if (prediction) pushEvent({ id: `${event.id}-atm`, type: 'PREDICTION_UPDATE', time: event.time, caseId: transaction.case_id, riskLevel: caseState.riskLevel, label: 'CASH-OUT PREDICTED', prediction })
  }
}

export const getSimulationState = () => {
  loadData()
  const activeCaseValues = Object.values(state.activeCases)
  return {
    mode: 'LIVE SIMULATION',
    running: state.running,
    speed: state.speed,
    simulationTime: state.simulationTime,
    transactionsProcessed: state.transactionsProcessed,
    totalTransactions: state.transactions.length,
    activeCases: activeCaseValues.length,
    highRiskCases: activeCaseValues.filter((item) => ['HIGH', 'CRITICAL'].includes(item.riskLevel)).length,
    amountAtRisk: activeCaseValues.reduce((sum, item) => sum + item.amountAtRisk, 0),
    predictedCashouts: activeCaseValues.filter((item) => item.predicted).length,
    activeCase: activeCaseValues.at(-1) || null,
    activePrediction: state.activePrediction,
    eventHistory: state.eventHistory,
    alerts: state.alerts,
    timeline: state.activeCase ? [] : [],
    source: 'SYNTHETIC DATASET REPLAY'
  }
}

export const startSimulation = () => { loadData(); state.running = true; return getSimulationState() }
export const pauseSimulation = () => { state.running = false; return getSimulationState() }
export const setSimulationSpeed = (speed) => { state.speed = [1, 2, 5, 10].includes(Number(speed)) ? Number(speed) : 1; return getSimulationState() }
export const resetSimulation = () => {
  state.running = false
  state.speed = 1
  state.transactionIndex = 0
  state.simulationTime = null
  state.transactionsProcessed = 0
  state.activeCases = {}
  state.eventHistory = []
  state.alerts = []
  state.activePrediction = null
  return getSimulationState()
}
export const tickSimulation = () => {
  loadData()
  if (!state.running || state.transactionIndex >= state.transactions.length) return getSimulationState()
  const transaction = state.transactions[state.transactionIndex]
  state.transactionIndex += 1
  state.transactionsProcessed += 1
  state.simulationTime = transaction.timestamp
  processTransaction(transaction)
  if (state.transactionIndex >= state.transactions.length) state.running = false
  return getSimulationState()
}
export const replayCase = (caseId) => {
  loadData()
  resetSimulation()
  const indexes = state.transactions.map((transaction, index) => transaction.case_id === caseId ? index : -1).filter((index) => index >= 0)
  if (!indexes.length) return getSimulationState()
  state.running = true
  indexes.forEach((index) => {
    state.transactionIndex = index + 1
    state.transactionsProcessed += 1
    const transaction = state.transactions[index]
    state.simulationTime = transaction.timestamp
    processTransaction(transaction)
  })
  state.running = false
  return getSimulationState()
}
