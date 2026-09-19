import fs from 'node:fs'

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

const readRows = (filePath) => {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []
  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })
}

const numberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const timestampFromSeconds = (value) => {
  const seconds = numberOrNull(value)
  return seconds === null ? null : new Date(seconds * 1000).toISOString()
}

export const normalizeIeeeCisRows = (rows) => rows.map((row) => ({
  transaction_id: row.TransactionID || null,
  case_id: null,
  amount: numberOrNull(row.TransactionAmt),
  timestamp: timestampFromSeconds(row.TransactionDT),
  source_account: row.card1 || null,
  destination_account: null,
  fraud_label: row.isFraud === '' || row.isFraud === undefined ? null : Number(row.isFraud),
  cash_out_label: null,
  account_age: null,
  transaction_velocity: null,
  transaction_frequency: null,
  balance_delta: null,
  sequence_position: null,
  transaction_type: row.ProductCD || null,
  location: null,
  source_dataset: 'IEEE_CIS',
  source_type: 'PUBLIC',
  unavailable_fields: ['destination_account', 'atm_id', 'latitude', 'longitude']
}))

export const normalizeEuropeanCardRows = (rows) => rows.map((row, index) => ({
  transaction_id: `EU-${index + 1}`,
  case_id: null,
  amount: numberOrNull(row.Amount),
  timestamp: timestampFromSeconds(row.Time),
  source_account: null,
  destination_account: null,
  fraud_label: row.Class === '' || row.Class === undefined ? null : Number(row.Class),
  cash_out_label: null,
  account_age: null,
  transaction_velocity: null,
  transaction_frequency: null,
  balance_delta: null,
  sequence_position: null,
  transaction_type: 'CARD_PAYMENT',
  location: null,
  source_dataset: 'EUROPEAN_CARD',
  source_type: 'PUBLIC',
  unavailable_fields: ['source_account', 'destination_account', 'atm_id', 'latitude', 'longitude']
}))

export const normalizePaySimRows = (rows) => {
  const sequenceByAccount = new Map()
  return rows.map((row, index) => {
    const sourceAccount = row.nameOrig || null
    const sequencePosition = (sequenceByAccount.get(sourceAccount) || 0) + 1
    sequenceByAccount.set(sourceAccount, sequencePosition)
    const amount = numberOrNull(row.amount)
    const oldBalance = numberOrNull(row.oldbalanceOrg)
    const newBalance = numberOrNull(row.newbalanceOrig)
    return {
      transaction_id: `PAYSIM-${row.step || 'NA'}-${index + 1}`,
      case_id: null,
      amount,
      timestamp: row.step === '' || row.step === undefined ? null : new Date(Number(row.step) * 3600000).toISOString(),
      source_account: sourceAccount,
      destination_account: row.nameDest || null,
      fraud_label: row.isFraud === '' || row.isFraud === undefined ? null : Number(row.isFraud),
      cash_out_label: row.type === 'CASH_OUT' ? 1 : 0,
      account_age: null,
      transaction_velocity: null,
      transaction_frequency: null,
      balance_delta: oldBalance !== null && newBalance !== null ? oldBalance - newBalance : null,
      sequence_position: sequencePosition,
      transaction_type: row.type || null,
      location: null,
      source_dataset: 'PAYSIM',
      source_type: 'PUBLIC',
      cash_out_label_origin: 'DERIVED_FROM_TRANSACTION_TYPE',
      unavailable_fields: ['case_id', 'atm_id', 'latitude', 'longitude', 'account_age']
    }
  })
}

export const normalizePublicCsv = (datasetName, filePath, rows = readRows(filePath)) => {
  if (datasetName === 'paysim') return normalizePaySimRows(rows)
  if (datasetName === 'ieee-cis') return normalizeIeeeCisRows(rows)
  if (datasetName === 'european-card') return normalizeEuropeanCardRows(rows)
  throw new Error(`Unsupported public dataset adapter: ${datasetName}`)
}

export const readPublicCsv = readRows
