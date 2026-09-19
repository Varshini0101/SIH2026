const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const normalizeRisk = (score) => clamp(Math.round(score), 0, 100)

export const calculateRiskScore = ({ amount, frequency, suspiciousCount, withdrawalCount }) => {
  const amountFactor = Math.min(amount / 2500, 40)
  const frequencyFactor = Math.min(frequency * 8, 20)
  const suspiciousFactor = Math.min(suspiciousCount * 10, 25)
  const withdrawalFactor = Math.min(withdrawalCount * 12, 15)

  const rawScore = amountFactor + frequencyFactor + suspiciousFactor + withdrawalFactor
  return normalizeRisk(rawScore)
}

export const getRiskLevel = (score) => {
  if (score <= 30) return 'LOW'
  if (score <= 60) return 'MEDIUM'
  if (score <= 80) return 'HIGH'
  return 'CRITICAL'
}

export const explainRisk = ({ amount, frequency, suspiciousCount, withdrawalCount }) => {
  const explanations = []

  if (amount > 25000) explanations.push(`₹${amount.toLocaleString('en-IN')} transaction detected`)
  if (frequency >= 3) explanations.push(`${frequency} quick actions within 24 hours`)
  if (suspiciousCount > 0) explanations.push(`${suspiciousCount} suspicious transactions flagged`)
  if (withdrawalCount > 0) explanations.push(`${withdrawalCount} ATM withdrawals observed in recent activity`)

  return {
    summary: explanations.length
      ? explanations.join('; ')
      : 'Limited suspicious activity observed',
    elements: explanations
  }
}
