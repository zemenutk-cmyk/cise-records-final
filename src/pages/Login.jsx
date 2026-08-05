import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { GraduationCap } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await login(username, pin)
      if (!res.ok) {
        setError(res.error)
      } else {
        navigate('/students', { replace: true })
      }
    } catch (err) {
      setError(`Unexpected error: ${err.message || String(err)}`)
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-cise-red text-white p-6 flex flex-col items-center gap-2">
          <GraduationCap size={36} />
          <h1 className="text-lg font-bold text-center">CISE Student Records</h1>
          <p className="text-xs text-white/80">Canadian International School of Ethiopia</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-cise-charcoal">Username</label>
            <input
              autoComplete="username"
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cise-red"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-cise-charcoal">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              className="mt-1 w-full border rounded-lg px-3 py-2 tracking-widest focus:outline-none focus:ring-2 focus:ring-cise-red"
              value={pin}
              onChange={e => setPin(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={busy}
            className="w-full bg-cise-red text-white rounded-lg py-2 font-semibold hover:bg-cise-red-dark transition disabled:opacity-60"
          >
            {busy ? 'Checking…' : 'Sign In'}
          </button>
          <p className="text-xs text-gray-400 text-center">
            First run default: director / 0000 — change this immediately in Settings.
          </p>
          <p className="text-[10px] text-gray-300 text-center">
            Build: v7-login-redirect-fix
          </p>
        </form>
      </div>
    </div>
  )
}
