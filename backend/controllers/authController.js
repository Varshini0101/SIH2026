import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getUserByUsername, verifyPassword } from '../services/databaseService.js'

const pendingPasskeys = new Map()
const PASSKEY_TTL_MS = 5 * 60 * 1000
const MAX_PASSKEY_ATTEMPTS = 5

const issueToken = (user) => jwt.sign(
  {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  },
  process.env.JWT_SECRET || 'super_secret_jwt_key_sih_2026',
  { expiresIn: '8h' }
)

const userResponse = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role
})

export const login = async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' })
  }

  try {
    const user = await getUserByUsername(username)

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isValid = await verifyPassword(password, user.passwordHash)

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const challengeId = crypto.randomUUID()
    const passkey = String(crypto.randomInt(100000, 1000000))
    pendingPasskeys.set(challengeId, {
      user,
      passkeyHash: await bcrypt.hash(passkey, 10),
      expiresAt: Date.now() + PASSKEY_TTL_MS,
      attempts: 0
    })

    return res.json({
      requiresPasskey: true,
      challengeId,
      passkey,
      expiresInSeconds: PASSKEY_TTL_MS / 1000,
      user: userResponse(user)
    })
  } catch (error) {
    return res.status(500).json({ message: 'Login failed' })
  }
}

export const verifyPasskey = async (req, res) => {
  const { challengeId, passkey } = req.body
  const challenge = pendingPasskeys.get(challengeId)

  if (!challenge || challenge.expiresAt <= Date.now()) {
    pendingPasskeys.delete(challengeId)
    return res.status(401).json({ message: 'Passkey expired. Please start login again.' })
  }

  if (!passkey || !(await bcrypt.compare(String(passkey), challenge.passkeyHash))) {
    challenge.attempts += 1
    if (challenge.attempts >= MAX_PASSKEY_ATTEMPTS) pendingPasskeys.delete(challengeId)
    return res.status(401).json({ message: 'Invalid passkey' })
  }

  pendingPasskeys.delete(challengeId)
  return res.json({ token: issueToken(challenge.user), user: userResponse(challenge.user) })
}
