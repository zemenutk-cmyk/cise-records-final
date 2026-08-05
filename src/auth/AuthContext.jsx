import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { getUserByUsername, addAuditLog } from '../db/database'
import { verifyPin } from './crypto'

const AuthContext = createContext(null)

const SESSION_TIMEOUT_MS = 3 * 60 * 1000 // auto-lock after 3 minutes idle
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MS = 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [locked, setLocked] = useState(false)
  const failedAttempts = useRef(0)
  const lockoutUntil = useRef(0)
  const idleTimer = useRef(null)

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (!user) return
    idleTimer.current = setTimeout(() => {
      setLocked(true)
    }, SESSION_TIMEOUT_MS)
  }, [user])

  useEffect(() => {
    if (!user) return
    const events = ['click', 'keydown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, resetIdleTimer))
    resetIdleTimer()
    return () => events.forEach(e => window.removeEventListener(e, resetIdleTimer))
  }, [user, resetIdleTimer])

  async function login(username, pin) {
    if (Date.now() < lockoutUntil.current) {
      const secs = Math.ceil((lockoutUntil.current - Date.now()) / 1000)
      return { ok: false, error: `Too many attempts. Try again in ${secs}s.` }
    }
    try {
      const record = await getUserByUsername(username.trim().toLowerCase())
      const valid = record && record.active && verifyPin(pin, record.salt, record.pinHash)
      if (!valid) {
        failedAttempts.current += 1
        await addAuditLog({
          userId: record?.id,
          username,
          action: 'LOGIN_FAILED',
          targetType: 'auth',
          details: 'Invalid username or PIN',
        })
        if (failedAttempts.current >= MAX_FAILED_ATTEMPTS) {
          lockoutUntil.current = Date.now() + LOCKOUT_MS
          failedAttempts.current = 0
          return { ok: false, error: 'Too many failed attempts. Locked for 60s.' }
        }
        return { ok: false, error: 'Invalid username or PIN.' }
      }
      failedAttempts.current = 0
      setUser(record)
      setLocked(false)
      await addAuditLog({ userId: record.id, username: record.username, action: 'LOGIN_SUCCESS', targetType: 'auth' })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: `Login failed: ${err.message || String(err)}` }
    }
  }

  async function unlock(pin) {
    if (!user) return { ok: false, error: 'No active session.' }
    const valid = verifyPin(pin, user.salt, user.pinHash)
    if (!valid) return { ok: false, error: 'Incorrect PIN.' }
    setLocked(false)
    resetIdleTimer()
    return { ok: true }
  }

  async function logout() {
    if (user) {
      await addAuditLog({ userId: user.id, username: user.username, action: 'LOGOUT', targetType: 'auth' })
    }
    setUser(null)
    setLocked(false)
    if (idleTimer.current) clearTimeout(idleTimer.current)
  }

  return (
    <AuthContext.Provider value={{ user, locked, login, unlock, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
