import jwt from 'jsonwebtoken'

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_sih_2026'
    const decoded = jwt.verify(token, secret)
    req.user = decoded
    return next()
  } catch (error) {
    console.error('Auth verification error:', error.message)
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

