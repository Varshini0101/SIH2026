import { demoAccounts, demoATMLocations, demoComplaints, demoTransactions, demoUsers } from '../data/demoData.js'
import bcrypt from 'bcryptjs'

export const getDemoData = () => ({
  users: demoUsers,
  accounts: demoAccounts,
  complaints: demoComplaints,
  transactions: demoTransactions,
  atmLocations: demoATMLocations
})

export const getUserByUsername = async (username) => {
  const user = demoUsers.find((entry) => entry.username === username || entry.email === username)
  if (!user) return null

  return {
    ...user,
    passwordHash: user.passwordHash
  }
}

export const verifyPassword = async (inputPassword, hash) => bcrypt.compare(inputPassword, hash)

export const createDemoTokenPayload = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role
})
