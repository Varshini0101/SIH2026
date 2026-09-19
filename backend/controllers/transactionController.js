import { getTransactions as getTransactionRecords, getTransactionById as getTransactionRecordById } from '../services/databaseService.js'

export const getTransactions = async (req, res) => {
  try {
    const results = await getTransactionRecords(req.query)
    return res.json(results)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load transactions' })
  }
}

export const getTransactionById = async (req, res) => {
  const { id } = req.params

  try {
    const transaction = await getTransactionRecordById(id)

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' })
    }

    return res.json(transaction)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch transaction' })
  }
}
