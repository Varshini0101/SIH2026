import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Account from '../models/Account.js'
import Complaint from '../models/Complaint.js'
import Transaction from '../models/Transaction.js'
import ATMLocation from '../models/ATMLocation.js'
import Prediction from '../models/Prediction.js'
import { demoAccounts, demoATMLocations, demoComplaints, demoPredictionInput, demoTransactions, demoUsers } from '../data/demoData.js'

import Dispatch from '../models/Dispatch.js'
import AlertStatus from '../models/AlertStatus.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const processedCaseMapPath = path.resolve(__dirname, '../../data/processed/ml_training.csv')
const fallbackStorePath = path.resolve(__dirname, '../data/db_fallback.json')

const loadProcessedCaseMapping = () => {
  try {
    const csv = fs.readFileSync(processedCaseMapPath, 'utf8')
    const lines = csv.trim().split(/\r?\n/).filter(Boolean)
    if (lines.length <= 1) return new Map()

    const map = new Map()
    for (const line of lines.slice(1)) {
      const columns = line.split(',')
      if (columns.length < 2) continue
      const caseId = (columns[0] || '').trim()
      const complaintId = (columns[1] || '').trim()
      if (caseId && complaintId) {
        map.set(complaintId, caseId)
      }
    }
    return map
  } catch (error) {
    return new Map()
  }
}

const processedComplaintCaseMap = loadProcessedCaseMapping()

const demoComplaintCaseAliasMap = new Map([
  ['CMP-1001', 'CASE-00001'],
  ['CMP-1002', 'CASE-00002'],
  ['CMP-1003', 'CASE-00003'],
  ['CMP-1004', 'CASE-00004'],
  ['CMP-1005', 'CASE-00005'],
  ['CMP-1006', 'CASE-00006']
])

const resolveComplaintCaseId = (complaintId) => {
  if (!complaintId || typeof complaintId !== 'string') return null
  const trimmed = complaintId.trim()
  if (!trimmed) return null

  return demoComplaintCaseAliasMap.get(trimmed) || processedComplaintCaseMap.get(trimmed) || null
}

const loadFallbackStore = () => {

  try {
    if (fs.existsSync(fallbackStorePath)) {
      const data = JSON.parse(fs.readFileSync(fallbackStorePath, 'utf8'))
      return {
        dispatches: Array.isArray(data.dispatches) ? data.dispatches : [],
        alertStatuses: data.alertStatuses && typeof data.alertStatuses === 'object' ? data.alertStatuses : {},
        complaints: Array.isArray(data.complaints) ? data.complaints : null
      }
    }
  } catch (err) {
    console.error('Error reading fallback store:', err)
  }
  return { dispatches: [], alertStatuses: {}, complaints: null }
}

const initialFallbackStore = loadFallbackStore()
const fallbackDispatches = initialFallbackStore.dispatches
const fallbackAlertStatuses = initialFallbackStore.alertStatuses
const fallbackUsers = demoUsers
const fallbackAccounts = demoAccounts
const fallbackComplaints = [...demoComplaints]
if (initialFallbackStore.complaints) {
  fallbackComplaints.length = 0
  fallbackComplaints.push(...initialFallbackStore.complaints)
}

const saveFallbackStore = () => {
  try {
    const dir = path.dirname(fallbackStorePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(fallbackStorePath, JSON.stringify({
      dispatches: fallbackDispatches,
      alertStatuses: fallbackAlertStatuses,
      complaints: fallbackComplaints
    }, null, 2))
  } catch (err) {
    console.error('Error saving fallback store:', err)
  }
}
const fallbackTransactions = demoTransactions
const fallbackLocations = demoATMLocations
const fallbackPredictions = demoPredictionInput.flatMap((entry) =>
  entry.candidateLocations.map((location, index) => ({
    caseId: entry.caseId,
    suspiciousAccount: entry.suspiciousAccount,
    locationName: location.name,
    atmId: location.id,
    latitude: location.latitude,
    longitude: location.longitude,
    predictionScore: location.score,
    riskLevel: location.score >= 85 ? 'HIGH' : location.score >= 70 ? 'MEDIUM' : 'LOW',
    explanation: `${entry.recentActivity}. Based on ${entry.behavioralPattern} and historical withdrawal frequency.`,
    sortedRank: index + 1
  }))
)

const toPlainObject = (value) => {
  if (!value) return value
  if (typeof value.toObject === 'function') return value.toObject()
  return { ...value }
}

const normalizeComplaint = (value) => {
  const entry = toPlainObject(value)
  if (!entry) return entry
  const complaintId = entry.complaintId || entry.id || entry._id?.toString?.()
  const caseId = entry.caseId || resolveComplaintCaseId(complaintId)
  return {
    ...entry,
    id: complaintId,
    complaintId,
    caseId: caseId || null,
    complaintDate: entry.complaintDate ? new Date(entry.complaintDate).toISOString().slice(0, 10) : entry.complaintDate
  }
}

const normalizeTransaction = (value) => {
  const entry = toPlainObject(value)
  if (!entry) return entry
  const transactionId = entry.transactionId || entry.id || entry._id?.toString?.()
  return {
    ...entry,
    id: transactionId,
    transactionId,
    type: entry.transactionType || entry.type,
    transactionType: entry.transactionType || entry.type
  }
}

const normalizeLocation = (value) => {
  const entry = toPlainObject(value)
  if (!entry) return entry
  const locationId = entry.locationId || entry.id || entry._id?.toString?.()
  return {
    ...entry,
    id: locationId,
    locationId,
    type: entry.type || entry.locationType
  }
}

const normalizeAccount = (value) => {
  const entry = toPlainObject(value)
  if (!entry) return entry
  const accountId = entry.accountNumber || entry.id || entry._id?.toString?.()
  return {
    ...entry,
    id: accountId,
    accountNumber: entry.accountNumber || accountId
  }
}

export const connectDatabase = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/sih_mvp'

  if (mongoose.connection.readyState !== 0) return true

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000
    })
    console.log('MongoDB connected successfully to Atlas')

    // Auto-seed Atlas database if empty
    try {
      const userCount = await User.countDocuments()
      if (userCount === 0) {
        await User.insertMany(fallbackUsers)
        console.log('Seeded demo users into MongoDB Atlas')
      }
      const complaintCount = await Complaint.countDocuments()
      if (complaintCount === 0) {
        await Complaint.insertMany(fallbackComplaints.map((c) => ({
          complaintId: c.complaintId || c.id,
          complaintDate: c.complaintDate || new Date(),
          fraudType: c.fraudType || 'BANKING FRAUD',
          fraudAmount: Number(c.fraudAmount || 0),
          victimIdentifier: c.victimIdentifier || 'VIC-UNKNOWN',
          suspectedAccount: c.suspectedAccount || 'UNKNOWN',
          status: c.status || 'NEW',
          location: c.location || 'Unknown',
          description: c.description || 'No description provided.',
          relatedAccounts: c.relatedAccounts || []
        })))
        console.log('Seeded complaints into MongoDB Atlas')
      }
      const accountCount = await Account.countDocuments()
      if (accountCount === 0) {
        await Account.insertMany(fallbackAccounts.map((a) => ({
          accountNumber: a.accountNumber || a.id,
          owner: a.owner,
          bankName: a.bankName,
          accountType: a.accountType,
          riskBand: a.riskBand
        })))
        console.log('Seeded accounts into MongoDB Atlas')
      }
      const txCount = await Transaction.countDocuments()
      if (txCount === 0) {
        await Transaction.insertMany(fallbackTransactions.map((t) => ({
          transactionId: t.transactionId || t.id,
          timestamp: t.timestamp || new Date(),
          sourceAccount: t.sourceAccount,
          destinationAccount: t.destinationAccount,
          amount: Number(t.amount || 0),
          transactionType: t.type || t.transactionType || 'TRANSFER',
          status: t.status || 'SUSPICIOUS',
          riskScore: Number(t.riskScore || 50),
          riskIndicator: t.riskIndicator || 'MEDIUM',
          location: t.location || 'Unknown'
        })))
        console.log('Seeded transactions into MongoDB Atlas')
      }
      const atmCount = await ATMLocation.countDocuments()
      if (atmCount === 0) {
        await ATMLocation.insertMany(fallbackLocations.map((l) => ({
          locationId: l.locationId || l.id,
          name: l.name,
          type: l.type || l.locationType || 'ATM',
          latitude: Number(l.latitude),
          longitude: Number(l.longitude),
          zone: l.zone || l.address || 'Zone A',
          status: l.status || 'ACTIVE'
        })))
        console.log('Seeded ATM locations into MongoDB Atlas')
      }


    } catch (seedErr) {
      console.warn('Atlas auto-seed notice:', seedErr.message)
    }

    return true
  } catch (error) {
    console.error('MongoDB connection failed; continuing in fallback mode:', error.message)
    return false
  }
}



const useFallback = () => !process.env.MONGO_URI || mongoose.connection.readyState === 0

export const getDashboardData = async () => {
  if (useFallback()) {
    const complaints = fallbackComplaints
    const transactions = fallbackTransactions
    const predictions = fallbackPredictions
    return {
      summary: {
        totalComplaints: complaints.length,
        activeInvestigations: complaints.filter((item) => item.status !== 'RESOLVED').length,
        suspiciousTransactions: transactions.filter((item) => item.status === 'SUSPICIOUS').length,
        highRiskCases: complaints.filter((item) => item.status === 'HIGH_RISK').length,
        totalAmount: transactions.reduce((sum, txn) => sum + txn.amount, 0),
        predictedWithdrawalCases: predictions.length
      },
      charts: {
        complaintsOverTime: [
          { month: 'Aug', complaints: 4, amount: 120000 },
          { month: 'Sep', complaints: 6, amount: 180000 },
          { month: 'Oct', complaints: 8, amount: 240000 },
          { month: 'Nov', complaints: 7, amount: 210000 },
          { month: 'Dec', complaints: 9, amount: 260000 }
        ],
        transactionAmountTrends: [
          { month: 'Aug', amount: 120000 },
          { month: 'Sep', amount: 180000 },
          { month: 'Oct', amount: 240000 },
          { month: 'Nov', amount: 210000 },
          { month: 'Dec', amount: 260000 }
        ],
        fraudTypeDistribution: [
          { name: 'UPI FRAUD', value: complaints.filter((item) => item.fraudType === 'UPI FRAUD').length },
          { name: 'ATM WITHDRAWAL', value: complaints.filter((item) => item.fraudType === 'ATM WITHDRAWAL').length },
          { name: 'IMPS FRAUD', value: complaints.filter((item) => item.fraudType === 'IMPS FRAUD').length },
          { name: 'NEFT FRAUD', value: complaints.filter((item) => item.fraudType === 'NEFT FRAUD').length }
        ],
        riskDistribution: [
          { name: 'LOW', value: transactions.filter((item) => item.riskIndicator === 'LOW').length },
          { name: 'MEDIUM', value: transactions.filter((item) => item.riskIndicator === 'MEDIUM').length },
          { name: 'HIGH', value: transactions.filter((item) => item.riskIndicator === 'HIGH').length },
          { name: 'CRITICAL', value: transactions.filter((item) => item.riskIndicator === 'CRITICAL').length }
        ]
      },
      recentComplaints: complaints.slice(0, 5).map(normalizeComplaint),
      recentTransactions: transactions.slice(0, 5).map(normalizeTransaction),
      accounts: fallbackAccounts.map(normalizeAccount),
      atmLocations: fallbackLocations.map(normalizeLocation),
      predictions: predictions.slice(0, 10).map((item) => ({ ...item, id: item.atmId || item.id }))
    }
  }

  const [complaints, transactions, accounts, atms, predictions] = await Promise.all([
    Complaint.find({}),
    Transaction.find({}),
    Account.find({}),
    ATMLocation.find({}),
    Prediction.find({})
  ])

  return {
    summary: {
      totalComplaints: complaints.length,
      activeInvestigations: complaints.filter((item) => item.status !== 'RESOLVED').length,
      suspiciousTransactions: transactions.filter((item) => item.status === 'SUSPICIOUS').length,
      highRiskCases: complaints.filter((item) => item.status === 'HIGH_RISK').length,
      totalAmount: transactions.reduce((sum, txn) => sum + txn.amount, 0),
      predictedWithdrawalCases: predictions.length
    },
    recentComplaints: complaints.slice(0, 5).map(normalizeComplaint),
    recentTransactions: transactions.slice(0, 5).map(normalizeTransaction),
    accounts: accounts.map(normalizeAccount),
    charts: {
      complaintsOverTime: [
        { month: 'Aug', complaints: 4, amount: 120000 },
        { month: 'Sep', complaints: 6, amount: 180000 },
        { month: 'Oct', complaints: 8, amount: 240000 },
        { month: 'Nov', complaints: 7, amount: 210000 },
        { month: 'Dec', complaints: 9, amount: 260000 }
      ],
      transactionAmountTrends: [
        { month: 'Aug', amount: 120000 },
        { month: 'Sep', amount: 180000 },
        { month: 'Oct', amount: 240000 },
        { month: 'Nov', amount: 210000 },
        { month: 'Dec', amount: 260000 }
      ],
      fraudTypeDistribution: [
        { name: 'UPI FRAUD', value: complaints.filter((item) => item.fraudType === 'UPI FRAUD').length },
        { name: 'ATM WITHDRAWAL', value: complaints.filter((item) => item.fraudType === 'ATM WITHDRAWAL').length },
        { name: 'IMPS FRAUD', value: complaints.filter((item) => item.fraudType === 'IMPS FRAUD').length },
        { name: 'NEFT FRAUD', value: complaints.filter((item) => item.fraudType === 'NEFT FRAUD').length }
      ],
      riskDistribution: [
        { name: 'LOW', value: transactions.filter((item) => item.riskIndicator === 'LOW').length },
        { name: 'MEDIUM', value: transactions.filter((item) => item.riskIndicator === 'MEDIUM').length },
        { name: 'HIGH', value: transactions.filter((item) => item.riskIndicator === 'HIGH').length },
        { name: 'CRITICAL', value: transactions.filter((item) => item.riskIndicator === 'CRITICAL').length }
      ]
    },
    atmLocations: atms.map(normalizeLocation),
    predictions: predictions.map((item) => ({ ...item.toObject ? item.toObject() : item, id: item.atmId || item.id }))
  }
}

export const getUserByUsername = async (username) => {
  if (useFallback()) return fallbackUsers.find((user) => user.username === username || user.email === username) || null
  const dbUser = await User.findOne({ $or: [{ username }, { email: username }] })
  if (dbUser) return dbUser
  return fallbackUsers.find((user) => user.username === username || user.email === username) || null
}


export const verifyPassword = async (inputPassword, hash) => {
  const bcrypt = await import('bcryptjs')
  return bcrypt.default.compare(inputPassword, hash)
}

export const getAccountSummary = async () => {
  if (useFallback()) return fallbackAccounts.map(normalizeAccount)
  return Account.find({}).then((items) => items.map(normalizeAccount))
}

export const getComplaintById = async (id) => {
  if (useFallback()) return normalizeComplaint(fallbackComplaints.find((complaint) => complaint.id === id || complaint.complaintId === id) || null)
  const complaint = await Complaint.findOne({ complaintId: id })
  return normalizeComplaint(complaint)
}

export const getComplaints = async (query = {}) => {
  if (useFallback()) {
    const complaints = [...fallbackComplaints]
    let filtered = complaints
    if (query.search) {
      const search = query.search.toLowerCase()
      filtered = filtered.filter((item) => item.id.toLowerCase().includes(search) || item.location.toLowerCase().includes(search) || item.description.toLowerCase().includes(search))
    }
    if (query.status) filtered = filtered.filter((item) => item.status === query.status)
    return filtered.map(normalizeComplaint)
  }

  const criteria = {}
  if (query.status) criteria.status = query.status
  if (query.search) {
    const search = query.search
    criteria.$or = [
      { complaintId: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ]
  }
  const results = await Complaint.find(criteria)
  return results.map((complaint) => normalizeComplaint({
    ...complaint.toObject ? complaint.toObject() : complaint,
    caseId: resolveComplaintCaseId((complaint.complaintId || complaint.id || '').trim())
  }))
}

export const createComplaintRecord = async (payload) => {
  const newPayload = {
    complaintId: payload.complaintId || `CMP-${Date.now()}`,
    complaintDate: payload.complaintDate || new Date(),
    fraudType: payload.fraudType || 'BANKING FRAUD',
    fraudAmount: Number(payload.fraudAmount || 0),
    victimIdentifier: payload.victimIdentifier || 'VIC-UNKNOWN',
    suspectedAccount: payload.suspectedAccount || 'UNKNOWN',
    status: payload.status || 'NEW',
    location: payload.location || 'Unknown',
    description: payload.description || 'No description provided.',
    relatedAccounts: payload.relatedAccounts || []
  }

  if (useFallback()) {
    const complaint = { ...newPayload, id: newPayload.complaintId }
    fallbackComplaints.unshift(complaint)
    saveFallbackStore()
    return normalizeComplaint(complaint)
  }

  const complaint = new Complaint(newPayload)
  const saved = await complaint.save()
  return normalizeComplaint(saved)
}

export const updateComplaintRecord = async (id, payload) => {
  if (useFallback()) {
    const index = fallbackComplaints.findIndex((complaint) => complaint.id === id || complaint.complaintId === id)
    if (index === -1) return null
    fallbackComplaints[index] = { ...fallbackComplaints[index], ...payload, complaintId: id }
    saveFallbackStore()
    return normalizeComplaint(fallbackComplaints[index])
  }

  const updated = await Complaint.findOneAndUpdate({ complaintId: id }, payload, { new: true })
  return normalizeComplaint(updated)
}

export const deleteComplaintRecord = async (id) => {
  if (useFallback()) {
    const index = fallbackComplaints.findIndex((complaint) => complaint.id === id || complaint.complaintId === id)
    if (index === -1) return { deletedCount: 0 }
    fallbackComplaints.splice(index, 1)
    saveFallbackStore()
    return { deletedCount: 1 }
  }

  return Complaint.deleteOne({ complaintId: id })
}

export const getTransactions = async (filters = {}) => {
  if (useFallback()) {
    let results = [...fallbackTransactions]
    if (filters.search) {
      const search = filters.search.toLowerCase()
      results = results.filter((txn) => txn.id.toLowerCase().includes(search) || txn.sourceAccount.toLowerCase().includes(search) || txn.destinationAccount.toLowerCase().includes(search) || txn.location.toLowerCase().includes(search))
    }
    if (filters.status) results = results.filter((txn) => txn.status === filters.status)
    if (filters.type) results = results.filter((txn) => txn.type === filters.type)
    if (filters.sort === 'amount-desc') results.sort((a, b) => b.amount - a.amount)
    return results.map(normalizeTransaction)
  }

  const criteria = {}
  if (filters.status) criteria.status = filters.status
  if (filters.type) criteria.transactionType = filters.type
  if (filters.search) {
    const search = filters.search
    criteria.$or = [
      { transactionId: { $regex: search, $options: 'i' } },
      { sourceAccount: { $regex: search, $options: 'i' } },
      { destinationAccount: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } }
    ]
  }
  const results = await Transaction.find(criteria).sort({ timestamp: -1 })
  return results.map(normalizeTransaction)
}

export const getTransactionById = async (id) => {
  if (useFallback()) return normalizeTransaction(fallbackTransactions.find((txn) => txn.id === id || txn.transactionId === id) || null)
  const transaction = await Transaction.findOne({ transactionId: id })
  return normalizeTransaction(transaction)
}

export const getATMLocations = async () => {
  if (useFallback()) return fallbackLocations.map(normalizeLocation)
  const results = await ATMLocation.find({})
  return results.map(normalizeLocation)
}

export const getPredictionForCase = async (caseId) => {
  if (useFallback()) return fallbackPredictions.filter((prediction) => prediction.caseId === caseId)
  const results = await Prediction.find({ caseId })
  return results.map((item) => ({ ...item.toObject(), id: item.atmId || item.id }))
}

export const getDispatches = async (alertId) => {
  if (useFallback()) {
    if (alertId) {
      return fallbackDispatches.filter((item) => item.alertId === alertId)
    }
    return fallbackDispatches
  }

  const query = alertId ? { alertId } : {}
  const results = await Dispatch.find(query).sort({ createdAt: -1 })
  return results.map((item) => (item.toObject ? item.toObject() : item))
}

export const createDispatchRecord = async (payload) => {
  const newRecord = {
    referenceId: payload.referenceId || `DSP-${Date.now()}`,
    alertId: payload.alertId,
    recipient: payload.recipient || 'Bank',
    entity: payload.entity || '',
    fraudType: payload.fraudType || '',
    riskScore: Number(payload.riskScore || 0),
    severity: payload.severity || 'MEDIUM',
    transactionSummary: payload.transactionSummary || '',
    fraudRingSummary: payload.fraudRingSummary || '',
    evidence: payload.evidence || '',
    investigatorNotes: payload.investigatorNotes || '',
    recommendedAction: payload.recommendedAction || '',
    status: payload.status || 'Dispatched',
    dispatchTime: payload.dispatchTime || new Date().toISOString()
  }

  if (useFallback()) {
    fallbackDispatches.unshift(newRecord)
    fallbackAlertStatuses[payload.alertId] = 'DISPATCHED'
    saveFallbackStore()
    return newRecord
  }

  const dispatchDoc = new Dispatch(newRecord)
  const saved = await dispatchDoc.save()
  await AlertStatus.findOneAndUpdate(
    { alertId: payload.alertId },
    { alertId: payload.alertId, status: 'DISPATCHED' },
    { upsert: true, new: true }
  )
  return saved.toObject ? saved.toObject() : saved
}

export const getAlertStatuses = async () => {
  if (useFallback()) {
    return fallbackAlertStatuses
  }

  const docs = await AlertStatus.find({})
  const statusMap = {}
  docs.forEach((doc) => {
    statusMap[doc.alertId] = doc.status
  })
  return statusMap
}

export const updateAlertStatus = async (alertId, status) => {
  if (useFallback()) {
    fallbackAlertStatuses[alertId] = status
    saveFallbackStore()
    return { alertId, status }
  }

  const updated = await AlertStatus.findOneAndUpdate(
    { alertId },
    { alertId, status },
    { upsert: true, new: true }
  )
  return updated.toObject ? updated.toObject() : updated
}

