import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { createUser, addAuditLog, getUsers, updateUserPin } from '../db/database'
import { hashPin, verifyPin } from '../auth/crypto'

export default function Settings() {
  const { user } = useAuth()
  const [pinForm, setPinForm] = useState({ current: '', next: '', confirm: '' })
  const [pinMsg, setPinMsg] = useState('')
  const [teacherForm, setTeacherForm] = useState({ name: '', username: '', pin: '', assignedClass: '' })
  const [teacherMsg, setTeacherMsg] = useState('')

  async function handleChangePin(e) {
    e.preventDefault()
    setPinMsg('')
    if (!verifyPin(pinForm.current, user.salt, user.pinHash)) {
      setPinMsg('Current PIN is incorrect.')
      return
    }
    if (pinForm.next.length < 4) {
      setPinMsg('New PIN must be at least 4 digits.')
      return
    }
    if (pinForm.next !== pinForm.confirm) {
      setPinMsg('New PIN and confirmation do not match.')
      return
    }
    const newHash = hashPin(pinForm.next, user.salt)
    await updateUserPin(user.id, newHash)
    await addAuditLog({ userId: user.id, username: user.username, action: 'PIN_CHANGE', targetType: 'auth' })
    setPinMsg('PIN updated. It takes effect on your next sign-in.')
    setPinForm({ current: '', next: '', confirm: '' })
  }

  async function handleAddTeacher(e) {
    e.preventDefault()
    setTeacherMsg('')
    const existing = await getUsers()
    if (existing.some(u => u.username === teacherForm.username.trim().toLowerCase())) {
      setTeacherMsg('That username already exists.')
      return
    }
    await createUser({
      name: teacherForm.name,
      username: teacherForm.username.trim().toLowerCase(),
      pin: teacherForm.pin,
      role: 'teacher',
      assignedClass: teacherForm.assignedClass,
    })
    await addAuditLog({
      userId: user.id, username: user.username, action: 'CREATE_USER',
      targetType: 'user', details: `Created teacher account "${teacherForm.username}" for class ${teacherForm.assignedClass}`,
    })
    setTeacherMsg(`Teacher account created for ${teacherForm.name}.`)
    setTeacherForm({ name: '', username: '', pin: '', assignedClass: '' })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h3 className="font-bold text-cise-charcoal">Change PIN</h3>
        <form onSubmit={handleChangePin} className="space-y-3">
          <input type="password" placeholder="Current PIN" value={pinForm.current}
            onChange={e => setPinForm(p => ({ ...p, current: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input type="password" placeholder="New PIN" value={pinForm.next}
            onChange={e => setPinForm(p => ({ ...p, next: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input type="password" placeholder="Confirm new PIN" value={pinForm.confirm}
            onChange={e => setPinForm(p => ({ ...p, confirm: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          {pinMsg && <p className="text-sm text-cise-red">{pinMsg}</p>}
          <button className="bg-cise-red text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-cise-red-dark">
            Update PIN
          </button>
        </form>
      </div>

      {user.role === 'director' && (
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h3 className="font-bold text-cise-charcoal">Add teacher account</h3>
          <p className="text-xs text-gray-500">
            Teachers can only view and edit students in their assigned class.
          </p>
          <form onSubmit={handleAddTeacher} className="space-y-3">
            <input placeholder="Full name" value={teacherForm.name}
              onChange={e => setTeacherForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" required />
            <input placeholder="Username" value={teacherForm.username}
              onChange={e => setTeacherForm(f => ({ ...f, username: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" required />
            <input placeholder="Assigned class (e.g. Grade 4 - Blue)" value={teacherForm.assignedClass}
              onChange={e => setTeacherForm(f => ({ ...f, assignedClass: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" required />
            <input type="password" placeholder="Temporary PIN" value={teacherForm.pin}
              onChange={e => setTeacherForm(f => ({ ...f, pin: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" required />
            {teacherMsg && <p className="text-sm text-green-600">{teacherMsg}</p>}
            <button className="bg-cise-red text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-cise-red-dark">
              Create account
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
