const fs = require('fs')
const path = require('path')

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result.map((value) => value.trim())
}

function parseCsvFile(filePath) {
  const absolutePath = path.resolve(filePath)
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`)
  }

  const content = fs.readFileSync(absolutePath, 'utf8')
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    return []
  }

  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : ''
    })
    return row
  })
}

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return null

  const sorted = [...values].sort((left, right) => left - right)
  const middleIndex = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2
  }

  return sorted[middleIndex]
}

function safeDate(value) {
  if (!value || value === '') return null

  const parsedTime = Date.parse(value)
  if (Number.isNaN(parsedTime)) return null

  return new Date(parsedTime)
}

function clampToPositive(value, fallback = 0) {
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, value)
}

function minutesToHours(minutes) {
  return Number((minutes / 60).toFixed(2))
}

function timeWindowFromMinutes(minutes) {
  const safeMinutes = clampToPositive(minutes, 0)

  if (safeMinutes <= 30) return 'under 1 hour'
  if (safeMinutes <= 60) return '1 hour'
  if (safeMinutes <= 120) return '1-2 hours'
  if (safeMinutes <= 240) return '2-4 hours'
  if (safeMinutes <= 480) return '4-8 hours'
  if (safeMinutes <= 720) return '8-12 hours'
  return '12+ hours'
}

function getProjectRoot() {
  return path.resolve(__dirname, '..')
}

function getCasesDatasetPath() {
  return path.join(getProjectRoot(), 'data', 'processed', 'ml_cases.csv')
}

function getWithdrawalsDatasetPath() {
  return path.join(getProjectRoot(), 'data', 'processed', 'ml_withdrawals.csv')
}

function loadCaseRows() {
  return parseCsvFile(getCasesDatasetPath())
}

function loadWithdrawalRows() {
  return parseCsvFile(getWithdrawalsDatasetPath())
}

function getCaseById(caseId) {
  const rows = loadCaseRows()
  return rows.find((row) => String(row.case_id || '').trim() === String(caseId || '').trim()) || null
}

function getWithdrawalHistoryForCase(caseId) {
  const rows = loadWithdrawalRows()
  return rows
    .filter((row) => String(row.case_id || '').trim() === String(caseId || '').trim())
    .map((row) => ({
      ...row,
      timestamp: row.timestamp,
      date: safeDate(row.timestamp),
      amount: toNumber(row.amount, 0)
    }))
    .filter((row) => row.date)
    .sort((left, right) => left.date - right.date)
}

function historicalBaselineStats() {
  const rows = loadCaseRows().filter((row) => String(row.cashout_label || '').trim() === '1')

  const validTimes = rows
    .map((row) => toNumber(row.time_to_cashout, null))
    .filter((value) => Number.isFinite(value) && value > 0)

  const byPattern = new Map()
  const byPatternHour = new Map()

  rows.forEach((row) => {
    const minutes = toNumber(row.time_to_cashout, null)
    const pattern = String(row.pattern || 'UNKNOWN').trim() || 'UNKNOWN'
    const hour = toNumber(row.hour, null)

    if (Number.isFinite(minutes) && minutes > 0) {
      if (!byPattern.has(pattern)) byPattern.set(pattern, [])
      byPattern.get(pattern).push(minutes)

      if (Number.isFinite(hour)) {
        const key = `${pattern}|${hour}`
        if (!byPatternHour.has(key)) byPatternHour.set(key, [])
        byPatternHour.get(key).push(minutes)
      }
    }
  })

  return {
    overallMedian: median(validTimes),
    byPattern: Object.fromEntries([...byPattern.entries()].map(([key, values]) => [key, median(values)])),
    byPatternHour: Object.fromEntries([...byPatternHour.entries()].map(([key, values]) => [key, median(values)]))
  }
}

function explainChangeFromHistorical(caseRow) {
  if (!caseRow) return null

  const pattern = String(caseRow.pattern || 'UNKNOWN').trim() || 'UNKNOWN'
  const hour = toNumber(caseRow.hour, null)
  const baseline = historicalBaselineStats()

  if (Number.isFinite(hour) && baseline.byPatternHour[`${pattern}|${hour}`]) {
    return {
      basis: `pattern + hour median`,
      pattern,
      hour,
      comparisonMinutes: baseline.byPatternHour[`${pattern}|${hour}`]
    }
  }

  if (baseline.byPattern[pattern]) {
    return {
      basis: 'pattern median',
      pattern,
      comparisonMinutes: baseline.byPattern[pattern]
    }
  }

  return {
    basis: 'overall median',
    comparisonMinutes: baseline.overallMedian
  }
}

function estimateFromWithdrawalHistory(caseId) {
  const history = getWithdrawalHistoryForCase(caseId)
  if (history.length < 2) return null

  const first = history[0].date.getTime()
  const last = history[history.length - 1].date.getTime()
  const elapsedMinutes = Math.max(0, (last - first) / 60000)

  return {
    elapsedMinutes,
    source: 'withdrawal timestamp difference',
    timestamps: [history[0].timestamp, history[history.length - 1].timestamp]
  }
}

function predictTimeToCashoutForCase(caseId) {
  const caseRow = getCaseById(caseId)

  if (!caseRow) {
    return {
      caseId,
      estimatedMinutes: null,
      estimatedHours: null,
      timeWindow: 'no historical case record',
      confidence: 'low',
      source: 'no matching record in ml_cases.csv',
      details: {
        checkedFields: ['case_id', 'actual_withdrawal_time', 'time_to_cashout'],
        message: 'No case record was found in the processed case dataset.'
      }
    }
  }

  const directMinutes = toNumber(caseRow.time_to_cashout, null)
  const actualWithdrawalTime = safeDate(caseRow.actual_withdrawal_time)

  if (Number.isFinite(directMinutes) && directMinutes > 0) {
    return {
      caseId,
      estimatedMinutes: Number(directMinutes.toFixed(1)),
      estimatedHours: minutesToHours(directMinutes),
      timeWindow: timeWindowFromMinutes(directMinutes),
      confidence: 'high',
      source: 'historical case-level time_to_cashout field',
      details: {
        usedFields: ['time_to_cashout', 'actual_withdrawal_time'],
        actualWithdrawalTime: actualWithdrawalTime ? actualWithdrawalTime.toISOString() : null,
        explanation: 'This value is already derived in the project data as the elapsed time from suspicious activity to cash-out.'
      }
    }
  }

  const withdrawalHistory = estimateFromWithdrawalHistory(caseId)
  if (withdrawalHistory && withdrawalHistory.elapsedMinutes > 0) {
    return {
      caseId,
      estimatedMinutes: Number(withdrawalHistory.elapsedMinutes.toFixed(1)),
      estimatedHours: minutesToHours(withdrawalHistory.elapsedMinutes),
      timeWindow: timeWindowFromMinutes(withdrawalHistory.elapsedMinutes),
      confidence: 'medium',
      source: 'withdrawal timestamp difference',
      details: {
        usedFields: ['timestamp'],
        timestamps: withdrawalHistory.timestamps,
        explanation: 'The elapsed time was inferred from the first and last withdrawal timestamps recorded for the case.'
      }
    }
  }

  const baseline = historicalBaselineStats()
  const estimateDetails = explainChangeFromHistorical(caseRow)
  const historicalEstimate = estimateDetails && Number.isFinite(estimateDetails.comparisonMinutes)
    ? estimateDetails.comparisonMinutes
    : baseline.overallMedian

  const finalMinutes = clampToPositive(historicalEstimate, baseline.overallMedian || 0)

  return {
    caseId,
    estimatedMinutes: Number(finalMinutes.toFixed(1)),
    estimatedHours: minutesToHours(finalMinutes),
    timeWindow: timeWindowFromMinutes(finalMinutes),
    confidence: estimateDetails && estimateDetails.basis !== 'overall median' ? 'medium' : 'low',
    source: 'historical pattern baseline',
    details: {
      usedFields: ['pattern', 'hour', 'time_to_cashout'],
      historicalBasis: estimateDetails ? estimateDetails.basis : 'overall median',
      pattern: String(caseRow.pattern || 'UNKNOWN').trim() || 'UNKNOWN',
      hour: toNumber(caseRow.hour, null),
      comparisonMinutes: Number(finalMinutes.toFixed(1)),
      explanation: 'When no direct time-to-cashout field exists, the model falls back to the median historical elapsed time for the same pattern or overall historical cases.'
    }
  }
}

module.exports = {
  parseCsvFile,
  predictTimeToCashoutForCase,
  historicalBaselineStats,
  estimateFromWithdrawalHistory,
  timeWindowFromMinutes,
  minutesToHours,
  getCaseById,
  getWithdrawalHistoryForCase,
  loadCaseRows,
  loadWithdrawalRows
}
