import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

export default function AccountsPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await api.get('/accounts')
        setAccounts(response.data)
      } catch (error) {
        if (error.response?.status === 401) navigate('/login')
      }
    }

    loadAccounts()
  }, [navigate])

  return (
    <div className="app-shell">
      <Sidebar />


      <main className="content">
        <div className="topbar">
          <h2>Account Registry</h2>
          <button className="logout-button" onClick={() => { localStorage.clear(); navigate('/login') }}>Logout</button>
        </div>

        <div className="card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Owner</th>
                  <th>Balance</th>
                  <th>Risk band</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.accountNumber}</td>
                    <td>{account.owner}</td>
                    <td>₹{account.balance.toLocaleString('en-IN')}</td>
                    <td><span className={`badge ${account.riskBand.toLowerCase()}`}>{account.riskBand}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
