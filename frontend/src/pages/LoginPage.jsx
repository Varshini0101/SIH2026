import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: 'investigator', password: 'demo123' })
  const [challenge, setChallenge] = useState(null)
  const [passkey, setPasskey] = useState('')
  const [serverPasskey, setServerPasskey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = challenge
        ? await api.post('/auth/verify-passkey', { challengeId: challenge, passkey })
        : await api.post('/auth/login', form)

      if (!challenge && response.data.requiresPasskey) {
        setChallenge(response.data.challengeId)
        setServerPasskey(response.data.passkey)
        return
      }

      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>Cybercrime Intelligence</h1>
        <p className="login-subtitle">Secure investigative dashboard access</p>

        <form onSubmit={handleSubmit}>
          {!challenge ? (
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label className="label">
              Username / Email
              <input className="input" name="username" value={form.username} onChange={handleChange} />
            </label>

            <label className="label">
              Password
              <input className="input" type="password" name="password" value={form.password} onChange={handleChange} />
            </label>
          </div>
          ) : (
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <p className="login-subtitle">Enter the one-time passkey returned by the server.</p>
              <p><strong>Server passkey:</strong> {serverPasskey}</p>
              <label className="label">
                One-time passkey
                <input className="input" name="passkey" inputMode="numeric" maxLength="6" value={passkey} onChange={(event) => setPasskey(event.target.value)} autoFocus />
              </label>
            </div>
          )}

          {error && <p style={{ color: '#ffb3b8', marginTop: '12px' }}>{error}</p>}

          <div style={{ marginTop: 20 }}>
            <button className="primary-button" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Verifying...' : challenge ? 'Verify passkey' : 'Continue'}
            </button>
          </div>
        </form>

        <p className="login-subtitle" style={{ marginTop: 18, marginBottom: 0 }}>
          {challenge ? 'The passkey expires after 5 minutes and can be used once.' : 'Demo credentials: investigator / demo123'}
        </p>
      </div>
    </div>
  )
}
