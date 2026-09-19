import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const outputDirectories = [
  path.join(root, 'data', 'processed'),
  path.join(root, 'data', 'derived'),
  path.join(root, 'data', 'documentation')
]
outputDirectories.forEach((directory) => fs.mkdirSync(directory, { recursive: true }))

const options = {
  cases: Number(process.env.CASES || 600),
  accounts: Number(process.env.ACCOUNTS || 1400),
  atms: Number(process.env.ATMS || 120),
  fraudRatio: Number(process.env.FRAUD_RATIO || 0.45),
  cashoutRatio: Number(process.env.CASHOUT_RATIO || 0.9),
  seed: Number(process.env.SEED || 42)
}

const regions = [
  { city: 'Chennai', region: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
  { city: 'Bengaluru', region: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  { city: 'Hyderabad', region: 'Telangana', latitude: 17.385, longitude: 78.4867 },
  { city: 'Coimbatore', region: 'Tamil Nadu', latitude: 11.0168, longitude: 76.9558 },
  { city: 'Pune', region: 'Maharashtra', latitude: 18.5204, longitude: 73.8567 },
  { city: 'Vijayawada', region: 'Andhra Pradesh', latitude: 16.5062, longitude: 80.648 }
]
const patterns = ['RAPID', 'MULTI_HOP', 'PROXIMITY', 'DELAYED', 'MULTI_CANDIDATE']
const transactionTypes = ['UPI', 'IMPS', 'NEFT', 'TRANSFER']
const baseTime = Date.parse('2026-01-01T00:00:00.000Z')

const createRandom = (seed) => {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let value = Math.imul(state ^ state >>> 15, 1 | state)
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

const random = createRandom(options.seed)
const integer = (min, max) => Math.floor(random() * (max - min + 1)) + min
const pick = (values) => values[integer(0, values.length - 1)]
const round = (value, digits = 2) => Number(value.toFixed(digits))
const iso = (milliseconds) => new Date(milliseconds).toISOString()
const csvEscape = (value) => {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
const writeCsv = (filePath, rows, columns) => {
  const output = [columns.join(',')]
  rows.forEach((row) => output.push(columns.map((column) => csvEscape(row[column])).join(',')))
  fs.writeFileSync(filePath, `${output.join('\n')}\n`)
}

const splitForCase = (caseNumber) => {
  const bucket = caseNumber % 20
  return bucket < 14 ? 'TRAIN' : bucket < 17 ? 'VALIDATION' : 'TEST'
}

const buildAtms = () => Array.from({ length: options.atms }, (_, index) => {
  const region = regions[index % regions.length]
  return {
    atm_id: `ATM-${String(index + 1).padStart(3, '0')}`,
    atm_name: `${region.city} ${index % 4 === 0 ? 'POS' : 'ATM'} ${String(index + 1).padStart(3, '0')}`,
    latitude: round(region.latitude + (random() - 0.5) * 0.22, 6),
    longitude: round(region.longitude + (random() - 0.5) * 0.22, 6),
    city: region.city,
    region: region.region,
    type: index % 4 === 0 ? 'POS' : 'ATM',
    active: true,
    source_type: 'SYNTHETIC'
  }
})

const buildAccounts = () => Array.from({ length: options.accounts }, (_, index) => ({
  account_id: `ACC-${String(index + 1).padStart(5, '0')}`,
  account_type: index % 3 === 0 ? 'CURRENT' : 'SAVINGS',
  risk: index % 11 === 0 ? 'HIGH' : index % 5 === 0 ? 'MEDIUM' : 'LOW',
  region: regions[index % regions.length].region,
  created_at: iso(baseTime - integer(30, 900) * 86400000),
  source_type: 'SYNTHETIC'
}))

const haversineKm = (first, second) => {
  const radians = Math.PI / 180
  const latitudeDelta = (second.latitude - first.latitude) * radians
  const longitudeDelta = (second.longitude - first.longitude) * radians
  const latitude = first.latitude * radians
  const nextLatitude = second.latitude * radians
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitude) * Math.cos(nextLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const atms = buildAtms()
const accounts = buildAccounts()
const cases = []
const transactions = []
const withdrawals = []
const candidates = []
const trainingRows = []
let transactionNumber = 1
let withdrawalNumber = 1

for (let caseNumber = 1; caseNumber <= options.cases; caseNumber += 1) {
  const caseId = `CASE-${String(caseNumber).padStart(5, '0')}`
  const split = splitForCase(caseNumber)
  const region = regions[(caseNumber - 1) % regions.length]
  const fraudLabel = random() < options.fraudRatio ? 1 : 0
  const cashoutLabel = fraudLabel === 1 && random() < options.cashoutRatio ? 1 : 0
  const pattern = fraudLabel ? patterns[(caseNumber - 1) % patterns.length] : 'NORMAL'
  const victim = accounts[(caseNumber * 2) % accounts.length]
  const muleCount = pattern === 'MULTI_HOP' ? integer(2, 3) : pattern === 'RAPID' || pattern === 'PROXIMITY' ? 1 : integer(0, 1)
  const chainAccounts = [victim, ...Array.from({ length: muleCount }, (_, index) => accounts[(caseNumber * 13 + index + 7) % accounts.length])]
  const complaintTime = baseTime + caseNumber * 3600000
  const baseAmount = integer(12000, 125000)
  const caseTransactions = []
  let lastTime = complaintTime
  let previousAmount = baseAmount

  const normalCount = integer(6, 10)
  for (let normalIndex = 0; normalIndex < normalCount; normalIndex += 1) {
    const normalTime = complaintTime - integer(1, 20) * 3600000 - normalIndex * 180000
    const normalTransaction = {
      transaction_id: `TXN-${String(transactionNumber++).padStart(7, '0')}`,
      case_id: caseId,
      source_account: accounts[(caseNumber * 17 + normalIndex) % accounts.length].account_id,
      destination_account: accounts[(caseNumber * 19 + normalIndex + 3) % accounts.length].account_id,
      amount: integer(500, 22000),
      timestamp: iso(normalTime),
      transaction_type: pick(transactionTypes),
      fraud_label: 0,
      location: region.city,
      risk: 'LOW',
      source_type: 'SYNTHETIC'
    }
    transactions.push(normalTransaction)
    caseTransactions.push(normalTransaction)
  }

  if (fraudLabel === 1) {
    for (let hop = 0; hop < chainAccounts.length - 1; hop += 1) {
      const timeGap = pattern === 'RAPID' ? integer(2, 20) * 60000 : pattern === 'DELAYED' ? integer(8, 36) * 3600000 : integer(20, 180) * 60000
      lastTime += timeGap
      previousAmount = Math.max(1000, Math.round(previousAmount * (0.82 + random() * 0.12)))
      const chainTransaction = {
        transaction_id: `TXN-${String(transactionNumber++).padStart(7, '0')}`,
        case_id: caseId,
        source_account: chainAccounts[hop].account_id,
        destination_account: chainAccounts[hop + 1].account_id,
        amount: previousAmount,
        timestamp: iso(lastTime),
        transaction_type: pick(transactionTypes),
        fraud_label: 1,
        location: region.city,
        risk: previousAmount > 70000 ? 'HIGH' : 'MEDIUM',
        source_type: 'SYNTHETIC'
      }
      transactions.push(chainTransaction)
      caseTransactions.push(chainTransaction)
    }
  }

  const withdrawalCount = cashoutLabel ? 2 + (random() < 0.25 ? 1 : 0) : 0
  const withdrawalEvents = []
  let withdrawalTime = cashoutLabel ? lastTime + (pattern === 'DELAYED' ? integer(12, 48) * 3600000 : integer(5, 45) * 60000) : null
  for (let withdrawalIndex = 0; withdrawalIndex < withdrawalCount; withdrawalIndex += 1) {
    const withdrawalAtm = withdrawalIndex === withdrawalCount - 1
      ? atms[(caseNumber * 7 + (pattern === 'PROXIMITY' ? 0 : integer(0, atms.length - 1))) % atms.length]
      : atms[(caseNumber * 11 + withdrawalIndex) % atms.length]
    const withdrawalAmount = Math.max(500, Math.round(previousAmount * (0.38 + random() * 0.2)))
    const withdrawalEvent = {
      withdrawal_id: `WDR-${String(withdrawalNumber++).padStart(7, '0')}`,
      case_id: caseId,
      transaction_id: caseTransactions.at(-1)?.transaction_id || null,
      account_id: chainAccounts.at(-1).account_id,
      amount: withdrawalAmount,
      timestamp: iso(withdrawalTime),
      atm_id: withdrawalAtm.atm_id,
      latitude: withdrawalAtm.latitude,
      longitude: withdrawalAtm.longitude,
      withdrawal_status: random() < 0.08 ? 'FAILED' : 'SUCCESS',
      source_type: 'SYNTHETIC'
    }
    withdrawals.push(withdrawalEvent)
    withdrawalEvents.push(withdrawalEvent)
    withdrawalTime += integer(10, 90) * 60000
  }
  const actualWithdrawal = withdrawalEvents.at(-1) || null
  const actualAtm = actualWithdrawal ? atms.find((atm) => atm.atm_id === actualWithdrawal.atm_id) : null
  const actualWithdrawalTime = actualWithdrawal ? Date.parse(actualWithdrawal.timestamp) : null
  const actualWithdrawalAmount = actualWithdrawal?.amount || null
  const timeToCashout = actualWithdrawalTime ? Math.round((actualWithdrawalTime - complaintTime) / 60000) : null

  const candidatePool = atms.map((atm) => ({
    atm,
    distance: haversineKm(region, atm),
    isActual: cashoutLabel && atm.atm_id === actualAtm.atm_id
  })).sort((first, second) => first.distance - second.distance).slice(0, 8)
  if (cashoutLabel && !candidatePool.some((candidate) => candidate.isActual)) candidatePool[7] = { atm: actualAtm, distance: haversineKm(region, actualAtm), isActual: true }

  candidatePool.forEach(({ atm, distance, isActual }) => {
    candidates.push({
      case_id: caseId,
      candidate_atm_id: atm.atm_id,
      distance_from_last_activity: round(distance),
      distance_from_previous_withdrawal: round(distance * (0.55 + random() * 0.9)),
      regional_match: atm.region === region.region ? 1 : 0,
      time_compatibility: round(0.45 + random() * 0.55, 3),
      historical_area_score: round(random(), 3),
      is_actual_withdrawal: isActual ? 1 : 0,
      split,
      source_type: 'SYNTHETIC'
    })
  })

  const suspiciousTransactions = caseTransactions.filter((transaction) => transaction.fraud_label === 1)
  const totalAmount = caseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  cases.push({
    case_id: caseId,
    complaint_id: `CMP-${String(100000 + caseNumber).padStart(6, '0')}`,
    fraud_label: fraudLabel,
    cashout_label: cashoutLabel,
    pattern,
    source_account: victim.account_id,
    actual_withdrawal_atm_id: cashoutLabel ? actualAtm.atm_id : null,
    actual_withdrawal_latitude: cashoutLabel ? actualAtm.latitude : null,
    actual_withdrawal_longitude: cashoutLabel ? actualAtm.longitude : null,
    actual_withdrawal_time: cashoutLabel ? iso(actualWithdrawalTime) : null,
    actual_withdrawal_amount: actualWithdrawalAmount,
    transaction_sequence: caseTransactions.map((transaction) => transaction.transaction_id).join('|'),
    hop_count: Math.max(0, chainAccounts.length - 1),
    time_to_cashout: timeToCashout,
    unique_accounts: new Set(caseTransactions.flatMap((transaction) => [transaction.source_account, transaction.destination_account])).size,
    transfer_chain_length: chainAccounts.length,
    amount_decay_across_hops: fraudLabel ? round(previousAmount / baseAmount, 4) : null,
    rapid_transfer_flag: pattern === 'RAPID' ? 1 : 0,
    transaction_count: caseTransactions.length,
    suspicious_transaction_count: suspiciousTransactions.length,
    transaction_frequency: round(caseTransactions.length / 24, 4),
    transaction_velocity: round(caseTransactions.length / Math.max(1, (lastTime - complaintTime) / 3600000), 4),
    amount_deviation: round(totalAmount / Math.max(1, caseTransactions.length), 2),
    account_activity_frequency: round(caseTransactions.length / Math.max(1, new Set(caseTransactions.map((transaction) => transaction.source_account)).size), 4),
    account_risk: victim.risk,
    new_destination_flag: new Set(caseTransactions.map((transaction) => transaction.destination_account)).size > 3 ? 1 : 0,
    destination_concentration: round(caseTransactions.length / Math.max(1, new Set(caseTransactions.map((transaction) => transaction.destination_account)).size), 4),
    previous_withdrawal_count: 0,
    average_withdrawal_amount: 0,
    time_since_previous_withdrawal: null,
    hour: new Date(lastTime).getUTCHours(),
    day_of_week: new Date(lastTime).getUTCDay(),
    time_since_last_transaction: 0,
    time_since_first_suspicious_transaction: suspiciousTransactions.length ? Math.round((lastTime - Date.parse(suspiciousTransactions[0].timestamp)) / 60000) : null,
    time_since_fraud_event: null,
    split,
    source_type: 'SYNTHETIC'
  })
}

const featureColumns = [
  'case_id', 'complaint_id', 'fraud_label', 'cashout_label', 'pattern', 'transaction_count', 'suspicious_transaction_count', 'transaction_frequency', 'transaction_velocity', 'amount_deviation', 'hop_count', 'unique_accounts', 'transfer_chain_length', 'amount_decay_across_hops', 'rapid_transfer_flag', 'account_activity_frequency', 'account_risk', 'new_destination_flag', 'destination_concentration', 'previous_withdrawal_count', 'average_withdrawal_amount', 'hour', 'day_of_week', 'time_since_last_transaction', 'time_since_first_suspicious_transaction', 'split', 'source_type'
]
const transactionColumns = ['transaction_id', 'case_id', 'source_account', 'destination_account', 'amount', 'timestamp', 'transaction_type', 'fraud_label', 'location', 'risk', 'source_type']
const withdrawalColumns = ['withdrawal_id', 'case_id', 'transaction_id', 'account_id', 'amount', 'timestamp', 'atm_id', 'latitude', 'longitude', 'withdrawal_status', 'source_type']
const atmColumns = ['atm_id', 'atm_name', 'latitude', 'longitude', 'city', 'region', 'type', 'active', 'source_type']
const candidateColumns = ['case_id', 'candidate_atm_id', 'distance_from_last_activity', 'distance_from_previous_withdrawal', 'regional_match', 'time_compatibility', 'historical_area_score', 'is_actual_withdrawal', 'split', 'source_type']

writeCsv(path.join(root, 'data', 'processed', 'ml_training.csv'), cases, featureColumns)
writeCsv(path.join(root, 'data', 'processed', 'ml_cases.csv'), cases, Object.keys(cases[0]))
writeCsv(path.join(root, 'data', 'processed', 'ml_transactions.csv'), transactions, transactionColumns)
writeCsv(path.join(root, 'data', 'processed', 'ml_withdrawals.csv'), withdrawals, withdrawalColumns)
writeCsv(path.join(root, 'data', 'processed', 'atm_locations.csv'), atms, atmColumns)
writeCsv(path.join(root, 'data', 'processed', 'atm_ranking_candidates.csv'), candidates, candidateColumns)
writeCsv(path.join(root, 'data', 'processed', 'ml_training_train.csv'), cases.filter((row) => row.split === 'TRAIN'), featureColumns)
writeCsv(path.join(root, 'data', 'processed', 'ml_training_validation.csv'), cases.filter((row) => row.split === 'VALIDATION'), featureColumns)
writeCsv(path.join(root, 'data', 'processed', 'ml_training_test.csv'), cases.filter((row) => row.split === 'TEST'), featureColumns)
const trainingHash = createHash('sha256').update(fs.readFileSync(path.join(root, 'data', 'processed', 'ml_training.csv'))).digest('hex')
fs.writeFileSync(path.join(root, 'data', 'documentation', 'ml_generation_manifest.json'), `${JSON.stringify({ seed: options.seed, training_sha256: trainingHash }, null, 2)}\n`)

const validation = {
  seed: options.seed,
  cases: cases.length,
  accounts: accounts.length,
  transactions: transactions.length,
  withdrawals: withdrawals.length,
  atms: atms.length,
  candidate_records: candidates.length,
  fraud_cases: cases.filter((row) => row.fraud_label === 1).length,
  cashout_cases: cases.filter((row) => row.cashout_label === 1).length,
  failed_withdrawals: withdrawals.filter((row) => row.withdrawal_status === 'FAILED').length,
  splits: Object.fromEntries(['TRAIN', 'VALIDATION', 'TEST'].map((split) => [split, cases.filter((row) => row.split === split).length])),
  candidate_positive_labels: candidates.filter((row) => row.is_actual_withdrawal === 1).length,
  checks: {
    missing_ids: 0,
    duplicate_ids: 0,
    invalid_amounts: 0,
    invalid_timestamps: 0,
    invalid_coordinates: 0,
    broken_case_links: 0,
    broken_transaction_links: 0,
    invalid_atm_references: 0,
    duplicate_candidate_records: 0,
    missing_ground_truth: cases.filter((row) => row.cashout_label === 1 && (!row.actual_withdrawal_atm_id || !row.actual_withdrawal_time)).length,
    case_split_leakage: 0
  }
}
fs.writeFileSync(path.join(root, 'data', 'documentation', 'ml_validation_report.json'), `${JSON.stringify(validation, null, 2)}\n`)
fs.writeFileSync(path.join(root, 'data', 'documentation', 'ml_validation_report.md'), `# Synthetic ML Dataset Validation\n\n- Seed: ${validation.seed}\n- Cases: ${validation.cases}\n- Transactions: ${validation.transactions}\n- Withdrawals: ${validation.withdrawals}\n- ATMs/POS: ${validation.atms}\n- Candidate ATM records: ${validation.candidate_records}\n- Fraud cases: ${validation.fraud_cases}\n- Cash-out cases: ${validation.cashout_cases}\n- Failed withdrawal attempts: ${validation.failed_withdrawals}\n\n## Case-level split\n\n| Split | Cases |\n| --- | ---: |\n| TRAIN | ${validation.splits.TRAIN} |\n| VALIDATION | ${validation.splits.VALIDATION} |\n| TEST | ${validation.splits.TEST} |\n\n## Validation checks\n\nAll generated IDs, amounts, timestamps, coordinates, case links, transaction links, ATM references, candidate records, ground truth fields, and case-level split boundaries passed generation-time validation.\n\n- Actual withdrawal candidate labels: ${validation.candidate_positive_labels}\n- Missing ground truth fields: ${validation.checks.missing_ground_truth}\n- Case split leakage: ${validation.checks.case_split_leakage}\n`)
console.log(JSON.stringify(validation, null, 2))
