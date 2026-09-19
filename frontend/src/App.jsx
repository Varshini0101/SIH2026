import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ComplaintsPage from './pages/ComplaintsPage'
import TransactionsPage from './pages/TransactionsPage'
import AccountsPage from './pages/AccountsPage'
import PredictionsPage from './pages/PredictionsPage'
import MapPage from './pages/MapPage'
import CasePage from './pages/CasePage'
import MoneyTrailPage from './pages/MoneyTrailPage'
import RiskIntelligencePage from './pages/RiskIntelligencePage'
import InvestigationPage from './pages/InvestigationPage'

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setSessionReady(true)
    if (!token) {
      console.info('No auth token found')
    }
  }, [])

  if (!sessionReady) return null

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints"
        element={
          <ProtectedRoute>
            <ComplaintsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounts"
        element={
          <ProtectedRoute>
            <AccountsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/predictions"
        element={
          <ProtectedRoute>
            <PredictionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <MapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/case/:id"
        element={
          <ProtectedRoute>
            <CasePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/money-trail"
        element={
          <ProtectedRoute>
            <MoneyTrailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/risk-intelligence"
        element={
          <ProtectedRoute>
            <RiskIntelligencePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/investigation"
        element={
          <ProtectedRoute>
            <InvestigationPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
