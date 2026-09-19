import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizePublicCsv, readPublicCsv } from './publicAdapters.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sources = [
  { name: 'paysim', directory: path.join(root, 'data', 'raw', 'public', 'paysim') },
  { name: 'ieee-cis', directory: path.join(root, 'data', 'raw', 'public', 'ieee_cis') },
  { name: 'european-card', directory: path.join(root, 'data', 'raw', 'public', 'credit_card_fraud') }
]
const outputDirectory = path.join(root, 'data', 'processed', 'public')
fs.mkdirSync(outputDirectory, { recursive: true })

const columns = [
  'transaction_id', 'case_id', 'timestamp', 'amount', 'transaction_type', 'source_account', 'destination_account',
  'fraud_label', 'cash_out_label', 'account_age', 'transaction_velocity', 'transaction_frequency', 'balance_delta',
  'sequence_position', 'location', 'source_dataset', 'source_type', 'cash_out_label_origin', 'unavailable_fields'
]
const csvEscape = (value) => {
  const text = value === null || value === undefined ? '' : Array.isArray(value) ? value.join('|') : String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
const writeCsv = (filePath, rows) => {
  const lines = [columns.join(',')]
  rows.forEach((row) => lines.push(columns.map((column) => csvEscape(row[column])).join(',')))
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`)
}
const percentile = (values, fraction) => {
  if (!values.length) return null
  const sorted = [...values].sort((first, second) => first - second)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]
}
const summarize = (rows, source) => {
  const amounts = rows.map((row) => Number(row.amount)).filter(Number.isFinite)
  const types = Object.fromEntries(Object.entries(rows.reduce((counts, row) => {
    counts[row.transaction_type || 'NOT_AVAILABLE'] = (counts[row.transaction_type || 'NOT_AVAILABLE'] || 0) + 1
    return counts
  }, {})).sort((first, second) => second[1] - first[1]).slice(0, 10))
  const fraudRows = rows.filter((row) => row.fraud_label !== null && row.fraud_label !== '')
  const cashoutRows = rows.filter((row) => row.cash_out_label === 1)
  return {
    source,
    status: rows.length ? 'INGESTED' : 'NO_LOCAL_FILE',
    records: rows.length,
    amount_mean: amounts.length ? Number((amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length).toFixed(2)) : null,
    amount_p50: percentile(amounts, 0.5),
    amount_p95: percentile(amounts, 0.95),
    transaction_types: types,
    fraud_ratio: fraudRows.length ? Number((fraudRows.filter((row) => Number(row.fraud_label) === 1).length / fraudRows.length).toFixed(6)) : null,
    cashout_ratio: rows.length ? Number((cashoutRows.length / rows.length).toFixed(6)) : null,
    timestamp_available: rows.some((row) => row.timestamp),
    account_identifiers_available: rows.some((row) => row.source_account || row.destination_account),
    geographic_information_available: rows.some((row) => row.location),
    atm_information_available: false,
    labels_original_or_derived: source === 'paysim' ? 'fraud_label ORIGINAL; cash_out_label DERIVED_FROM_TRANSACTION_TYPE' : 'fraud_label ORIGINAL where supplied'
  }
}

const allRows = []
const sourceReports = []
for (const source of sources) {
  fs.mkdirSync(source.directory, { recursive: true })
  const csvFiles = fs.readdirSync(source.directory).filter((fileName) => fileName.toLowerCase().endsWith('.csv'))
  if (!csvFiles.length) {
    sourceReports.push(summarize([], source.name))
    continue
  }
  const sourceRows = csvFiles.flatMap((fileName) => normalizePublicCsv(source.name, path.join(source.directory, fileName), readPublicCsv(path.join(source.directory, fileName))))
  allRows.push(...sourceRows)
  sourceReports.push(summarize(sourceRows, source.name))
}

const syntheticPath = path.join(root, 'data', 'processed', 'ml_transactions.csv')
const syntheticRows = fs.existsSync(syntheticPath)
  ? readPublicCsv(syntheticPath).map((row) => ({
    ...row,
    source_dataset: 'SYNTHETIC_ML',
    cash_out_label: row.transaction_type === 'ATM_WITHDRAWAL' ? 1 : 0
  }))
  : []
const syntheticSummary = summarize(syntheticRows, 'synthetic-ml')

writeCsv(path.join(outputDirectory, 'public_transaction_normalized.csv'), allRows)
const report = {
  generated_at: new Date().toISOString(),
  note: 'Only locally supplied public dataset files are ingested. Missing downloads are reported, never replaced with fabricated rows.',
  sources: sourceReports,
  combined_records: allRows.length,
  synthetic_comparison: syntheticSummary,
  comparison_notes: [
    'Amount and transaction-type distributions are descriptive only; public data is not altered to match synthetic data.',
    'PaySim cash-out labels are derived from transaction type, while fraud labels remain original where supplied.',
    'Cash-out ATM locations and complaint relationships are synthetic because public transaction sources do not provide them.'
  ]
}
fs.writeFileSync(path.join(outputDirectory, 'public_ingestion_report.json'), `${JSON.stringify(report, null, 2)}\n`)
fs.writeFileSync(path.join(outputDirectory, 'public_ingestion_report.md'), `# Public Data Ingestion Report\n\n${sourceReports.map((source) => `## ${source.source}\n\n- Status: ${source.status}\n- Records: ${source.records}\n- Amount mean: ${source.amount_mean ?? 'NOT_AVAILABLE'}\n- Amount P50: ${source.amount_p50 ?? 'NOT_AVAILABLE'}\n- Amount P95: ${source.amount_p95 ?? 'NOT_AVAILABLE'}\n- Fraud ratio: ${source.fraud_ratio ?? 'NOT_AVAILABLE'}\n- Cash-out ratio: ${source.cashout_ratio ?? 'NOT_AVAILABLE'}\n- Timestamp available: ${source.timestamp_available}\n- Account identifiers available: ${source.account_identifiers_available}\n- Geographic information available: ${source.geographic_information_available}\n- ATM information available: ${source.atm_information_available}\n- Label provenance: ${source.labels_original_or_derived}\n`).join('\n')}\n## Combined\n\n- Normalized records: ${allRows.length}\n- Missing source files remain explicitly unintegrated; no synthetic rows are included in this public output.\n`)
fs.appendFileSync(path.join(outputDirectory, 'public_ingestion_report.md'), `\n## Synthetic comparison\n\n- Records: ${syntheticSummary.records}\n- Amount mean: ${syntheticSummary.amount_mean ?? 'NOT_AVAILABLE'}\n- Amount P50: ${syntheticSummary.amount_p50 ?? 'NOT_AVAILABLE'}\n- Amount P95: ${syntheticSummary.amount_p95 ?? 'NOT_AVAILABLE'}\n- Fraud ratio: ${syntheticSummary.fraud_ratio ?? 'NOT_AVAILABLE'}\n- Cash-out ratio: ${syntheticSummary.cashout_ratio ?? 'NOT_AVAILABLE'}\n\nPublic distributions are descriptive only and are never manipulated to match the synthetic corpus.\n`)
console.log(JSON.stringify(report, null, 2))
