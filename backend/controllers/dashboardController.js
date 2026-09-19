import { getDashboardData } from '../services/databaseService.js'

export const getDashboard = async (req, res) => {
  try {
    const data = await getDashboardData()
    res.json(data)
  } catch (error) {
    res.status(500).json({ message: 'Unable to load dashboard data' })
  }
}
