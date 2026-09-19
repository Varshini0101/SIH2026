import { getAccountSummary } from '../services/databaseService.js'

export const getAccounts = async (req, res) => {
  try {
    const accounts = await getAccountSummary()
    return res.json(accounts)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load accounts' })
  }
}
