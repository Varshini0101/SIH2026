import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const processed = path.join(root, 'data', 'processed')
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
  const lines = fs.readFileSync(path.join(processed, fileName), 'utf8').trim().split(/\r?\n/)
  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, parseCsvLine(line)[index] ?? ''])))
}
const readHeaders = (fileName) => parseCsvLine(fs.readFileSync(path.join(processed, fileName), 'utf8').split(/\r?\n/)[0])
const cases = readCsv('ml_cases.csv')
const transactions = readCsv('ml_transactions.csv')
const withdrawals = readCsv('ml_withdrawals.csv')
const atms = readCsv('atm_locations.csv')
const candidates = readCsv('atm_ranking_candidates.csv')
const trainingHeaders = readHeaders('ml_training.csv')
const publicOutput = path.join(processed, 'public', 'public_transaction_normalized.csv')
const publicReportPath = path.join(root, 'data', 'processed', 'public', 'public_ingestion_report.json')
const issues = []
const assert = (condition, message) => { if (!condition) issues.push(message) }
const unique = (rows, key) => new Set(rows.map((row) => row[key])).size
const validTimestamp = (value) => !Number.isNaN(Date.parse(value))
const validCoordinate = (value, min, max) => Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max
const caseIds = new Set(cases.map((row) => row.case_id))
const transactionIds = new Set(transactions.map((row) => row.transaction_id))
const atmIds = new Set(atms.map((row) => row.atm_id))

assert(unique(cases, 'case_id') === cases.length, 'Duplicate case IDs')
assert(unique(transactions, 'transaction_id') === transactions.length, 'Duplicate transaction IDs')
assert(unique(withdrawals, 'withdrawal_id') === withdrawals.length, 'Duplicate withdrawal IDs')
assert(unique(atms, 'atm_id') === atms.length, 'Duplicate ATM IDs')
assert(transactions.every((row) => caseIds.has(row.case_id) && Number(row.amount) > 0 && validTimestamp(row.timestamp)), 'Invalid transaction amount, timestamp, or case link')
assert(withdrawals.every((row) => caseIds.has(row.case_id) && transactionIds.has(row.transaction_id) && atmIds.has(row.atm_id) && Number(row.amount) > 0 && validTimestamp(row.timestamp)), 'Invalid withdrawal foreign key, amount, or timestamp')
assert(atms.every((row) => validCoordinate(row.latitude, -90, 90) && validCoordinate(row.longitude, -180, 180)), 'Invalid ATM coordinates')
assert(candidates.every((row) => caseIds.has(row.case_id) && atmIds.has(row.candidate_atm_id)), 'Invalid candidate foreign key')
assert(new Set(candidates.map((row) => `${row.case_id}:${row.candidate_atm_id}`)).size === candidates.length, 'Duplicate candidate records')
assert(cases.filter((row) => row.cashout_label === '1').every((row) => row.actual_withdrawal_atm_id && row.actual_withdrawal_time && row.actual_withdrawal_amount), 'Missing cash-out ground truth')
const splitByCase = new Map(cases.map((row) => [row.case_id, row.split]))
assert(transactions.every((row) => splitByCase.get(row.case_id)), 'Missing case split for transaction')
assert(candidates.every((row) => splitByCase.get(row.case_id) === row.split), 'Case split leakage in candidates')
const candidateLabelsByCase = new Map()
candidates.forEach((row) => {
  const labels = candidateLabelsByCase.get(row.case_id) || []
  labels.push(Number(row.is_actual_withdrawal))
  candidateLabelsByCase.set(row.case_id, labels)
})
cases.forEach((row) => {
  const positiveLabels = (candidateLabelsByCase.get(row.case_id) || []).filter((label) => label === 1).length
  assert(positiveLabels === (row.cashout_label === '1' ? 1 : 0), `Ambiguous ATM ground truth for ${row.case_id}`)
})
assert(!trainingHeaders.some((header) => ['actual_withdrawal_atm_id', 'actual_withdrawal_latitude', 'actual_withdrawal_longitude', 'actual_withdrawal_time', 'actual_withdrawal_amount', 'time_to_cashout', 'time_since_fraud_event'].includes(header)), 'Future withdrawal information exposed in training features')
assert(fs.existsSync(publicOutput) && fs.existsSync(publicReportPath), 'Public ingestion output is missing; run npm run normalize:public')
if (fs.existsSync(publicOutput)) {
  const publicRows = readCsv(path.join('public', 'public_transaction_normalized.csv'))
  const publicHeaders = readHeaders(path.join('public', 'public_transaction_normalized.csv'))
  const requiredPublicHeaders = ['transaction_id', 'case_id', 'timestamp', 'amount', 'transaction_type', 'source_account', 'destination_account', 'fraud_label', 'cash_out_label', 'source_dataset', 'source_type']
  assert(requiredPublicHeaders.every((header) => publicHeaders.includes(header)), 'Normalized public schema is incomplete')
  assert(publicRows.every((row) => row.source_type === 'PUBLIC'), 'Non-public row found in normalized public output')
}
if (fs.existsSync(publicReportPath)) {
  const publicReport = JSON.parse(fs.readFileSync(publicReportPath, 'utf8'))
  assert(Array.isArray(publicReport.sources) && publicReport.sources.length === 3, 'Public source report is incomplete')
}
const manifestPath = path.join(root, 'data', 'documentation', 'ml_generation_manifest.json')
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const currentHash = createHash('sha256').update(fs.readFileSync(path.join(processed, 'ml_training.csv'))).digest('hex')
  assert(manifest.training_sha256 === currentHash, 'Generated training file does not match its reproducibility manifest')
}
assert(cases.length >= 500 && transactions.length >= 5000 && withdrawals.length >= 500 && atms.length >= 100, 'Dataset is below the minimum target size')

const report = {
  cases: cases.length,
  transactions: transactions.length,
  withdrawals: withdrawals.length,
  atms: atms.length,
  candidates: candidates.length,
  fraud_cases: cases.filter((row) => row.fraud_label === '1').length,
  cashout_cases: cases.filter((row) => row.cashout_label === '1').length,
  splits: Object.fromEntries(['TRAIN', 'VALIDATION', 'TEST'].map((split) => [split, cases.filter((row) => row.split === split).length])),
  issues
}
fs.writeFileSync(path.join(root, 'data', 'documentation', 'ml_validation_report.json'), `${JSON.stringify(report, null, 2)}\n`)
if (issues.length) {
  console.error(JSON.stringify(report, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify(report, null, 2))
}
