import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

export default function TransactionsPage() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)

  const loadTransactions = async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (status) params.status = status
      if (type) params.type = type
      params.sort = 'amount-desc'
      const response = await api.get('/transactions', { params })
      setTransactions(response.data)
    } catch (error) {
      if (error.response?.status === 401) navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [search, status, type])

  return (
    <div className="app-shell">
      <Sidebar />


      <main className="content">
        <div className="topbar">
          <h2>Transaction Management</h2>
          <button className="logout-button" onClick={() => { localStorage.clear(); navigate('/login') }}>Logout</button>
        </div>

        <div className="card">
          <div className="inline-actions" style={{ marginBottom: 16 }}>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transaction or account" style={{ maxWidth: 260 }} />
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 180 }}>
              <option value="">All status</option>
              <option value="SUSPICIOUS">SUSPICIOUS</option>
              <option value="CLEAR">CLEAR</option>
            </select>
            <select className="select" value={type} onChange={(e) => setType(e.target.value)} style={{ maxWidth: 180 }}>
              <option value="">All types</option>
              <option value="UPI">UPI</option>
              <option value="IMPS">IMPS</option>
              <option value="NEFT">NEFT</option>
              <option value="ATM_WITHDRAWAL">ATM_WITHDRAWAL</option>
              <option value="TRANSFER">TRANSFER</option>
            </select>
          </div>

          {loading ? <div className="empty-state">Loading transactions…</div> : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td>{txn.id}</td>
                      <td>{txn.sourceAccount}</td>
                      <td>{txn.destinationAccount}</td>
                      <td>₹{txn.amount.toLocaleString('en-IN')}</td>
                      <td>{txn.type}</td>
                      <td>{txn.location}</td>
                      <td><span className={`badge ${txn.status === 'SUSPICIOUS' ? 'risk' : 'low'}`}>{txn.status}</span></td>
                      <td><span className={`badge ${txn.riskIndicator.toLowerCase()}`}>{txn.riskIndicator}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
