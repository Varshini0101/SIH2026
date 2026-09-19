import { getDashboardData } from '../services/databaseService.js'
import { calculateRiskScore, explainRisk, getRiskLevel } from '../services/riskService.js'

export const getDashboardStats = async (req, res) => {
  try {
    const data = await getDashboardData()
    const recentTransactions = (data.recentTransactions || []).map((txn) => ({
      ...txn,
      riskLabel: getRiskLevel(txn.riskScore || 70)
    }))

    return res.json({
      ...data,
      recentTransactions
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load dashboard data' })
  }
}

export const getRiskAnalysis = async (req, res) => {
  try {
    const data = await getDashboardData()
    const results = (data.recentTransactions || []).map((txn) => {
      const score = calculateRiskScore({
        amount: txn.amount,
        frequency: 3,
        suspiciousCount: txn.status === 'SUSPICIOUS' ? 2 : 1,
        withdrawalCount: txn.type === 'ATM_WITHDRAWAL' ? 2 : 0
      })

      return {
        transactionId: txn.id || txn.transactionId,
        sourceAccount: txn.sourceAccount,
        amount: txn.amount,
        riskScore: score,
        riskLevel: getRiskLevel(score),
        explanation: explainRisk({
          amount: txn.amount,
          frequency: 3,
          suspiciousCount: txn.status === 'SUSPICIOUS' ? 2 : 1,
          withdrawalCount: txn.type === 'ATM_WITHDRAWAL' ? 2 : 0
        }).summary
      }
    })

    return res.json(results)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load risk analysis' })
  }
}
