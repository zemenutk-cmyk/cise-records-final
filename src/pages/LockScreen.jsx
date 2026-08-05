import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Lock } from 'lucide-react'

export default function LockScreen() {
  const { user, unlock, logout } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const res = await unlock(pin)
    if (!res.ok) {
      setError(res.error)
      setPin('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cise-charcoal/95 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 space-y-4 text-center">
        <Lock className="mx-auto text-cise-red" size={32} />
        <div>
          <p className="font-semibold text-cise-charcoal">Session locked</p>
          <p className="text-sm text-gray-500">Signed in as {user?.name} ({user?.role})</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            className="w-full border rounded-lg px-3 py-2 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-cise-red"
            placeholder="Enter PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="w-full bg-cise-red text-white rounded-lg py-2 font-semibold hover:bg-cise-red-dark transition">
            Unlock
          </button>
        </form>
        <button onClick={logout} className="text-xs text-gray-400 underline">
          Not you? Sign out
        </button>
      </div>
    </div>
  )
}
