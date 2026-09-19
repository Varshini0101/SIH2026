import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'

const emptyForm = {
  complaintDate: new Date().toISOString().slice(0, 10),
  fraudType: 'UPI FRAUD',
  fraudAmount: 20000,
  victimIdentifier: 'VIC-NEW',
  suspectedAccount: 'SBIN0001001',
  status: 'NEW',
  location: 'Chennai',
  description: ''
}

export default function ComplaintsPage() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)

  const loadComplaints = async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const response = await api.get('/complaints', { params })
      setComplaints(response.data)
    } catch (error) {
      if (error.response?.status === 401) navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComplaints()
  }, [search, statusFilter])

  const handleFieldChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const handleCreateComplaint = async (event) => {
    event.preventDefault()
    try {
      await api.post('/complaints', form)
      setForm(emptyForm)
      await loadComplaints()
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async (complaintId) => {
    if (!window.confirm('Delete this complaint?')) return
    try {
      await api.delete(`/complaints/${complaintId}`)
      await loadComplaints()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />


      <main className="content">
        <div className="topbar">
          <h2>Complaint Management</h2>
          <button className="logout-button" onClick={() => { localStorage.clear(); navigate('/login') }}>Logout</button>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Add new complaint</h3>
          <form onSubmit={handleCreateComplaint}>
            <div className="form-grid">
              <label className="label">Date<input className="input" name="complaintDate" type="date" value={form.complaintDate} onChange={handleFieldChange} /></label>
              <label className="label">Fraud type<select className="select" name="fraudType" value={form.fraudType} onChange={handleFieldChange}><option>UPI FRAUD</option><option>ATM WITHDRAWAL</option><option>IMPS FRAUD</option><option>NEFT FRAUD</option><option>BANKING FRAUD</option></select></label>
              <label className="label">Amount<input className="input" name="fraudAmount" type="number" value={form.fraudAmount} onChange={handleFieldChange} /></label>
              <label className="label">Victim identifier<input className="input" name="victimIdentifier" value={form.victimIdentifier} onChange={handleFieldChange} /></label>
              <label className="label">Suspected account<input className="input" name="suspectedAccount" value={form.suspectedAccount} onChange={handleFieldChange} /></label>
              <label className="label">Status<select className="select" name="status" value={form.status} onChange={handleFieldChange}><option>NEW</option><option>UNDER_INVESTIGATION</option><option>HIGH_RISK</option><option>RESOLVED</option></select></label>
              <label className="label">Location<input className="input" name="location" value={form.location} onChange={handleFieldChange} /></label>
              <label className="label">Description<input className="input" name="description" value={form.description} onChange={handleFieldChange} /></label>
            </div>
            <div className="inline-actions" style={{ marginTop: 16 }}>
              <button className="primary-button" type="submit">Add complaint</button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="inline-actions" style={{ marginBottom: 16 }}>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, location, keyword" style={{ maxWidth: 260 }} />
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
              <option value="">All statuses</option>
              <option value="NEW">NEW</option>
              <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
              <option value="HIGH_RISK">HIGH_RISK</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>

          {loading ? <div className="empty-state">Loading complaints…</div> : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Case ID</th>
                    <th>Date</th>
                    <th>Fraud type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((complaint) => {
                    const investigationTarget = complaint.caseId || complaint.complaintId || complaint.id
                    return (
                      <tr key={complaint.id}>
                        <td>{complaint.id}</td>
                        <td>{complaint.caseId || '—'}</td>
                        <td>{complaint.complaintDate}</td>
                        <td>{complaint.fraudType}</td>
                        <td>₹{complaint.fraudAmount.toLocaleString('en-IN')}</td>
                        <td><span className={`badge ${complaint.status === 'HIGH_RISK' ? 'high' : complaint.status === 'UNDER_INVESTIGATION' ? 'investigation' : complaint.status === 'RESOLVED' ? 'resolved' : 'new'}`}>{complaint.status}</span></td>
                        <td>{complaint.location}</td>
                        <td>
                          <Link className="primary-button" to={`/case/${investigationTarget}`} style={{ display: 'inline-block', textDecoration: 'none', marginRight: 8 }}>Investigate</Link>
                          <button className="danger-button" onClick={() => handleDelete(complaint.id)}>Delete</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
