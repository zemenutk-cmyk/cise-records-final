import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { initDatabase } from './db/database'
import Login from './pages/Login'
import LockScreen from './pages/LockScreen'
import Layout from './components/Layout'
import StudentList from './pages/StudentList'
import StudentForm from './pages/StudentForm'
import StudentDetail from './pages/StudentDetail'
import AuditLog from './pages/AuditLog'
import Settings from './pages/Settings'

function Gate({ children }) {
  const { user, locked } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (locked) return <LockScreen />
  return children
}

function LoginRoute() {
  const { user } = useAuth()
  // If already authenticated (state updated but something prevented the
  // explicit navigate() call from taking effect), redirect immediately
  // rather than leaving the person stuck on the login screen.
  if (user) return <Navigate to="/students" replace />
  return <Login />
}

function DirectorOnly({ children }) {
  const { user } = useAuth()
  if (user?.role !== 'director') return <Navigate to="/students" replace />
  return children
}

function Shell() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="/"
        element={
          <Gate>
            <Layout />
          </Gate>
        }
      >
        <Route index element={<Navigate to="/students" replace />} />
        <Route path="students" element={<StudentList />} />
        <Route path="students/new" element={<StudentForm />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="students/:id/edit" element={<StudentForm />} />
        <Route
          path="audit-log"
          element={
            <DirectorOnly>
              <AuditLog />
            </DirectorOnly>
          }
        />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch(err => setError(err.message || String(err)))
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6">
        <div>
          <p className="font-bold text-cise-red">Could not initialize database</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>
  }

  return (
    <HashRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </HashRouter>
  )
}
