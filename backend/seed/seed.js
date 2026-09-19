import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import User from '../models/User.js'
import Account from '../models/Account.js'
import Complaint from '../models/Complaint.js'
import Transaction from '../models/Transaction.js'
import ATMLocation from '../models/ATMLocation.js'
import Prediction from '../models/Prediction.js'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sih_mvp'

const cities = ['Chennai', 'Bengaluru', 'Hyderabad', 'Coimbatore', 'Pune']
const fraudTypes = ['UPI FRAUD', 'ATM WITHDRAWAL', 'IMPS FRAUD', 'NEFT FRAUD', 'BANKING FRAUD']

const buildAccounts = () => {
  return Array.from({ length: 55 }, (_, index) => {
    const id = index + 1
    const riskBand = id % 5 === 0 ? 'CRITICAL' : id % 3 === 0 ? 'HIGH' : id % 2 === 0 ? 'MEDIUM' : 'LOW'
    return {
      accountNumber: `SBIN${String(100000 + id).padStart(8, '0')}`,
      accountType: id % 2 === 0 ? 'SAVINGS' : 'CURRENT',
      status: 'ACTIVE',
      balance: 120000 + id * 8200,
      owner: `Owner-${String(id).padStart(3, '0')}`,
      riskBand,
      relatedComplaintIds: [],
      relatedTransactionCount: 0,
      totalTransactionAmount: 0,
      suspiciousActivity: id % 4 === 0
    }
  })
}

const buildAtmLocations = () => {
  const list = []
  const baseCoordinates = [
    { name: 'Chennai Central ATM', type: 'ATM', lat: 13.084, lng: 80.2707, zone: 'Chennai' },
    { name: 'Anna Nagar ATM', type: 'ATM', lat: 13.0877, lng: 80.2106, zone: 'Chennai' },
    { name: 'T Nagar ATM', type: 'ATM', lat: 13.0478, lng: 80.2336, zone: 'Chennai' },
    { name: 'Velachery POS-14', type: 'POS', lat: 12.9784, lng: 80.2200, zone: 'Chennai' },
    { name: 'Bengaluru Airport ATM', type: 'ATM', lat: 13.1986, lng: 77.7068, zone: 'Bengaluru' },
    { name: 'Indiranagar POS-09', type: 'POS', lat: 12.9716, lng: 77.6412, zone: 'Bengaluru' },
    { name: 'Hyderabad Banjara ATM', type: 'ATM', lat: 17.385, lng: 78.4867, zone: 'Hyderabad' },
    { name: 'Secunderabad POS-22', type: 'POS', lat: 17.4399, lng: 78.4983, zone: 'Hyderabad' },
    { name: 'Coimbatore Market ATM', type: 'ATM', lat: 11.0168, lng: 76.9558, zone: 'Coimbatore' },
    { name: 'Pune Camp ATM', type: 'ATM', lat: 18.5204, lng: 73.8567, zone: 'Pune' },
    { name: 'Pune Station POS-3', type: 'POS', lat: 18.5203, lng: 73.8569, zone: 'Pune' },
    { name: 'Nungambakkam ATM', type: 'ATM', lat: 13.062, lng: 80.249, zone: 'Chennai' },
    { name: 'Koramangala POS-7', type: 'POS', lat: 12.9352, lng: 77.6245, zone: 'Bengaluru' },
    { name: 'Madhapur ATM', type: 'ATM', lat: 17.4399, lng: 78.3915, zone: 'Hyderabad' },
    { name: 'Peelamedu ATM', type: 'ATM', lat: 11.0183, lng: 76.9625, zone: 'Coimbatore' },
    { name: 'Kharadi POS-12', type: 'POS', lat: 18.551, lng: 73.927, zone: 'Pune' }
  ]

  baseCoordinates.forEach((item, index) => {
    list.push({
      locationId: `atm-${String(index + 1).padStart(3, '0')}`,
      name: item.name,
      type: item.type,
      latitude: item.lat,
      longitude: item.lng,
      zone: item.zone,
      status: 'ACTIVE'
    })
  })

  return list
}

const buildTransactions = (accounts, locations) => {
  const rows = []
  for (let i = 1; i <= 120; i += 1) {
    const sourceAccount = accounts[(i * 7) % accounts.length].accountNumber
    const destinationAccount = `BKG-${String(1000 + i).padStart(6, '0')}`
    const amount = 4500 + ((i * 5791) % 62000)
    const location = cities[(i + 1) % cities.length]
    const locationEntry = locations[(i + 2) % locations.length]
    const types = ['UPI', 'IMPS', 'NEFT', 'TRANSFER', 'ATM_WITHDRAWAL']
    const status = i % 5 === 0 ? 'SUSPICIOUS' : 'CLEAR'
    const riskIndicator = status === 'SUSPICIOUS'
      ? (amount > 40000 ? 'CRITICAL' : amount > 20000 ? 'HIGH' : 'MEDIUM')
      : 'LOW'

    rows.push({
      transactionId: `TXN-${String(2000 + i).padStart(5, '0')}`,
      sourceAccount,
      destinationAccount,
      amount,
      timestamp: new Date(Date.now() - (i * 3600000)).toISOString(),
      transactionType: types[i % types.length],
      location,
      status,
      riskIndicator,
      riskScore: status === 'SUSPICIOUS' ? Math.min(25 + (amount / 1000), 99) : Math.min(10 + (amount / 2500), 25),
      atmLocationId: locationEntry.locationId
    })
  }
  return rows
}

const buildComplaints = (accounts, complaintsCount = 24) => {
  return Array.from({ length: complaintsCount }, (_, index) => {
    const account = accounts[(index * 3) % accounts.length]
    const amount = 18000 + ((index * 9723) % 120000)
    const statusOptions = ['NEW', 'UNDER_INVESTIGATION', 'HIGH_RISK', 'RESOLVED']
    const city = cities[index % cities.length]
    return {
      complaintId: `CMP-${String(1000 + index + 1).padStart(4, '0')}`,
      complaintDate: new Date(Date.now() - (index * 86400000 * 2)).toISOString(),
      fraudType: fraudTypes[index % fraudTypes.length],
      fraudAmount: amount,
      victimIdentifier: `VIC-${String(1000 + index + 1).padStart(5, '0')}`,
      suspectedAccount: account.accountNumber,
      status: statusOptions[index % statusOptions.length],
      location: city,
      description: `Synthetic complaint ${index + 1} for suspicious digital transaction pattern in ${city}.`,
      relatedAccounts: [account.accountNumber]
    }
  })
}

const buildPredictions = (complaints, locations) => {
  return complaints.slice(0, 12).map((complaint, index) => {
    const location = locations[(index + 1) % locations.length]
    const score = 72 + ((index * 7) % 22)
    return {
      caseId: complaint.complaintId,
      suspiciousAccount: complaint.suspectedAccount,
      locationName: location.name,
      atmId: location.locationId,
      latitude: location.latitude,
      longitude: location.longitude,
      predictionScore: score,
      riskLevel: score > 85 ? 'CRITICAL' : score > 70 ? 'HIGH' : 'MEDIUM',
      explanation: `High risk because: ${complaint.fraudAmount} detected, recent ATM withdrawal activity, and repeated transactions in ${complaint.location}.`,
      sortedRank: index + 1
    }
  })
}

const seedDatabase = async () => {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB for seeding')

  await Promise.all([
    User.deleteMany({}),
    Account.deleteMany({}),
    Complaint.deleteMany({}),
    Transaction.deleteMany({}),
    ATMLocation.deleteMany({}),
    Prediction.deleteMany({})
  ])

  const userHash = await bcrypt.hash('demo123', 10)

  const accounts = buildAccounts()
  const atms = buildAtmLocations()
  const transactions = buildTransactions(accounts, atms)
  const complaints = buildComplaints(accounts, 24)
  const predictions = buildPredictions(complaints, atms)

  await User.insertMany([
    {
      username: 'investigator',
      email: 'investigator@cyberintel.gov',
      passwordHash: userHash,
      role: 'investigator'
    }
  ])

  await Account.insertMany(accounts)
  await ATMLocation.insertMany(atms)
  await Transaction.insertMany(transactions)
  await Complaint.insertMany(complaints)
  await Prediction.insertMany(predictions)

  console.log(`Seeded ${accounts.length} accounts, ${transactions.length} transactions, ${complaints.length} complaints, ${atms.length} ATM/POS locations, and ${predictions.length} predictions.`)
  process.exit(0)
}

seedDatabase().catch((error) => {
  console.error('Seed error:', error)
  process.exit(1)
})
